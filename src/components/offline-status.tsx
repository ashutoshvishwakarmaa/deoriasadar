"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Dictionary, Locale } from "@/lib/i18n";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * Shows a banner while the device is offline, and asks the service worker (public/sw.js) to save
 * each page reached by client-side navigation, which the worker cannot see on its own. Saving
 * waits for an idle moment and is skipped when the visitor has asked to save data.
 */
export function OfflineStatus({ locale, dict }: { locale: Locale; dict: Dictionary["offline"] }) {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  const pathname = usePathname();

  useEffect(() => {
    const worker = navigator.serviceWorker?.controller;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (!worker || !online || saveData) return;
    const save = () => worker.postMessage({ type: "save-page", path: pathname });
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(save, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(save, 2000);
    return () => clearTimeout(id);
  }, [pathname, online]);

  if (online) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-40 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-ink px-5 py-3 text-sm text-paper shadow-[0_12px_32px_-8px_rgba(26,24,19,.45)] sm:right-auto sm:bottom-6 sm:left-6 sm:max-w-[480px]"
    >
      <span className="size-2 shrink-0 rounded-full bg-accent" aria-hidden />
      <span>{dict.banner}</span>
      <Link href={`/${locale}/emergency`} className="font-medium text-paper underline underline-offset-2">
        {dict.emergency}
      </Link>
    </div>
  );
}

/** "Saved for offline use", shown once the service worker holds a copy of `path`. */
export function OfflineReady({ path, label }: { path: string; label: string }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!("caches" in window) || !navigator.serviceWorker) return;
    let live = true;
    // `ready` resolves after install, by which time the worker has saved the precached pages.
    navigator.serviceWorker.ready
      .then(() => caches.match(path))
      .then((hit) => live && setSaved(Boolean(hit)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [path]);

  if (!saved) return null;
  return (
    <span className="rounded-full border border-paper/25 px-3 py-[5px] text-[11px] font-medium text-paper/80">✓ {label}</span>
  );
}
