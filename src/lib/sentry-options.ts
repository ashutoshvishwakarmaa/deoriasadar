import type { init } from "@sentry/nextjs";

/**
 * Shared Sentry settings for the browser and the server: errors only, nothing about the visitor.
 * Sentry's defaults would collect headers, cookies, query strings and request bodies (chat
 * messages, correction-form contact details) and the assistant's prompts and replies; all off.
 */
export const sentryOptions = {
  tracesSampleRate: 0,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    genAI: { inputs: false, outputs: false },
    stackFrameVariables: false,
  },
} satisfies Parameters<typeof init>[0];
