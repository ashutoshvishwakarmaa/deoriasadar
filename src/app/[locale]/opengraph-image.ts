import { city, getPhoto } from "@/lib/data";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { ogContentType, ogSize, renderCard } from "@/lib/og";

/** The default share card for every page in a language that has no card of its own. */
export function generateImageMetadata({ params }: { params: { locale: string } }) {
  const dict = getDictionary(hasLocale(params.locale) ? params.locale : "en");
  return [{ id: "card", alt: dict.meta.title, size: ogSize, contentType: ogContentType }];
}

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(hasLocale(locale) ? locale : "en");
  return renderCard({
    brand: dict.brand,
    kicker: dict.home.kicker,
    title: dict.meta.title,
    photo: getPhoto(city.heroPhoto),
  });
}
