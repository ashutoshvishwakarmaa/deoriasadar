"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

export interface MapPoint {
  slug: string;
  name: string;
  sub: string;
  href: string;
  coords: [number, number];
  approx: boolean;
}

const DEORIA_CENTRE: L.LatLngTuple = [26.5024, 83.7791];
const ACCENT = "oklch(0.58 0.16 40)";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Plain Leaflet instead of react-leaflet. With Cache Components, Next.js hides
 * previous routes with React <Activity> and re-runs their effects when they are
 * shown again. Leaflet refuses to initialise twice on the same element, so each
 * mount creates a fresh inner element and each cleanup destroys the map fully.
 */
export default function LeafletMap({ points, approxLabel }: { points: MapPoint[]; approxLabel: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const el = document.createElement("div");
    el.style.cssText = "position:absolute;inset:0";
    host.appendChild(el);

    const map = L.map(el, { center: DEORIA_CENTRE, zoom: 10, scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    L.circleMarker(DEORIA_CENTRE, { radius: 5, color: "#1a1813", fillColor: "#1a1813", fillOpacity: 1, weight: 1 })
      .bindPopup("Deoria · देवरिया")
      .addTo(map);

    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      el.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    for (const p of points) {
      const popup = `<a href="${escapeHtml(p.href)}" style="font-weight:600;color:#1a1813">${escapeHtml(p.name)}</a><br>
<span style="color:#6b665c">${escapeHtml(p.sub)}</span>${
        p.approx ? `<br><em style="color:#8a8478;font-size:11px">${escapeHtml(approxLabel)}</em>` : ""
      }`;
      L.circleMarker(p.coords, { radius: 9, color: "#1a1813", weight: 1.5, fillColor: ACCENT, fillOpacity: 0.9 })
        .bindPopup(popup)
        .addTo(layer);
    }

    if (points.length === 0) map.setView(DEORIA_CENTRE, 10);
    else if (points.length === 1) map.setView(points[0].coords, 12);
    else map.fitBounds(L.latLngBounds(points.map((p) => p.coords)), { padding: [48, 48], maxZoom: 12 });
  }, [points, approxLabel]);

  return <div ref={hostRef} className="relative h-full min-h-[440px] w-full" />;
}
