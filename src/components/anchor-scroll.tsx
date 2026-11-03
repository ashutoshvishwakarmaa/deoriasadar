"use client";

import { useEffect } from "react";

/** How long to keep a #section link on target while the page above it settles. */
const SETTLE_MS = 4000;

/**
 * A #section link opened from outside: the browser's own jump can be undone by the router's startup
 * scroll handling, or pushed off as content above the section finishes its layout (web fonts,
 * images, sections rendered on demand). Keep the section at the top while the page settles, and
 * stop the moment the visitor scrolls, taps or types, so this never fights them.
 */
export function AnchorScroll() {
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (!target) return;

    const aim = () => target.scrollIntoView({ block: "start", behavior: "instant" });
    const resize = new ResizeObserver(aim);
    const userEvents = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    let timer = 0;
    const stop = () => {
      resize.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener("load", aim);
      for (const e of userEvents) window.removeEventListener(e, stop);
    };

    aim();
    resize.observe(document.body);
    window.addEventListener("load", aim, { once: true });
    for (const e of userEvents) window.addEventListener(e, stop, { passive: true, once: true });
    timer = window.setTimeout(stop, SETTLE_MS);
    return stop;
  }, []);
  return null;
}
