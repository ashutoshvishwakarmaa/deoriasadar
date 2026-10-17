"use client";

import { useId, useState } from "react";

export interface AudienceView {
  id: string;
  label: string;
  items: { title: string; body: string }[];
}

export function AudienceTabs({ title, audiences }: { title: string; audiences: AudienceView[] }) {
  const [active, setActive] = useState(audiences[0]?.id);
  const baseId = useId();
  const current = audiences.find((a) => a.id === active) ?? audiences[0];

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const next = (index + (e.key === "ArrowRight" ? 1 : audiences.length - 1)) % audiences.length;
    setActive(audiences[next].id);
    document.getElementById(`${baseId}-tab-${audiences[next].id}`)?.focus();
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 className="section-title">{title}</h2>
        <div role="tablist" aria-label={title} className="flex flex-wrap gap-2">
          {audiences.map((a, i) => {
            const selected = a.id === current.id;
            return (
              <button
                key={a.id}
                id={`${baseId}-tab-${a.id}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`${baseId}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(a.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={`rounded-full border border-ink/20 px-5 py-2.5 text-sm font-medium transition duration-200 hover:-translate-y-0.5 ${
                  selected ? "bg-ink text-paper" : "bg-transparent text-ink"
                }`}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </div>
      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${current.id}`}
        className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4"
      >
        {current.items.map((item, n) => (
          <div
            key={item.title}
            className="flex min-h-[190px] flex-col gap-2.5 rounded-2xl border border-ink/5 bg-white p-[26px] transition duration-300 ease-out-expo hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-20px_rgba(26,24,19,.2)]"
          >
            <div className="text-xs font-medium text-accent">0{n + 1}</div>
            <h3 className="text-lg font-medium tracking-tight">{item.title}</h3>
            <p className="text-sm leading-relaxed text-pretty text-muted">{item.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}
