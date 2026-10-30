import { getPhoto, getPlace } from "@/lib/data";
import { getDictionary, hasLocale, t } from "@/lib/i18n";
import { ogContentType, ogSize, renderCard } from "@/lib/og";

/** A share card per place: its photo, categories, name and area. */
export function generateImageMetadata({ params }: { params: { locale: string; slug: string } }) {
  const place = getPlace(params.slug);
  const locale = hasLocale(params.locale) ? params.locale : "en";
  const alt = place ? `${t(place.name, locale)} · ${getDictionary(locale).brand}` : getDictionary(locale).brand;
  return [{ id: "card", alt, size: ogSize, contentType: ogContentType }];
}

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  const locale = hasLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const place = getPlace(slug);
  if (!place) return new Response("Not found", { status: 404 });
  return renderCard({
    brand: dict.brand,
    kicker: place.categories.map((c) => dict.map.layers[c as keyof typeof dict.map.layers] ?? c).join(" · "),
    title: t(place.name, locale),
    subtitle: [t(place.area, locale), place.distance && t(place.distance, locale)].filter(Boolean).join(" · "),
    photo: getPhoto(place.photoId),
  });
}
