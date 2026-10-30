import Anthropic from "@anthropic-ai/sdk";
import { localeNote, SYSTEM_PROMPT } from "@/lib/chat/prompt";
import { chatRequestSchema, type ChatEvent } from "@/lib/chat/protocol";
import { runTool, tools } from "@/lib/chat/tools";
import { env } from "@/lib/env";
import { anonymise, day, record } from "@/lib/feedback";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { redis } from "@/lib/redis";

const MAX_TOOL_ROUNDS = 6;
const DAY_MS = 24 * 60 * 60_000;

/** Instant kill switch for deployments with Redis: `SET chat:disabled 1` (delete the key to turn the assistant back on). */
async function disabledInRedis() {
  const replies = await redis([["GET", "chat:disabled"]]);
  return Boolean(replies?.[0]) && replies?.[0] !== "0";
}

let client: Anthropic | undefined;
function getClient() {
  client ??= new Anthropic();
  return client;
}

function json(status: number, body: unknown, headers?: HeadersInit) {
  return Response.json(body, { status, headers });
}

export async function POST(request: Request) {
  if (!env.anthropicConfigured || env.chatDisabled || (await disabledInRedis())) {
    return json(503, { error: "unavailable" });
  }

  // Two windows: a short burst limit and a longer budget per visitor.
  const key = clientKey(request);
  const limits = await Promise.all(
    [
      [6, 60_000],
      [40, 60 * 60_000],
    ].map(([limit, windowMs]) => checkRateLimit(`chat:${windowMs}:${key}`, limit, windowMs)),
  );
  const blocked = limits.find((rl) => !rl.ok);
  if (blocked) {
    return json(429, { error: "rate_limited" }, { "Retry-After": String(blocked.retryAfterSeconds) });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(400, { error: "invalid_request" });
  }
  const { locale, messages: history } = parsed.data;

  // Global daily budget across all visitors: bounds the worst-case API bill for one day.
  const today = new Date().toISOString().slice(0, 10);
  const budget = await checkRateLimit(`chat:day:${today}`, env.chatDailyLimit, DAY_MS);
  if (!budget.ok) {
    console.warn(`[chat] daily limit of ${env.chatDailyLimit} requests reached`);
    return json(503, { error: "unavailable" });
  }

  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    { type: "text", text: localeNote(locale) },
  ];
  // Earlier turns arrive as plain text, so no thinking blocks are ever replayed
  // across turns. Within this turn the history is append-only.
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      // Searches that found nothing in the guide: recorded once the answer is done, as content gaps.
      const unmatched: string[] = [];

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const turn = getClient().beta.messages.stream(
            {
              model: env.chatModel,
              max_tokens: 16000,
              system,
              tools,
              messages,
              output_config: { effort: "low" },
              // Re-run a classifier-declined turn on Anthropic's recommended fallback model.
              betas: ["server-side-fallback-2026-07-01"],
              fallbacks: "default",
            },
            { signal: request.signal },
          );

          for await (const event of turn) {
            if (event.type === "content_block_start" && event.content_block.type === "fallback") {
              send({ type: "break" });
            } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              send({ type: "text", delta: event.delta.text });
            }
          }
          const message = await turn.finalMessage();

          if (message.stop_reason === "refusal") {
            send({ type: "error", code: "refusal" });
            return;
          }
          if (message.stop_reason === "pause_turn") {
            messages.push({ role: "assistant", content: message.content });
            continue;
          }

          const toolUses = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
          // A tool input cut off at max_tokens may still parse; never run it.
          if (toolUses.length === 0 || message.stop_reason !== "tool_use") break;

          messages.push({ role: "assistant", content: message.content });
          const results: Anthropic.Beta.BetaToolResultBlockParam[] = toolUses.map((use) => {
            send({ type: "status", tool: use.name });
            const outcome = runTool(use.name, use.input);
            if (outcome.noMatch) unmatched.push(outcome.noMatch);
            return { type: "tool_result", tool_use_id: use.id, content: outcome.content, is_error: outcome.isError };
          });
          // All results for one assistant turn go back in a single user message.
          messages.push({ role: "user", content: results });
          send({ type: "break" });
        }
        send({ type: "done" });
        if (unmatched.length) {
          await record("gaps", {
            locale,
            question: anonymise(history[history.length - 1].content),
            searched: unmatched.map((q) => anonymise(q, 200)),
            day: day(),
          });
        }
      } catch (error) {
        if (request.signal.aborted) return;
        if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError) {
          send({ type: "error", code: "overloaded" });
        } else if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
          console.error("[chat] Anthropic credentials rejected:", error.message);
          send({ type: "error", code: "unavailable" });
        } else if (error instanceof Anthropic.APIError) {
          console.error(`[chat] Anthropic API error ${error.status}:`, error.message);
          send({ type: "error", code: "internal" });
        } else {
          console.error("[chat] unexpected error:", error);
          send({ type: "error", code: "internal" });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Stream already closed by a client disconnect.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
