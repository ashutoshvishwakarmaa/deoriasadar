import "server-only";

/** Models the assistant can run on. Both accept `effort` and the server-side refusal fallback the chat route sends. */
const chatModels = ["claude-opus-5-5", "claude-sonnet-5-5"] as const;
export type ChatModel = (typeof chatModels)[number];

function positiveInt(value: string | undefined, fallback: number) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/** Server-side configuration. Values are read lazily so `next build` works without secrets. */
export const env = {
  get anthropicConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  },
  /** Kill switch: CHAT_DISABLED=1 turns the assistant off (on Vercel, from the next deploy; the Redis key `chat:disabled` acts instantly). */
  get chatDisabled() {
    return ["1", "true", "yes"].includes((process.env.CHAT_DISABLED ?? "").toLowerCase());
  },
  get chatModel(): ChatModel {
    const model = process.env.CHAT_MODEL;
    return chatModels.includes(model as ChatModel) ? (model as ChatModel) : "claude-opus-5-5";
  },
  /** Assistant requests allowed per UTC day across all visitors; caps worst-case daily spend. */
  get chatDailyLimit() {
    return positiveInt(process.env.CHAT_DAILY_LIMIT, 1000);
  },
  /** Upstash Redis REST credentials (the Vercel Marketplace integration sets the KV_* names). */
  get redis() {
    const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
    return url && token ? { url, token } : undefined;
  },
  /** Cloudflare Turnstile secret; when unset, the corrections form is protected only by the honeypot and rate limit. */
  get turnstileSecret() {
    return process.env.TURNSTILE_SECRET_KEY;
  },
  /** Resend API key; when unset, corrections are stored in Redis or logged to the server console instead of emailed. */
  get resendApiKey() {
    return process.env.RESEND_API_KEY;
  },
  get correctionsTo() {
    return process.env.CORRECTIONS_EMAIL_TO;
  },
  get correctionsFrom() {
    return process.env.CORRECTIONS_EMAIL_FROM ?? "Deoria Guide <corrections@resend.dev>";
  },
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  },
};
