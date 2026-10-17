"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";

export function SearchBox({
  locale,
  placeholder,
  button,
  initial = "",
}: {
  locale: Locale;
  placeholder: string;
  button: string;
  initial?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  return (
    <form
      role="search"
      action={`/${locale}/search`}
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        if (query) router.push(`/${locale}/search?q=${encodeURIComponent(query)}`);
      }}
      className="flex items-center gap-3.5 rounded-full border border-ink/15 bg-white py-1.5 pr-1.5 pl-6 shadow-[0_8px_24px_-12px_rgba(26,24,19,.18)] focus-within:border-ink/40"
    >
      <span className="size-[11px] flex-none rounded-full border-[1.5px] border-muted-2" aria-hidden />
      <input
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={200}
        className="min-w-0 flex-1 bg-transparent py-3 text-[15px] outline-none placeholder:text-muted-2"
      />
      <button
        type="submit"
        className="rounded-full bg-ink px-6 py-[13px] text-sm font-medium tracking-[.01em] text-paper transition-colors hover:bg-accent"
      >
        {button}
      </button>
    </form>
  );
}
