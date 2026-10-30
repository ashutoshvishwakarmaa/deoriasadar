import { beforeEach, describe, expect, it, vi } from "vitest";
import { anonymise, day } from "@/lib/feedback";
import { summarise } from "../scripts/feedback-report.mjs";

describe("anonymise", () => {
  it("removes phone numbers, ID numbers and email addresses", () => {
    expect(anonymise("call me on 98765 43210 or +91-98765-43210")).toBe("call me on [number] or [number]");
    expect(anonymise("my aadhaar is 1234 5678 9012")).toBe("my aadhaar is [number]");
    expect(anonymise("write to ram.kumar@example.co.in please")).toBe("write to [email] please");
  });

  it("keeps helplines, years and the question itself", () => {
    expect(anonymise("Is 112 or 108 better? Since 2024?")).toBe("Is 112 or 108 better? Since 2024?");
    expect(anonymise("देवरिया में अस्पताल कहाँ है?")).toBe("देवरिया में अस्पताल कहाँ है?");
  });

  it("caps the length and collapses whitespace", () => {
    expect(anonymise("a\n\n  b", 500)).toBe("a b");
    expect(anonymise("x".repeat(900))).toHaveLength(500);
  });

  it("stores only the day, not the time", () => {
    expect(day(new Date("2026-10-31T18:42:07Z"))).toBe("2026-10-31");
  });
});

async function postFeedback(body: unknown, ip = `10.9.${Math.floor(Math.random() * 250)}.1`) {
  const { POST } = await import("@/app/api/feedback/route");
  const res = await POST(
    new Request("http://test/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );
  return res.status;
}

describe("POST /api/feedback", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("stores an anonymised rating in Redis, without the visitor's IP", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith("/multi-exec")
        ? Response.json([{ result: null }, { result: 1 }, { result: 3_600_000 }])
        : Response.json([{ result: 1 }, { result: "OK" }]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const status = await postFeedback(
      {
        rating: "down",
        locale: "hi",
        question: "DM office number? mera number 9876543210",
        answer: "The guide does not list it.",
      },
      "203.0.113.50",
    );

    expect(status).toBe(200);
    const call = fetchMock.mock.calls.find(([url]) => url === "https://redis.example/pipeline") as unknown as [
      string,
      RequestInit,
    ];
    const [[cmd, list, json], trim] = JSON.parse(call[1].body as string);
    expect([cmd, list]).toEqual(["LPUSH", "feedback"]);
    expect(trim).toEqual(["LTRIM", "feedback", 0, 4999]);
    const entry = JSON.parse(json);
    expect(entry).toEqual({
      rating: "down",
      locale: "hi",
      question: "DM office number? mera number [number]",
      answer: "The guide does not list it.",
      day: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
    expect(json).not.toContain("203.0.113.50");
  });

  it("rejects anything that is not a rating", async () => {
    expect(await postFeedback({ rating: "meh", locale: "en", question: "q", answer: "a" })).toBe(400);
    expect(await postFeedback({ rating: "up", locale: "en", question: "", answer: "a" })).toBe(400);
  });

  it("limits each visitor to 30 ratings an hour", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const body = { rating: "up", locale: "en", question: "q", answer: "a" };
    const statuses = [];
    for (let i = 0; i < 31; i++) statuses.push(await postFeedback(body, "10.200.0.1"));
    expect(statuses.slice(0, 30).every((s) => s === 200)).toBe(true);
    expect(statuses[30]).toBe(429);
  });
});

describe("feedback report", () => {
  it("ranks unanswered searches and lists recent thumbs-down", () => {
    const gaps = [
      { question: "Where is the passport office?", searched: ["passport office", "Passport  Office"] },
      { question: "passport seva kendra?", searched: ["passport office"] },
      { question: "gym near station", searched: ["gym"] },
    ];
    const feedback = [
      { rating: "down", locale: "en", question: "q1", answer: "a1", day: "2026-10-30" },
      { rating: "up", locale: "hi", question: "q2", answer: "a2", day: "2026-10-30" },
    ];
    const s = summarise(gaps, feedback);
    expect(s.topGaps).toEqual([
      ["passport office", 2],
      ["gym", 1],
    ]);
    expect(s.ratings).toEqual({ up: 1, down: 1 });
    expect(s.recentDown.map((f: { question: string }) => f.question)).toEqual(["q1"]);
  });
});
