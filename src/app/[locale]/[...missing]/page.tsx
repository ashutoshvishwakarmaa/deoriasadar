import { notFound } from "next/navigation";

/**
 * Any path under /en or /hi that no other route matches. Calling notFound() here renders
 * [locale]/not-found.tsx inside the site layout, with a 404 status. Without this route, unknown
 * URLs (including the proxy's rewrite for removed places) got Next.js's bare default 404 page,
 * because the root layout lives under the dynamic [locale] segment.
 */
export default function Missing() {
  notFound();
}

// Unknown paths cannot be listed ahead of time; blocking to resolve them before streaming is intended.
export const instant = false;
