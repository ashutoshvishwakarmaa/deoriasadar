import { z } from "zod";
import { env } from "@/lib/env";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { redis } from "@/lib/redis";

const correctionSchema = z.object({
  page: z.string().trim().min(2).max(200),
  message: z.string().trim().min(10).max(3000),
  contact: z.string().trim().max(200).optional().default(""),
  locale: z.enum(["en", "hi"]).default("en"),
  /** Cloudflare Turnstile token; required only when TURNSTILE_SECRET_KEY is set. */
  turnstileToken: z.string().max(4096).optional().default(""),
  /** Honeypot: hidden from people, filled in by naive bots. */
  website: z.string().max(0).optional().default(""),
});

type Correction = Omit<z.infer<typeof correctionSchema>, "turnstileToken" | "website"> & { receivedAt: string };

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

async function verifyTurnstile(secret: string, token: string, ip: string): Promise<boolean> {
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip !== "unknown") body.set("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
    signal: AbortSignal.timeout(10_000),
  }).catch((error: unknown) => {
    console.error("[corrections] Turnstile verification failed:", error);
    return null;
  });
  if (!res?.ok) return false;
  const data = (await res.json().catch(() => null)) as { success?: boolean } | null;
  return data?.success === true;
}

/** Keep the submission in Redis (list `corrections`, newest first) so it survives even if email fails. */
async function store(correction: Correction): Promise<boolean> {
  return (await redis([["LPUSH", "corrections", JSON.stringify(correction)]])) !== null;
}

async function email({ page, message, contact, locale, receivedAt }: Correction): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.correctionsFrom,
      to: env.correctionsTo!.split(",").map((s) => s.trim()),
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
  if (res && !res.ok) console.error("[corrections] email provider returned", res.status, await res.text().catch(() => ""));
  return Boolean(res?.ok);
}

export async function POST(request: Request) {
  const ip = clientKey(request);
  const rl = await checkRateLimit(`corrections:${ip}`, 5, 60 * 60_000);
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

  const { page, message, contact, locale, turnstileToken } = parsed.data;
  const secret = env.turnstileSecret;
  if (secret && !(await verifyTurnstile(secret, turnstileToken, ip))) {
    return Response.json({ error: "captcha_failed" }, { status: 400 });
  }

  const correction: Correction = { page, message, contact, locale, receivedAt: new Date().toISOString() };
  const canStore = Boolean(env.redis);
  const canEmail = Boolean(env.resendApiKey && env.correctionsTo);

  if (!canStore && !canEmail) {
    // Nothing configured (local dev): keep the submission in the server log.
    console.info("[corrections]", JSON.stringify(correction));
    return Response.json({ ok: true });
  }

  const [stored, emailed] = await Promise.all([canStore && store(correction), canEmail && email(correction)]);
  if (!stored && !emailed) {
    // Last resort, so the text is not lost entirely.
    console.error("[corrections] could not store or email:", JSON.stringify(correction));
    return Response.json({ error: "delivery_failed" }, { status: 502 });
  }
  return Response.json({ ok: true });
}
