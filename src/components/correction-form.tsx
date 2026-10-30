"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary, Locale } from "@/lib/i18n";

type State = "idle" | "sending" | "sent" | "error";

/** Cloudflare Turnstile is used only when a site key is configured. */
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

interface Turnstile {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
    if (!script) {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.dataset.turnstile = "";
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => (window.turnstile ? resolve(window.turnstile) : reject()), { once: true });
    script.addEventListener("error", () => reject(), { once: true });
  });
}

export function CorrectionForm({ locale, dict }: { locale: Locale; dict: Dictionary["about"]["form"] }) {
  const [state, setState] = useState<State>("idle");
  const challengeRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!turnstileSiteKey) return;
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !challengeRef.current) return;
        // The widget adds a hidden "turnstileToken" input to the form, which onSubmit sends along.
        widgetId.current = turnstile.render(challengeRef.current, {
          sitekey: turnstileSiteKey,
          "response-field-name": "turnstileToken",
          size: "flexible",
        });
      })
      .catch(() => console.error("[corrections] could not load Turnstile"));
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = undefined;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setState("sending");
    try {
      const res = await fetch("/api/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, locale }),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      setState("sent");
    } catch {
      setState("error");
    } finally {
      // Tokens are single-use; get a fresh one for the next submission.
      if (widgetId.current) window.turnstile?.reset(widgetId.current);
    }
  }

  const field = "w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-[15px] outline-none focus:border-ink/40";

  return (
    <form onSubmit={onSubmit} className="mt-6 grid max-w-[640px] gap-4">
      <label className="grid gap-1.5 text-sm font-medium">
        {dict.page}
        <input name="page" required minLength={2} maxLength={200} className={field} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        {dict.message}
        <textarea name="message" required minLength={10} maxLength={3000} rows={5} className={`${field} resize-y`} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        {dict.contact}
        <input name="contact" maxLength={200} autoComplete="email" className={field} />
      </label>
      {/* Honeypot for bots; hidden from people and assistive tech. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {turnstileSiteKey && <div ref={challengeRef} className="min-h-[65px]" />}
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={state === "sending"}
          className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-accent disabled:opacity-50"
        >
          {state === "sending" ? dict.sending : dict.submit}
        </button>
        <p aria-live="polite" className={`text-sm ${state === "error" ? "text-warn-fg" : "text-ok-fg"}`}>
          {state === "sent" ? dict.success : state === "error" ? dict.error : ""}
        </p>
      </div>
    </form>
  );
}
