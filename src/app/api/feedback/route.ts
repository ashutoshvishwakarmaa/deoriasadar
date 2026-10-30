import { z } from "zod";
import { anonymise, day, record } from "@/lib/feedback";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";

const feedbackSchema = z.object({
  rating: z.enum(["up", "down"]),
  locale: z.enum(["en", "hi"]),
  question: z.string().trim().min(1).max(2000),
  answer: z.string().trim().min(1).max(8000),
});

/** A 👍 / 👎 on one assistant answer. Stored without anything that identifies the visitor. */
export async function POST(request: Request) {
  const rl = await checkRateLimit(`feedback:${clientKey(request)}`, 30, 60 * 60_000);
  if (!rl.ok) {
    return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });

  const { rating, locale, question, answer } = parsed.data;
  await record("feedback", {
    rating,
    locale,
    question: anonymise(question),
    answer: anonymise(answer, 1500),
    day: day(),
  });
  return Response.json({ ok: true });
}
