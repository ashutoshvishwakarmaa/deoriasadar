import { sentryOptions } from "./lib/sentry-options";

/**
 * Browser error monitoring with Sentry, active only when NEXT_PUBLIC_SENTRY_DSN is set. The SDK
 * is loaded with a dynamic import, so without a DSN visitors download nothing extra.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  import("@sentry/nextjs")
    .then((Sentry) =>
      Sentry.init({
        dsn,
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
        ...sentryOptions,
      }),
    )
    .catch(() => {});
}
