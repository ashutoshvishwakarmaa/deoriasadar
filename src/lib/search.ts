import { city, emergencyNumbers, officials, people, places, transport } from "./data";
import { locales, type Locale, type Localized } from "./i18n";
import { searchDocs, tokenize, type ResultType, type SearchDoc, type SearchResult } from "./search-engine";

export { editDistance, phonetic, tokenize, type SearchDoc, type SearchResult } from "./search-engine";

interface Entry {
  id: string;
  type: ResultType;
  title: Localized;
  subtitle: Localized;
  /** Path below the locale prefix, e.g. "/explore/hanuman-mandir". */
  path: string;
  /** Extra words that count as part of the title, e.g. alternative spellings. */
  titleExtra?: string;
  body: string;
}

function both(l: Localized) {
  return `${l.en} ${l.hi}`;
}

function entries(): Entry[] {
  return [
    ...places.map((p) => ({
      id: `place:${p.slug}`,
      type: "place" as const,
      title: p.name,
      subtitle: p.area,
      path: `/explore/${p.slug}`,
      titleExtra: p.aliases.join(" "),
      body: [both(p.summary), p.tips ? both(p.tips) : "", p.categories.join(" "), p.phone ?? ""].join(" "),
    })),
    ...people.map((p, i) => ({
      id: `person:${i}`,
      type: "person" as const,
      title: p.name,
      subtitle: p.role,
      path: "/people",
      body: both(p.bio),
    })),
    ...officials.map((o, i) => ({
      id: `official:${i}`,
      type: "official" as const,
      title: o.name,
      subtitle: o.role,
      path: "/governance",
      body: `${both(o.role)} ${both(o.meta)}`,
    })),
    ...emergencyNumbers.map((e) => ({
      id: `emergency:${e.number}`,
      type: "emergency" as const,
      title: { en: e.number, hi: e.number },
      subtitle: e.label,
      path: "/emergency",
      body: `${both(e.label)} helpline emergency phone call`,
    })),
    ...transport.map((m, i) => ({
      id: `transport:${i}`,
      type: "transport" as const,
      title: m.head,
      subtitle: m.mode,
      path: "/transport",
      body: `${both(m.mode)} ${both(m.body)}`,
    })),
    ...city.timeline.map((e, i) => ({
      id: `history:${i}`,
      type: "history" as const,
      title: e.period,
      subtitle: e.event,
      path: "/history",
      body: both(e.event),
    })),
  ];
}

function buildIndex(locale: Locale): SearchDoc[] {
  return entries().map((e) => ({
    id: e.id,
    type: e.type,
    title: e.title[locale],
    subtitle: e.subtitle[locale],
    href: `/${locale}${e.path}`,
    // Tokens span both languages, so a Hindi query finds results on the English site and vice versa.
    titleTokens: tokenize(`${both(e.title)} ${e.titleExtra ?? ""}`),
    bodyTokens: tokenize(`${both(e.subtitle)} ${e.body}`),
  }));
}

/** One prebuilt index per language; the search page sends its language's index to the browser. */
export const searchIndex = Object.fromEntries(locales.map((l) => [l, buildIndex(l)])) as Record<Locale, SearchDoc[]>;

export function search(query: string, locale: Locale, limit = 20): SearchResult[] {
  return searchDocs(searchIndex[locale], query, limit);
}
