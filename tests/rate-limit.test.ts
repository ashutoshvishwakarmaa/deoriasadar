import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";

const req = (headers: Record<string, string>) => new Request("http://test/", { headers });

describe("clientKey", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("ignores client-supplied X-Forwarded-For entries and uses the one the proxy appended", () => {
    expect(clientKey(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("uses Vercel's connection IP on Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    expect(clientKey(req({ "x-vercel-forwarded-for": "198.51.100.2", "x-forwarded-for": "6.6.6.6" }))).toBe("198.51.100.2");
  });

  it("does not trust X-Vercel-Forwarded-For off Vercel", () => {
    vi.stubEnv("VERCEL", "");
    expect(clientKey(req({ "x-vercel-forwarded-for": "6.6.6.6", "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
  });
});

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("falls back to memory when Redis is not configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("KV_REST_API_URL", "");
    const key = `mem-${Math.random()}`;
    expect((await checkRateLimit(key, 1, 60_000)).ok).toBe(true);
    expect((await checkRateLimit(key, 1, 60_000)).ok).toBe(false);
  });

  it("counts in Redis with one atomic transaction", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    const fetchMock = vi.fn(async () => Response.json([{ result: null }, { result: 4 }, { result: 30_500 }]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkRateLimit("chat:x", 3, 60_000);

    expect(result).toEqual({ ok: false, remaining: 0, retryAfterSeconds: 31 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://redis.example/multi-exec");
    expect(JSON.parse(init.body as string)).toEqual([
      ["SET", "rl:chat:x", 0, "PX", 60_000, "NX"],
      ["INCR", "rl:chat:x"],
      ["PTTL", "rl:chat:x"],
    ]);
  });

  it("falls back to memory when Redis fails", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("down", { status: 500 })),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await checkRateLimit(`down-${Math.random()}`, 1, 60_000)).ok).toBe(true);
  });
});
