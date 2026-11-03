import type { MetadataRoute } from "next";
import { city, places } from "@/lib/data";
import { locales } from "@/lib/i18n";

const PAGES = [
  "",
  "/explore",
  "/history",
  "/people",
  "/governance",
  "/transport",
  "/map",
  "/emergency",
  "/culture",
  "/gallery",
  "/about",
  "/about/creator",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const paths = [...PAGES, ...places.map((p) => `/explore/${p.slug}`)];
  return paths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      lastModified: city.lastVerified,
      changeFrequency: path === "/emergency" ? "weekly" : "monthly",
      priority: path === "" ? 1 : path === "/emergency" ? 0.9 : 0.7,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}${path}`])) },
    })),
  );
}
