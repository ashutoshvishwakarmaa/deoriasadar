import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Exercises POST /api/chat end to end against a scripted fake of the Anthropic
 * SDK: request validation, the streaming tool loop, and the NDJSON protocol.
 */

type Script = { events: unknown[]; final: Record<string, unknown> }[];
const calls: Record<string, unknown>[] = [];
let script: Script = [];

vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {
    status = 500;
  }
  class FakeAnthropic {
    static APIError = APIError;
    static RateLimitError = class extends APIError {};
    static InternalServerError = class extends APIError {};
    static AuthenticationError = class extends APIError {};
    static PermissionDeniedError = class extends APIError {};
    beta = {
      messages: {
        stream: (params: Record<string, unknown>) => {
          // Snapshot: the route keeps appending to the same messages array.
          calls.push(structuredClone(params));
          const turn = script.shift()!;
          return {
            async *[Symbol.asyncIterator]() {
              yield* turn.events;
            },
            finalMessage: async () => turn.final,
          };
        },
      },
    };
  }
  return { default: FakeAnthropic };
});

const textDelta = (text: string) => ({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text } });

async function post(body: unknown) {
  const { POST } = await import("@/app/api/chat/route");
  const res = await POST(
    new Request("http://test/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` },
      body: JSON.stringify(body),
    }),
  );
  const text = await res.text();
  return {
    status: res.status,
    events: text.trim()
      ? text
          .trim()
          .split("\n")
          .map((l) => JSON.parse(l))
      : [],
    raw: text,
  };
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    calls.length = 0;
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("runs a tool round-trip and streams the final answer", async () => {
    const firstTurn = [
      { type: "text", text: "Let me check. " },
      { type: "tool_use", id: "tu_1", name: "search_guide", input: { query: "dudheshwar" } },
    ];
    script = [
      { events: [textDelta("Let me check. ")], final: { stop_reason: "tool_use", content: firstTurn } },
      {
        events: [textDelta("Dugdheshwar Nath Mandir is in Rudrapur.")],
        final: { stop_reason: "end_turn", content: [{ type: "text", text: "Dugdheshwar Nath Mandir is in Rudrapur." }] },
      },
    ];

    const { status, events } = await post({ locale: "en", messages: [{ role: "user", content: "Where is Dudheshwar temple?" }] });

    expect(status).toBe(200);
    expect(events).toEqual([
      { type: "text", delta: "Let me check. " },
      { type: "status", tool: "search_guide" },
      { type: "break" },
      { type: "text", delta: "Dugdheshwar Nath Mandir is in Rudrapur." },
      { type: "done" },
    ]);

    // Request shape: model, effort, server-side fallback, stable cached system prompt, no thinking override.
    expect(calls[0]).toMatchObject({
      model: "claude-opus-5-5",
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    expect(calls[0]).not.toHaveProperty("thinking");
    const system = calls[0].system as { text: string; cache_control?: unknown }[];
    expect(system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(system[1].text).toMatch(/English \(en\)/);

    // Second call: history is append-only — the assistant turn verbatim, then one user message with the tool result.
    const second = calls[1].messages as { role: string; content: unknown }[];
    expect(second).toHaveLength(3);
    expect(second[1]).toEqual({ role: "assistant", content: firstTurn });
    const toolResult = (second[2].content as { type: string; tool_use_id: string; content: string; is_error: boolean }[])[0];
    expect(toolResult).toMatchObject({ type: "tool_result", tool_use_id: "tu_1", is_error: false });
    expect(JSON.parse(toolResult.content)[0].slug).toBe("dugdheshwar-nath-mandir");
  });

  it("records a question the guide could not answer as a content gap, anonymised", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    script = [
      {
        events: [],
        final: {
          stop_reason: "tool_use",
          content: [{ type: "tool_use", id: "tu_1", name: "search_guide", input: { query: "passport office" } }],
        },
      },
      { events: [textDelta("The guide does not have this yet.")], final: { stop_reason: "end_turn", content: [] } },
    ];

    const { events } = await post({
      locale: "en",
      messages: [{ role: "user", content: "Passport office? Call me on 9876543210" }],
    });

    expect(events.at(-1)).toEqual({ type: "done" });
    const gap = info.mock.calls.find(([tag]) => tag === "[gaps]");
    expect(gap).toBeDefined();
    expect(JSON.parse(gap![1] as string)).toEqual({
      locale: "en",
      question: "Passport office? Call me on [number]",
      searched: ["passport office"],
      day: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
    info.mockRestore();
  });

  it("reports a refusal without leaking partial tool calls", async () => {
    script = [{ events: [], final: { stop_reason: "refusal", content: [] } }];
    const { events } = await post({ locale: "hi", messages: [{ role: "user", content: "..." }] });
    expect(events).toEqual([{ type: "error", code: "refusal" }]);
    expect((calls[0].system as { text: string }[])[1].text).toMatch(/Hindi \(hi\)/);
  });

  it("never runs a tool call that was cut off at max_tokens", async () => {
    script = [
      {
        events: [],
        final: {
          stop_reason: "max_tokens",
          content: [{ type: "tool_use", id: "tu_x", name: "get_place", input: { slug: "kush" } }],
        },
      },
    ];
    const { events } = await post({ locale: "en", messages: [{ role: "user", content: "q" }] });
    expect(events).toEqual([{ type: "done" }]);
    expect(calls).toHaveLength(1);
  });

  it("rejects malformed conversations before calling the API", async () => {
    const { status } = await post({ locale: "en", messages: [{ role: "assistant", content: "hi" }] });
    expect(status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("uses CHAT_MODEL when it names a supported model, and ignores anything else", async () => {
    const answer = { events: [], final: { stop_reason: "end_turn", content: [{ type: "text", text: "ok" }] } };
    script = [answer, answer];
    vi.stubEnv("CHAT_MODEL", "claude-sonnet-5-5");
    await post({ locale: "en", messages: [{ role: "user", content: "q" }] });
    vi.stubEnv("CHAT_MODEL", "gpt-something");
    await post({ locale: "en", messages: [{ role: "user", content: "q" }] });
    vi.unstubAllEnvs();
    expect(calls.map((c) => c.model)).toEqual(["claude-sonnet-5-5", "claude-opus-5-5"]);
  });

  it("returns 503 without calling the API when the kill switch is on", async () => {
    vi.stubEnv("CHAT_DISABLED", "1");
    const { status } = await post({ locale: "en", messages: [{ role: "user", content: "hi" }] });
    vi.unstubAllEnvs();
    expect(status).toBe(503);
    expect(calls).toHaveLength(0);
  });

  it("stops answering for the day once the global daily limit is reached", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2031-05-01T10:00:00Z")); // a fresh day counter
    vi.stubEnv("CHAT_DAILY_LIMIT", "1");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    script = [{ events: [], final: { stop_reason: "end_turn", content: [{ type: "text", text: "ok" }] } }];
    const first = await post({ locale: "en", messages: [{ role: "user", content: "q" }] });
    const second = await post({ locale: "en", messages: [{ role: "user", content: "q" }] });
    vi.unstubAllEnvs();
    vi.useRealTimers();
    expect(first.status).toBe(200);
    expect(second.status).toBe(503);
    expect(calls).toHaveLength(1);
  });

  it("returns 503 when no API credentials are configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { status } = await post({ locale: "en", messages: [{ role: "user", content: "hi" }] });
    expect(status).toBe(503);
  });
});
