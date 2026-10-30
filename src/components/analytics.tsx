"use client";

import { track } from "@vercel/analytics";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { useEffect } from "react";

/**
 * Vercel Web Analytics: cookie-free page views, rendered only on Vercel deployments. Query strings
 * are dropped before sending, since a search URL holds whatever the visitor typed. One custom event,
 * "call", fires when someone taps a phone number, which shows whether the helplines get used.
 */
export function Analytics() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = e.target instanceof Element ? e.target.closest('a[href^="tel:"]') : null;
      if (link) track("call", { number: link.getAttribute("href")!.slice(4), page: location.pathname });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return <VercelAnalytics beforeSend={(event) => ({ ...event, url: event.url.split("?")[0] })} />;
}
