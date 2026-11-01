"use client";

import { useRef, type ReactNode } from "react";

export interface OfficialProfileView {
  name: string;
  role: string;
  meta: string;
  facts: { text: string; source: string }[];
  links: { label: string; url: string }[];
  /** Name to use in the "search elsewhere" links (English reads better on most platforms). */
  searchName: string;
}

export interface OfficialCardLabels {
  details: string;
  about: string;
  profiles: string;
  search: string;
  source: string;
  close: string;
}

const cardClass =
  "flex h-full w-full flex-col gap-2 rounded-[14px] border border-ink/5 bg-white px-[22px] py-7 text-left transition duration-300 ease-out-expo hover:-translate-y-1 hover:shadow-[0_16px_32px_-18px_rgba(26,24,19,.18)]";

/**
 * A governance card. When the official has a researched profile, the card is a button
 * that opens a modal with sourced facts, profile links and search links.
 */
export function OfficialCard({
  children,
  profile,
  labels,
}: {
  children: ReactNode;
  profile?: OfficialProfileView;
  labels: OfficialCardLabels;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  if (!profile) return <div className={cardClass}>{children}</div>;

  const q = encodeURIComponent(`${profile.searchName} Deoria`);
  const searches = [
    { label: "Google", url: `https://www.google.com/search?q=${q}` },
    { label: "Google News", url: `https://news.google.com/search?q=${q}` },
    { label: "YouTube", url: `https://www.youtube.com/results?search_query=${q}` },
    { label: "X", url: `https://x.com/search?q=${q}` },
  ];

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className={`group cursor-pointer ${cardClass}`}>
        {children}
        <span className="mt-auto pt-1 text-[13px] font-medium text-accent group-hover:underline">{labels.details} →</span>
      </button>

      <dialog
        ref={dialog}
        aria-label={profile.name}
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        className="m-auto w-[min(560px,calc(100vw-32px))] overflow-hidden rounded-[20px] bg-paper p-0 text-ink shadow-2xl backdrop:bg-ink/50"
      >
        <div className="flex max-h-[85vh] flex-col gap-5 overflow-y-auto p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-2">{profile.role}</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">{profile.name}</h2>
              <p className="mt-1 text-sm text-muted">{profile.meta}</p>
            </div>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label={labels.close}
              className="grid size-10 flex-none cursor-pointer place-items-center rounded-full border border-ink/15 text-lg hover:bg-sand"
            >
              ×
            </button>
          </div>

          {profile.facts.length > 0 && (
            <section>
              <h3 className="border-b border-ink/10 pb-2 text-sm font-semibold">{labels.about}</h3>
              <ul className="mt-3 flex flex-col gap-2.5">
                {profile.facts.map((f) => (
                  <li key={f.text} className="text-[15px] leading-relaxed text-ink-2">
                    {f.text}{" "}
                    <a href={f.source} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
                      [{labels.source}]
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {profile.links.length > 0 && (
            <section>
              <h3 className="border-b border-ink/10 pb-2 text-sm font-semibold">{labels.profiles}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.links.map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-ink/15 bg-white px-3.5 py-2 text-sm hover:border-accent hover:text-accent"
                  >
                    {l.label} ↗
                  </a>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="border-b border-ink/10 pb-2 text-sm font-semibold">{labels.search}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {searches.map((s) => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-sand px-3.5 py-2 text-sm hover:text-accent"
                >
                  {s.label} ↗
                </a>
              ))}
            </div>
          </section>
        </div>
      </dialog>
    </>
  );
}
