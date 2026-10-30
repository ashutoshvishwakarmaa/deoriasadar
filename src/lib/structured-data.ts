import { city, emergencyNumbers, getPhoto, places } from "./data";
import { getDictionary, t, type Locale } from "./i18n";
import type { Place, PlaceCategory, PlaceSchemaType } from "./schema";

/**
 * schema.org JSON-LD for search engines. Every builder returns a plain object;
 * <JsonLd> (components/json-ld.tsx) serialises it into the page.
 */

type Thing = Record<string, unknown>;

const DEORIA_GEO = { "@type": "GeoCoordinates", latitude: 26.5024, longitude: 83.7791 };

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Absolute URL for a site path such as "/en/explore". */
export function absolute(path: string) {
  return `${siteUrl()}${path}`;
}

const inLanguage = (locale: Locale) => (locale === "hi" ? "hi-IN" : "en-IN");

const deoriaCity = (locale: Locale): Thing => ({
  "@type": "City",
  name: t(city.name, locale),
  geo: DEORIA_GEO,
  containedInPlace: { "@type": "State", name: locale === "hi" ? "उत्तर प्रदेश" : "Uttar Pradesh" },
});

/** Breadcrumbs from the language's home page down to the current page. */
export function breadcrumbs(locale: Locale, trail: { name: string; path: string }[]): Thing {
  const home = { name: getDictionary(locale).brand, path: `/${locale}` };
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [home, ...trail].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  };
}

/** The site itself, with its search action, plus the city it is about. For the home page. */
export function website(locale: Locale): Thing {
  const dict = getDictionary(locale);
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: dict.brand,
    description: dict.meta.description,
    url: absolute(`/${locale}`),
    inLanguage: inLanguage(locale),
    about: deoriaCity(locale),
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: absolute(`/${locale}/search?q={search_term_string}`) },
      "query-input": "required name=search_term_string",
    },
  };
}

const defaultType: Record<PlaceCategory, PlaceSchemaType> = {
  faith: "PlaceOfWorship",
  health: "Hospital",
  transport: "TrainStation",
  offices: "GovernmentOffice",
  education: "School",
};

export function placeType(place: Place): PlaceSchemaType {
  return place.schemaType ?? defaultType[place.categories[0]];
}

/** One place: its type, address, location, phone and photo. */
export function place(p: Place, locale: Locale): Thing {
  const photo = getPhoto(p.photoId);
  const url = absolute(`/${locale}/explore/${p.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": placeType(p),
    "@id": url,
    url,
    name: t(p.name, locale),
    ...(p.name.en !== t(p.name, locale) && { alternateName: p.name.en }),
    description: t(p.summary, locale),
    address: {
      "@type": "PostalAddress",
      addressLocality: t(p.area, locale),
      addressRegion: locale === "hi" ? "उत्तर प्रदेश" : "Uttar Pradesh",
      addressCountry: "IN",
    },
    ...(p.coords && { geo: { "@type": "GeoCoordinates", latitude: p.coords[0], longitude: p.coords[1] } }),
    ...(p.phone && { telephone: p.phone }),
    ...(photo && { image: absolute(photo.src) }),
    containedInPlace: deoriaCity(locale),
  };
}

/** Every place in the guide, as a list linking to each place page. For the explore page. */
export function placeList(locale: Locale): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: getDictionary(locale).sections.places,
    itemListElement: places.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absolute(`/${locale}/explore/${p.slug}`),
      name: t(p.name, locale),
    })),
  };
}

/** The emergency helplines as government services reachable by phone. */
export function emergencyServices(locale: Locale): Thing {
  const dict = getDictionary(locale);
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: dict.sections.emergency,
    itemListElement: emergencyNumbers.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "GovernmentService",
        name: t(e.label, locale),
        serviceType: t(e.label, locale),
        areaServed: deoriaCity(locale),
        availableChannel: {
          "@type": "ServiceChannel",
          servicePhone: { "@type": "ContactPoint", telephone: e.number, contactType: "emergency" },
        },
      },
    })),
  };
}
