/**
 * Report an error caught by an error boundary. Errors from the server carry a `digest` and were
 * already reported by onRequestError (src/instrumentation.ts), so only browser errors are sent.
 */
export function reportError(error: unknown) {
  console.error(error);
  const fromServer = typeof error === "object" && error !== null && "digest" in error;
  if (fromServer || !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error)).catch(() => {});
}
