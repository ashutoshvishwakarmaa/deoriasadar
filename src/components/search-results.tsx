"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { SearchResult } from "@/lib/search";
import { SearchBox } from "./search-box";

type SearchState = { q: string; results: SearchResult[]; error?: "rate_limited" | "failed" };

export function SearchResults({ locale, dict }: { locale: Locale; dict: Dictionary["search"] }) {
  const q = useSearchParams().get("q")?.trim() ?? "";
  const [state, setState] = useState<SearchState | null>(null);
  // Bumped by the "Try again" button to re-run the request for the same query.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (q.length < 2) return;
    const controller = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(q)}&lang=${locale}`, { signal: controller.signal })
      .then(async (r): Promise<Omit<SearchState, "q">> => {
        if (r.status === 429) return { results: [], error: "rate_limited" };
        if (!r.ok) return { results: [], error: "failed" };
        const data = (await r.json()) as { results: SearchResult[] };
        return { results: data.results };
      })
      .then((outcome) => setState({ q, ...outcome }))
      .catch((error: unknown) => {
        // A cancelled request just means the query changed; anything else (offline, bad JSON) is a real failure.
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ q, results: [], error: "failed" });
      });
    return () => controller.abort();
  }, [q, locale, attempt]);

  const loading = q.length >= 2 && state?.q !== q;
  const error = !loading && state?.q === q ? state.error : undefined;

  return (
    <>
      <div className="max-w-[640px]">
        <SearchBox key={q} locale={locale} placeholder={dict.placeholder} button={dict.button} initial={q} />
      </div>
      <div className="mt-10" aria-live="polite">
        {q.length < 2 ? (
          <p className="text-muted">{dict.empty}</p>
        ) : loading ? (
          <p className="text-muted">{dict.loading}</p>
        ) : error ? (
          <div role="alert" className="max-w-[640px] rounded-2xl bg-warn-bg px-5 py-4 text-warn-fg">
            <p>{error === "rate_limited" ? dict.rateLimited : dict.error}</p>
            <button
              type="button"
              onClick={() => {
                setState(null);
                setAttempt((n) => n + 1);
              }}
              className="mt-3 rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper transition-colors hover:bg-accent"
            >
              {dict.retry}
            </button>
          </div>
        ) : state && state.results.length === 0 ? (
          <p className="text-muted">{dict.noResults}</p>
        ) : (
          <>
            <p className="text-sm text-muted-2">
              {dict.resultsFor} “{q}” · {state?.results.length}
            </p>
            <ul className="mt-4 border-t border-ink/10">
              {state?.results.map((r) => (
                <li key={r.id} className="border-b border-ink/10">
                  <Link href={r.href} className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-5">
                    <span>
                      <span className="block text-lg font-medium tracking-tight group-hover:text-accent">{r.title}</span>
                      <span className="mt-0.5 block text-sm text-muted">{r.subtitle}</span>
                    </span>
                    <span className="rounded-full border border-ink/15 px-2.5 py-0.5 text-[11px] text-muted-2">
                      {dict.types[r.type]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
