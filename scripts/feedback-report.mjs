/**
 * Summarise assistant feedback stored in Upstash Redis (see src/lib/feedback.ts):
 * the most common unanswered searches (content to add) and recent 👎 answers.
 *
 *   npm run feedback            # reads UPSTASH_REDIS_REST_* or KV_REST_API_* from .env.local / the environment
 */
import { pathToFileURL } from "node:url";

/** Count unanswered searches (case- and space-insensitive) and pick out recent thumbs-down. */
export function summarise(gaps, feedback, { top = 20, recent = 10 } = {}) {
  const counts = new Map();
  for (const g of gaps) {
    for (const q of new Set((g.searched ?? []).map((s) => s.toLowerCase().replace(/\s+/g, " ").trim()))) {
      if (q) counts.set(q, (counts.get(q) ?? 0) + 1);
    }
  }
  const up = feedback.filter((f) => f.rating === "up").length;
  return {
    topGaps: [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, top),
    recentGapQuestions: gaps.slice(0, recent).map((g) => g.question),
    ratings: { up, down: feedback.length - up },
    recentDown: feedback.filter((f) => f.rating === "down").slice(0, recent),
  };
}

async function readList(url, token, name) {
  const res = await fetch(`${url}/lrange/${name}/0/-1`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Redis returned ${res.status} for ${name}`);
  const { result } = await res.json();
  return result.map((s) => JSON.parse(s));
}

async function main() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    console.error("Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_*), e.g. in .env.local.");
    process.exit(1);
  }
  const [gaps, feedback] = await Promise.all([readList(url, token, "gaps"), readList(url, token, "feedback")]);
  const s = summarise(gaps, feedback);

  console.log(`\nUnanswered searches (${gaps.length} questions) — consider adding this content:`);
  for (const [q, n] of s.topGaps) console.log(`  ${String(n).padStart(4)}  ${q}`);
  console.log("\nLatest unanswered questions:");
  for (const q of s.recentGapQuestions) console.log(`  - ${q}`);
  console.log(`\nRatings: 👍 ${s.ratings.up}  👎 ${s.ratings.down}`);
  console.log("Latest 👎:");
  for (const f of s.recentDown) console.log(`  - [${f.day}, ${f.locale}] ${f.question}\n      → ${f.answer.slice(0, 160)}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
