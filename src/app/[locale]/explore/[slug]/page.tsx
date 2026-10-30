import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { CityPhoto, Container, PhotoPlaceholder } from "@/components/ui";
import { getPhoto, getPlace, places, sourcesFor, telHref } from "@/lib/data";
import { getDictionary, hasLocale, t } from "@/lib/i18n";
import { resolveLocale } from "@/lib/page";
import { absolute, breadcrumbs, place as placeLd } from "@/lib/structured-data";
import { suggestEditUrl } from "@/lib/suggest-edit";

export function generateStaticParams() {
  return places.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/explore/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const place = getPlace(slug);
  if (!place || !hasLocale(locale)) return {};
  const title = t(place.name, locale);
  return {
    title,
    description: t(place.summary, locale),
    alternates: {
      canonical: `/${locale}/explore/${slug}`,
      languages: { en: `/en/explore/${slug}`, hi: `/hi/explore/${slug}`, "x-default": `/en/explore/${slug}` },
    },
    openGraph: { title: `${title} · ${getDictionary(locale).brand}`, description: t(place.summary, locale) },
  };
}

/**
 * Unknown slugs (for example a place that was removed) must answer with a real 404, which needs the
 * slug resolved before streaming starts. Every valid slug is prerendered by generateStaticParams, so
 * this costs nothing for real places; `instant = false` tells Next.js that blocking here is intended.
 */
export const instant = false;

export default async function Page({ params }: PageProps<"/[locale]/explore/[slug]">) {
  const { locale, dict } = await resolveLocale(params);
  const { slug } = await params;
  const place = getPlace(slug);
  if (!place) notFound();

  const d = dict.place;
  const directions = place.coords
    ? `https://www.openstreetmap.org/directions?to=${place.coords[0]}%2C${place.coords[1]}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${place.name.en}, ${place.area.en}, Deoria`)}`;
  const cited = sourcesFor(place.sources);
  const photo = getPhoto(place.photoId);

  return (
    <article>
      <JsonLd
        data={[
          placeLd(place, locale),
          breadcrumbs(locale, [
            { name: dict.nav.explore, path: `/${locale}/explore` },
            { name: t(place.name, locale), path: `/${locale}/explore/${place.slug}` },
          ]),
        ]}
      />
      <Container className="pt-12 sm:pt-16">
        <Link href={`/${locale}/explore`} className="text-sm text-muted hover:text-accent">
          ← {d.back}
        </Link>
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <p className={`text-xs font-medium text-accent uppercase ${locale === "hi" ? "" : "tracking-[.14em]"}`}>
              {place.categories.map((c) => dict.map.layers[c]).join(" · ")}
            </p>
            <h1 className="mt-3 text-[clamp(40px,6vw,72px)] leading-[.98] font-semibold tracking-[-.045em]">
              {t(place.name, locale)}
            </h1>
            <p className="mt-6 max-w-[560px] text-[19px] leading-relaxed font-light text-pretty text-ink-2">
              {t(place.summary, locale)}
            </p>

            <dl className="mt-10 grid max-w-[560px] grid-cols-2 border-t border-ink">
              <div className="border-b border-ink/10 py-4 pr-4">
                <dt className="text-xs text-muted-2">{d.area}</dt>
                <dd className="mt-1 text-lg font-medium">{t(place.area, locale)}</dd>
              </div>
              {place.distance && (
                <div className="border-b border-ink/10 py-4 pr-4">
                  <dt className="text-xs text-muted-2">{d.distance}</dt>
                  <dd className="mt-1 text-lg font-medium">{t(place.distance, locale)}</dd>
                </div>
              )}
              <div className="col-span-2 border-b border-ink/10 py-4">
                <dt className="text-xs text-muted-2">{d.verifiedOn}</dt>
                <dd className={`mt-1 text-sm font-medium ${place.verified ? "text-ok-fg" : "text-warn-fg"}`}>
                  {place.verified
                    ? new Date(place.verified).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", { dateStyle: "long" })
                    : d.unverified}
                </dd>
              </div>
            </dl>

            {place.tips && (
              <div className="mt-8 max-w-[560px] rounded-2xl bg-white p-6">
                <h2 className="text-sm font-semibold">{d.tips}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{t(place.tips, locale)}</p>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={directions}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-accent"
              >
                {d.directions} ↗
              </a>
              {place.phone && (
                <a
                  href={telHref(place.phone)}
                  className="rounded-full border border-ink/20 px-6 py-3 text-sm font-medium hover:bg-ink/5"
                >
                  {d.callOffice} {place.phone}
                </a>
              )}
            </div>
            {!place.coords && <p className="mt-3 text-xs text-faint">{d.notMapped}</p>}
            {place.coords && place.coordsApprox && <p className="mt-3 text-xs text-faint">{d.approxLocation}</p>}

            {cited.length > 0 && (
              <div className="mt-10 max-w-[560px]">
                <h2 className="text-sm font-semibold">{d.sources}</h2>
                <ul className="mt-2 space-y-1 text-sm">
                  {cited.map((s) => (
                    <li key={s.id}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted underline underline-offset-2 hover:text-accent"
                      >
                        {s.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className={`${cited.length > 0 ? "mt-4" : "mt-10"} text-sm`}>
              <a
                href={suggestEditUrl({ entry: t(place.name, locale), pageUrl: absolute(`/${locale}/explore/${place.slug}`) })}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted underline underline-offset-2 hover:text-accent"
              >
                {d.suggestEdit} ↗
              </a>
            </p>
          </div>
          {photo ? (
            <div className="lg:sticky lg:top-28 lg:self-start">
              <CityPhoto
                photo={photo}
                locale={locale}
                creditLabel={dict.photos.photoBy}
                priority
                sizes="(min-width: 1024px) 560px, 100vw"
                className="aspect-[4/5] rounded-2xl"
              />
              <p className="mt-3 text-sm text-muted-2">{t(photo.caption, locale)}</p>
            </div>
          ) : (
            <PhotoPlaceholder label={dict.photos.noPhoto} className="aspect-[4/5] lg:sticky lg:top-28 lg:self-start" />
          )}
        </div>
      </Container>
    </article>
  );
}
