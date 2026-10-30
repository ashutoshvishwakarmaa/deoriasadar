import { redis } from "./redis";

/**
 * Fixed-window rate limiting.
 *
 * With Upstash Redis configured, counters are shared by every server instance,
 * so limits hold on serverless platforms (Vercel). Without it, or if Redis is
 * unreachable, each process keeps its own counters in memory: exact on a single
 * server, per instance on serverless.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** In-memory limiter for this process only. */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  if (now - lastSweep > 60_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    lastSweep = now;
  }

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count++;

  const ok = bucket.count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: ok ? 0 : Math.ceil((bucket.resetAt - now) / 1000),
  };
}

/** Shared limiter: Redis when configured, otherwise the in-memory one. */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const k = `rl:${key}`;
  // SET NX starts the window with its expiry; INCR keeps that expiry.
  const replies = await redis(
    [
      ["SET", k, 0, "PX", windowMs, "NX"],
      ["INCR", k],
      ["PTTL", k],
    ],
    { atomic: true },
  );
  if (!replies) return rateLimit(key, limit, windowMs);

  const count = Number(replies[1]);
  let ttl = Number(replies[2]);
  if (ttl < 0) {
    // The key lost its expiry (should not happen); never let a counter live forever.
    await redis([["PEXPIRE", k, windowMs]]);
    ttl = windowMs;
  }
  const ok = count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: ok ? 0 : Math.max(1, Math.ceil(ttl / 1000)),
  };
}

/**
 * The visitor's IP address, for rate-limit keys.
 *
 * On Vercel the platform overwrites X-Forwarded-For and sets X-Vercel-Forwarded-For
 * from the connection itself, so neither can be forged. Elsewhere, behind one
 * reverse proxy, the last X-Forwarded-For entry is the one the proxy appended;
 * earlier entries are whatever the client sent and are ignored.
 */
export function clientKey(request: Request): string {
  const h = request.headers;
  if (process.env.VERCEL) {
    const ip = h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
    if (ip) return ip;
  }
  const forwarded = h.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return forwarded || h.get("x-real-ip")?.trim() || "unknown";
}
