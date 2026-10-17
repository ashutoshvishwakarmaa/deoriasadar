import { describe, expect, it } from "vitest";
import { chatRequestSchema } from "@/lib/chat/protocol";
import { runTool, tools } from "@/lib/chat/tools";
import { officials } from "@/lib/data";
import { rateLimit } from "@/lib/rate-limit";

describe("chat tools", () => {
  it("every declared tool has a runner", () => {
    for (const tool of tools) {
      const outcome = runTool(tool.name, {});
      // Empty input must be rejected by validation, not crash or hit "unknown tool".
      expect(outcome.isError).toBe(true);
      expect(outcome.content).not.toMatch(/Unknown tool/);
    }
  });

  it("search_guide returns place details with a page link", () => {
    const out = runTool("search_guide", { query: "dudheshwar" });
    expect(out.isError).toBe(false);
    const results = JSON.parse(out.content);
    expect(results[0]).toMatchObject({
      type: "place",
      slug: "dugdheshwar-nath-mandir",
      page: "/explore/dugdheshwar-nath-mandir",
    });
  });

  it("search_guide tells the model not to guess when nothing matches", () => {
    const out = JSON.parse(runTool("search_guide", { query: "zzqxv" }).content);
    expect(out.note).toMatch(/Do not guess/);
  });

  it("get_topic reports each official's verification status from the data", () => {
    const out = JSON.parse(runTool("get_topic", { topic: "officials" }).content);
    expect(out.officials).toHaveLength(officials.length);
    out.officials.forEach((o: { status: string }, i: number) => {
      // Unverified entries must carry the instruction that makes the model flag them as unconfirmed.
      expect(o.status).toMatch(officials[i].verified ? /^verified$/ : /re-check/);
    });
  });

  it("get_place rejects unknown slugs as a tool error", () => {
    const out = runTool("get_place", { slug: "nope" });
    expect(out.isError).toBe(true);
  });

  it("rejects unknown tools", () => {
    expect(runTool("delete_everything", {}).isError).toBe(true);
  });
});

describe("chat request validation", () => {
  const ok = { locale: "en", messages: [{ role: "user", content: "Hi" }] };

  it("accepts a well-formed conversation", () => {
    expect(chatRequestSchema.safeParse(ok).success).toBe(true);
  });

  it("rejects non-alternating roles and assistant-first histories", () => {
    expect(
      chatRequestSchema.safeParse({
        locale: "en",
        messages: [
          { role: "user", content: "a" },
          { role: "user", content: "b" },
        ],
      }).success,
    ).toBe(false);
    expect(
      chatRequestSchema.safeParse({
        locale: "en",
        messages: [
          { role: "assistant", content: "a" },
          { role: "user", content: "b" },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects oversized messages and histories", () => {
    expect(chatRequestSchema.safeParse({ locale: "en", messages: [{ role: "user", content: "x".repeat(2001) }] }).success).toBe(
      false,
    );
    const long = Array.from({ length: 21 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "x" }));
    expect(chatRequestSchema.safeParse({ locale: "en", messages: long }).success).toBe(false);
  });
});

describe("rateLimit", () => {
  it("allows up to the limit within a window, then resets", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 1000, t0).ok).toBe(true);
    const blocked = rateLimit("k", 3, 1000, t0 + 10);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
    expect(rateLimit("k", 3, 1000, t0 + 1001).ok).toBe(true);
  });
});
