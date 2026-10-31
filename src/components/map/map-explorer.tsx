"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MapPoint } from "./leaflet-map";

const placeholder = <div className="hatch h-full min-h-[440px] w-full" />;

const LeafletMap = dynamic(() => import("./leaflet-map"), { ssr: false, loading: () => placeholder });

export interface MapLayerItem {
  slug: string;
  name: string;
  sub: string;
  href: string;
  coords?: [number, number];
  approx: boolean;
}

export interface MapLayer {
  id: string;
  label: string;
  items: MapLayerItem[];
}

export function MapExplorer({
  title,
  layers,
  labels,
  headingLevel = "h2",
}: {
  title: string;
  layers: MapLayer[];
  labels: { approx: string; unmapped: string };
  headingLevel?: "h1" | "h2";
}) {
  const [active, setActive] = useState(layers[0]?.id);
  // Leaflet and its tiles load only when the map is about to scroll into view. On the home page it
  // sits far down, and loading it up front delayed the first paint on phones.
  const mapRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const layer = layers.find((l) => l.id === active) ?? layers[0];
  const Heading = headingLevel;

  const points = useMemo<MapPoint[]>(
    () =>
      layer.items
        .filter((i): i is MapLayerItem & { coords: [number, number] } => Boolean(i.coords))
        .map((i) => ({ slug: i.slug, name: i.name, sub: i.sub, href: i.href, coords: i.coords, approx: i.approx })),
    [layer],
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <Heading className="section-title">{title}</Heading>
        <div className="flex flex-wrap gap-2" role="group" aria-label={title}>
          {layers.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={l.id === layer.id}
              onClick={() => setActive(l.id)}
              className={`rounded-full border border-ink/20 px-4 py-2 text-[13px] font-medium transition-colors ${
                l.id === layer.id ? "bg-ink text-paper" : "text-ink hover:bg-ink/5"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-7 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div ref={mapRef} className="relative isolate min-h-[440px] overflow-hidden rounded-[20px] bg-sage">
          {near ? <LeafletMap points={points} approxLabel={labels.approx} /> : placeholder}
        </div>
        <ul className="rounded-[20px] border border-ink/5 bg-white px-[22px] py-2" aria-live="polite">
          {layer.items.map((i) => (
            <li key={i.slug} className="border-b border-ink/10 py-4 last:border-b-0">
              <Link href={i.href} className="text-[15px] font-medium hover:text-accent">
                {i.name}
              </Link>
              <div className="mt-0.5 text-[13px] text-muted-2">{i.sub}</div>
              {!i.coords && <div className="mt-1 text-[11px] text-faint">{labels.unmapped}</div>}
              {i.coords && i.approx && <div className="mt-1 text-[11px] text-faint">{labels.approx}</div>}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
