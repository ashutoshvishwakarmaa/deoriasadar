"use client";

import { useEffect } from "react";

/** Registers the service worker (public/sw.js) that makes the site work offline. Production only, so it never caches dev builds. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  }, []);
  return null;
}
