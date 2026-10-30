import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const turnstile = "https://challenges.cloudflare.com";
// Sentry's ingest host, from the DSN, when browser error reporting is configured.
const sentry = (() => {
  try {
    return " " + new URL(process.env.NEXT_PUBLIC_SENTRY_DSN ?? "").origin;
  } catch {
    return "";
  }
})();

/**
 * Static CSP. Pages are prerendered, and nonces would force every page to render
 * per request (see the Next.js CSP guide), so Next's inline bootstrap scripts
 * are allowed with 'unsafe-inline'. The policy still blocks scripts and frames
 * from any other origin, plugins, <base> hijacking, foreign form targets and framing.
 * - img-src: OpenStreetMap tiles for the Leaflet map.
 * - style-src 'unsafe-inline': Leaflet positions tiles and popups with inline styles.
 * - Turnstile (corrections form) loads a script and an iframe from Cloudflare.
 * - 'unsafe-eval' in development only: React uses eval for debugging stacks.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${turnstile}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
  "font-src 'self'",
  // The service worker fetches and caches the map tiles itself.
  `connect-src 'self' https://*.tile.openstreetmap.org${sentry}`,
  `frame-src ${turnstile}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Share cards (src/lib/og.ts) read photos and fonts from disk at runtime; ship them with those functions.
  outputFileTracingIncludes: {
    "/**/opengraph-image/*": ["./public/images/photos/**/*", "./assets/fonts/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // The service worker must always be revalidated so updates roll out.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
