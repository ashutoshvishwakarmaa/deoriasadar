import "server-only";

/** Server-side configuration. Values are read lazily so `next build` works without secrets. */
export const env = {
  get anthropicConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  },
  /** Resend API key; when unset, corrections are logged to the server console instead of emailed. */
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
