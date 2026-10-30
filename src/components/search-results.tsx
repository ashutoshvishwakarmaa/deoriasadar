"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { Dictionary, Locale } from "@/lib/i18n";
import { searchDocs, type SearchDoc } from "@/lib/search-engine";
import { SearchBox } from "./search-box";

/** Searches the prebuilt index in the browser: instant, no API call, and it works offline. */
export function SearchResults({ locale, dict, index }: { locale: Locale; dict: Dictionary["search"]; index: SearchDoc[] }) {
  const q = useSearchParams().get("q")?.trim() ?? "";
  const results = useMemo(() => searchDocs(index, q), [index, q]);

  return (
    <>
      <div className="max-w-[640px]">
        <SearchBox key={q} locale={locale} placeholder={dict.placeholder} button={dict.button} initial={q} />
      </div>
      <div className="mt-10" aria-live="polite">
        {q.length < 2 ? (
          <p className="text-muted">{dict.empty}</p>
        ) : results.length === 0 ? (
          <p className="text-muted">{dict.noResults}</p>
        ) : (
          <>
            <p className="text-sm text-muted-2">
              {dict.resultsFor} “{q}” · {results.length}
            </p>
            <ul className="mt-4 border-t border-ink/10">
              {results.map((r) => (
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
