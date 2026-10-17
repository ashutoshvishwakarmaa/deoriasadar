"use client";

import { useState } from "react";
import type { Dictionary, Locale } from "@/lib/i18n";

type State = "idle" | "sending" | "sent" | "error";

export function CorrectionForm({ locale, dict }: { locale: Locale; dict: Dictionary["about"]["form"] }) {
  const [state, setState] = useState<State>("idle");

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
