import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale, type Dictionary, type Locale } from "./i18n";

/** Resolve and validate the `[locale]` segment for a page. */
export async function resolveLocale(params: Promise<{ locale: string }>): Promise<{ locale: Locale; dict: Dictionary }> {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  return { locale, dict: getDictionary(locale) };
}

/** Per-page metadata with canonical and hreflang alternates for `/{locale}{path}`. */
export async function pageMetadata(
  params: Promise<{ locale: string }>,
  path: string,
  pick: (dict: Dictionary) => { title: string; description?: string },
): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const { title, description } = pick(getDictionary(locale));
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: { en: `/en${path}`, hi: `/hi${path}`, "x-default": `/en${path}` },
    },
    openGraph: { title, description },
  };
}
