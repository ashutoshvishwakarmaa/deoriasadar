import type { Instrumentation } from "next";
import { sentryOptions } from "./lib/sentry-options";

/**
 * Server error monitoring with Sentry, active only when SENTRY_DSN is set. Without it, nothing
 * is loaded. No personal data is sent and there is no performance tracing (src/lib/sentry-options.ts).
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    ...sentryOptions,
  });
}

/** Errors thrown while rendering pages or running route handlers. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (!process.env.SENTRY_DSN) return;
  const { captureRequestError } = await import("@sentry/nextjs");
  captureRequestError(error, request, context);
};
