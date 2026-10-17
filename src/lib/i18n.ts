import en from "@/i18n/en.json";
import hi from "@/i18n/hi.json";

export const locales = ["en", "hi"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export type Dictionary = typeof en;

// hi.json is checked against en.json's shape by the type annotation below and by tests/i18n.test.ts.
const dictionaries: Record<Locale, Dictionary> = { en, hi };

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** A string available in every supported language. */
export type Localized = Record<Locale, string>;

export function t(value: Localized, locale: Locale): string {
  return value[locale] || value.en;
}
