import { z } from "zod";
import { env } from "@/lib/env";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const correctionSchema = z.object({
  page: z.string().trim().min(2).max(200),
  message: z.string().trim().min(10).max(3000),
  contact: z.string().trim().max(200).optional().default(""),
  locale: z.enum(["en", "hi"]).default("en"),
  /** Honeypot: hidden from people, filled in by naive bots. */
  website: z.string().max(0).optional().default(""),
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function POST(request: Request) {
  const rl = rateLimit(`corrections:${clientKey(request)}`, 5, 60 * 60_000);
  if (!rl.ok) {
    return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = correctionSchema.safeParse(body);
  if (!parsed.success) {
    // A filled honeypot looks like success to the bot but is dropped.
    if (typeof body === "object" && body && "website" in body && (body as { website: unknown }).website) {
      return Response.json({ ok: true });
    }
    return Response.json({ error: "invalid_request", issues: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }

  const { page, message, contact, locale } = parsed.data;
  const receivedAt = new Date().toISOString();

  if (!env.resendApiKey || !env.correctionsTo) {
    // No mail provider configured (local dev): keep the submission in the server log.
    console.info("[corrections]", JSON.stringify({ receivedAt, locale, page, message, contact }));
    return Response.json({ ok: true });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.correctionsFrom,
      to: env.correctionsTo.split(",").map((s) => s.trim()),
      subject: `Correction: ${page.slice(0, 80)}`,
      html: `<p><strong>Page/entry:</strong> ${escapeHtml(page)}</p>
<p><strong>Correction:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
<p><strong>Contact:</strong> ${escapeHtml(contact || "not given")}</p>
<p><small>Language: ${locale} · received ${receivedAt}</small></p>`,
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch((error: unknown) => {
    console.error("[corrections] email request failed:", error);
    return null;
  });

  if (!res?.ok) {
    if (res) console.error("[corrections] email provider returned", res.status, await res.text().catch(() => ""));
    return Response.json({ error: "delivery_failed" }, { status: 502 });
  }
  return Response.json({ ok: true });
}
