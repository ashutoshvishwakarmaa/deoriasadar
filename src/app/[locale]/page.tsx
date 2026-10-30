import { AudienceTabs } from "@/components/audience-tabs";
import { JsonLd } from "@/components/json-ld";
import { MapSection } from "@/components/map/map-section";
import { SearchBox } from "@/components/search-box";
import {
  CultureSection,
  EmergencySection,
  FactsTable,
  GallerySection,
  GovernanceSection,
  HistorySection,
  PeopleSection,
  PlacesSection,
  TransportSection,
} from "@/components/sections";
import { CityPhoto, Container } from "@/components/ui";
import { audiences, city, getPhoto } from "@/lib/data";
import { t } from "@/lib/i18n";
import { resolveLocale } from "@/lib/page";
import { website } from "@/lib/structured-data";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale, dict } = await resolveLocale(params);
  const hi = locale === "hi";
  const hero = getPhoto(city.heroPhoto)!;

  return (
    <>
      <JsonLd data={website(locale)} />
      <Container className="pt-5 pb-12 sm:pt-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-px w-[26px] bg-accent" aria-hidden />
            <p className={`text-[12.5px] font-medium text-muted-2 uppercase ${hi ? "tracking-normal" : "tracking-[.14em]"}`}>
              {dict.home.kicker}
            </p>
          </div>
          <p className="rounded-full border border-ink/15 px-3.5 py-1.5 text-xs tracking-[.06em] text-faint">
            {dict.home.estBadge}
          </p>
        </div>

        <div className={`mt-[15px] flex flex-wrap items-start gap-x-9 gap-y-4 ${hi ? "pt-5" : "pt-1.5"}`}>
          <h1
            className={`text-[clamp(72px,15vw,208px)] font-semibold tracking-[-.055em] ${hi ? "leading-[1.15]" : "leading-[.92]"}`}
          >
            {dict.home.heroBig}
          </h1>
          <div className="flex flex-col gap-2 pt-[clamp(16px,3vw,34px)]">
            <span className="h-px w-11 bg-ink/20" aria-hidden />
            <p lang={hi ? "en" : "hi"} className="text-[clamp(26px,3.6vw,44px)] font-medium tracking-[-.01em] text-accent">
              {dict.home.heroSmall}
            </p>
          </div>
        </div>

        <div className="mt-9 grid items-end gap-7 border-t border-ink/10 pt-[30px] md:grid-cols-[1.3fr_1fr] md:gap-12">
          <p className="max-w-[540px] text-[19px] leading-relaxed font-light text-pretty text-ink-2">{dict.home.heroSub}</p>
          <SearchBox locale={locale} placeholder={dict.search.placeholder} button={dict.search.button} />
        </div>
      </Container>

      <Container>
        <CityPhoto
          photo={hero}
          locale={locale}
          creditLabel={dict.photos.photoBy}
          priority
          sizes="(min-width: 1240px) 1176px, 100vw"
          className="h-[clamp(300px,42vw,540px)] rounded-[20px]"
          imageClassName="object-[center_35%]"
        />
        <FactsTable locale={locale} label={dict.home.facts} />
      </Container>

      <Container className="pt-24">
        <AudienceTabs
          title={dict.home.startHere}
          audiences={audiences.map((a) => ({
            id: a.id,
            label: t(a.label, locale),
            items: a.items.map((i) => ({ title: t(i.title, locale), body: t(i.body, locale) })),
          }))}
        />
      </Container>

      <PlacesSection locale={locale} dict={dict} more />
      <HistorySection locale={locale} dict={dict} />
      <PeopleSection locale={locale} dict={dict} />
      <GovernanceSection locale={locale} dict={dict} />
      <TransportSection locale={locale} dict={dict} />
      <MapSection locale={locale} dict={dict} />
      <EmergencySection locale={locale} dict={dict} />
      <CultureSection locale={locale} dict={dict} />
      <GallerySection locale={locale} dict={dict} />
    </>
  );
}
