import { z } from "zod";

/** Request body for POST /api/chat. History is text-only; the server owns tool calls. */
export const chatRequestSchema = z.object({
  locale: z.enum(["en", "hi"]),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    .max(20)
    .refine((m) => m[0].role === "user" && m[m.length - 1].role === "user", {
      message: "conversation must start and end with a user message",
    })
    .refine((m) => m.every((msg, i) => i === 0 || msg.role !== m[i - 1].role), {
      message: "roles must alternate",
    }),
});

/** One line of the NDJSON response stream. */
export type ChatEvent =
  | { type: "text"; delta: string }
  | { type: "status"; tool: string }
  | { type: "break" }
  | { type: "done" }
  | { type: "error"; code: "refusal" | "overloaded" | "unavailable" | "internal" };
