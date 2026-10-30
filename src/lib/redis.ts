import "server-only";
import { env } from "./env";

type Command = (string | number)[];

/**
 * Run commands against Upstash Redis over its REST API, in one round trip.
 * `atomic` sends them as a MULTI/EXEC transaction. Returns null when Redis is
 * not configured or the call fails, so callers can fall back to memory.
 */
export async function redis(commands: Command[], { atomic = false } = {}): Promise<unknown[] | null> {
  const config = env.redis;
  if (!config) return null;
  try {
    const res = await fetch(`${config.url}/${atomic ? "multi-exec" : "pipeline"}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const replies = (await res.json()) as { result?: unknown; error?: string }[];
    const failed = replies.find((r) => r.error);
    if (failed) throw new Error(failed.error);
    return replies.map((r) => r.result);
  } catch (error) {
    console.error("[redis] request failed:", error);
    return null;
  }
}
