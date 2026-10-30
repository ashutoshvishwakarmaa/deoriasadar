import { beforeEach, describe, expect, it, vi } from "vitest";

const valid = { page: "Hanuman Mandir", message: "The phone number has changed.", contact: "", locale: "en" };

async function post(body: unknown) {
  const { POST } = await import("@/app/api/corrections/route");
  const res = await POST(
    new Request("http://test/api/corrections", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": `10.1.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
      },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, body: await res.json() };
}

describe("POST /api/corrections", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    for (const name of ["UPSTASH_REDIS_REST_URL", "KV_REST_API_URL", "RESEND_API_KEY", "TURNSTILE_SECRET_KEY"])
      vi.stubEnv(name, "");
  });

  it("rejects a submission without a Turnstile token when Turnstile is on", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { status, body } = await post(valid);
    expect(status).toBe(400);
    expect(body.error).toBe("captcha_failed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("verifies the Turnstile token, then stores the correction in Redis", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    const fetchMock = vi.fn(async (url: string) =>
      url.includes("siteverify")
        ? Response.json({ success: true })
        : url.endsWith("/multi-exec")
          ? Response.json([{ result: null }, { result: 1 }, { result: 3_600_000 }])
          : Response.json([{ result: 1 }]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { status } = await post({ ...valid, turnstileToken: "token" });

    expect(status).toBe(200);
    const urls = fetchMock.mock.calls.map(([url]) => url);
    expect(urls).toContain("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const lpush = fetchMock.mock.calls.find(([url]) => url === "https://redis.example/pipeline") as unknown as [
      string,
      RequestInit,
    ];
    const [[command, key, payload]] = JSON.parse(lpush[1].body as string);
    expect([command, key]).toEqual(["LPUSH", "corrections"]);
    expect(JSON.parse(payload)).toMatchObject({ page: "Hanuman Mandir", message: "The phone number has changed.", locale: "en" });
    expect(JSON.parse(payload)).not.toHaveProperty("turnstileToken");
  });

  it("rejects a failed Turnstile check", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ success: false })),
    );
    const { status } = await post({ ...valid, turnstileToken: "forged" });
    expect(status).toBe(400);
  });

  it("returns 502 when it can neither store nor email the correction", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("down", { status: 500 })),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { status } = await post(valid);
    expect(status).toBe(502);
  });
});
