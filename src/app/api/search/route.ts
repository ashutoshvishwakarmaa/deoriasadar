import type { NextRequest } from "next/server";
import { hasLocale } from "@/lib/i18n";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { search } from "@/lib/search";

export async function GET(request: NextRequest) {
  const rl = rateLimit(`search:${clientKey(request)}`, 60, 60_000);
  if (!rl.ok) {
    return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } });
  }

  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 200);
  const lang = request.nextUrl.searchParams.get("lang") ?? "en";
  const locale = hasLocale(lang) ? lang : "en";

  return Response.json(
    { query: q, results: search(q, locale) },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } },
  );
}
