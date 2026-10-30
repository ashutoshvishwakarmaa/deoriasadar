import "server-only";
import { redis } from "./redis";

/**
 * Assistant feedback, kept anonymous: no IP address, no conversation id, no exact time, and
 * phone numbers and email addresses are removed from the text before it is stored.
 *
 * Two Redis lists, newest first, each capped at MAX_ENTRIES:
 * - `feedback`: 👍 / 👎 ratings with the question and answer they refer to.
 * - `gaps`: questions the guide's search could not answer, i.e. content that is missing.
 * `npm run feedback` prints a summary. Without Redis, entries go to the server log.
 */

export const MAX_ENTRIES = 5000;

export type FeedbackList = "feedback" | "gaps";

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;
// Seven or more digits, allowing spaces, dots and dashes between them (phone, Aadhaar, account numbers).
const LONG_NUMBER = /\+?\d(?:[\s.-]?\d){6,}/g;

/** Remove personal details a visitor may have typed, and cap the length. */
export function anonymise(text: string, max = 500): string {
  return text.replace(EMAIL, "[email]").replace(LONG_NUMBER, "[number]").replace(/\s+/g, " ").trim().slice(0, max);
}

/** Today's date only (UTC), so entries cannot be matched to server logs by time. */
export function day(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export async function record(list: FeedbackList, entry: Record<string, unknown>): Promise<boolean> {
  const json = JSON.stringify(entry);
  const stored = await redis([
    ["LPUSH", list, json],
    ["LTRIM", list, 0, MAX_ENTRIES - 1],
  ]);
  if (!stored) console.info(`[${list}]`, json);
  return Boolean(stored);
}
