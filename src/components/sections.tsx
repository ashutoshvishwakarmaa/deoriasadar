import Image from "next/image";
import Link from "next/link";
import {
  city,
  featuredEmergency,
  featuredPlaces,
  getPhoto,
  officials,
  otherEmergency,
  people,
  telHref,
  transport,
} from "@/lib/data";
import { getDictionary, t, type Dictionary, type Locale } from "@/lib/i18n";
import type { Place } from "@/lib/schema";
import { CityPhoto, Container, PhotoPlaceholder, SectionHeader, VerifiedBadge } from "./ui";
import { OfflineReady } from "./offline-status";

interface SectionProps {
  locale: Locale;
  dict: Dictionary;
  /** Render as the page's main heading (dedicated page) instead of a home-page section. */
  standalone?: boolean;
  /** Show a "View all" link to the dedicated page. */
  more?: boolean;
}

const kicker = (locale: Locale) => (locale === "hi" ? "tracking-normal" : "tracking-[.14em]");
const top = (standalone?: boolean) => (standalone ? "pt-16 sm:pt-20" : "pt-28");

export function FactsTable({ locale, label }: { locale: Locale; label: string }) {
  return (
    // Scrolls sideways on phones, so it takes keyboard focus to be scrollable without a mouse.
    <div role="region" aria-label={label} tabIndex={0} className="mt-5 overflow-x-auto rounded-2xl border border-ink/15 bg-white">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr>
            {city.facts.map((f) => (
              <th
                key={f.label.en}
                scope="col"
                className="border-r border-b border-r-ink/10 border-b-ink/15 bg-paper-2 px-[18px] py-3.5 text-left text-xs font-medium text-muted-2 last:border-r-0"
              >
                {t(f.label, locale)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {city.facts.map((f) => (
              <td
                key={f.label.en}
                className="border-r border-ink/10 px-[18px] py-4 text-lg font-medium tracking-tight last:border-r-0"
              >
                {t(f.value, locale)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function PlaceCard({ place, locale }: { place: Place; locale: Locale }) {
  const photo = getPhoto(place.photoId);
  return (
    <Link href={`/${locale}/explore/${place.slug}`} className="group flex flex-col gap-3.5">
      <div className="overflow-hidden rounded-2xl">
        {photo ? (
          <CityPhoto
            photo={photo}
            locale={locale}
            creditLabel={getDictionary(locale).photos.photoBy}
            linkCredit={false}
            sizes="(min-width: 1240px) 380px, (min-width: 640px) 45vw, 100vw"
            className="aspect-[4/5]"
            imageClassName="transition-transform duration-500 ease-out-expo group-hover:scale-[1.04]"
          />
        ) : (
          <PhotoPlaceholder
            label={place.photo ?? t(place.name, "en")}
            className="aspect-[4/5] rounded-none transition-transform duration-500 ease-out-expo group-hover:scale-[1.04]"
          />
        )}
      </div>
      <div className="flex justify-between gap-3 text-xs text-muted-2">
        <span>{t(place.area, locale)}</span>
        {place.distance && <span>{t(place.distance, locale)}</span>}
      </div>
      <h3 className="-mt-1.5 text-[21px] font-medium tracking-[-.02em] transition-colors group-hover:text-accent">
        {t(place.name, locale)}
      </h3>
      <p className="text-sm leading-relaxed text-pretty text-muted">{t(place.summary, locale)}</p>
    </Link>
  );
}

export function PlacesSection({ locale, dict, more }: SectionProps) {
  return (
    <section id="explore" className="scroll-mt-24">
      <Container className="pt-28">
        <SectionHeader
          title={dict.sections.places}
          href={more ? `/${locale}/explore` : undefined}
          linkLabel={dict.home.viewAll}
        />
        <div data-reveal-stagger className="mt-9 grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-7">
          {featuredPlaces.map((p) => (
            <PlaceCard key={p.slug} place={p} locale={locale} />
          ))}
        </div>
      </Container>
    </section>
  );
}

export function HistorySection({ locale, dict }: SectionProps) {
  return (
    <section id="history" className="scroll-mt-24">
      <Container className="pt-28">
        <div
          data-reveal
          className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-14 rounded-3xl border border-ink/10 bg-white px-6 py-14 sm:px-8"
        >
          <div>
            <div className={`text-[13px] text-muted-2 uppercase ${kicker(locale)}`}>{dict.sections.nameKicker}</div>
            <h2 className="mt-3.5 text-[clamp(40px,6vw,80px)] leading-[.95] font-semibold tracking-[-.045em]">
              Devaranya
              <br />
              <span className="mt-4 inline-block text-accent">देवारण्य</span>
            </h2>
            <p className="mt-7 max-w-[480px] text-[17px] leading-[1.7] font-light text-pretty">{t(city.nameOrigin, locale)}</p>
          </div>
          <div>
            <h3 className={`mb-2.5 text-[13px] font-normal text-muted-2 uppercase ${kicker(locale)}`}>
              {dict.sections.timeline}
            </h3>
            <ol className="rounded-2xl border border-ink/10 bg-paper px-5 py-1.5">
              {city.timeline.map((e) => (
                <li key={e.period.en} className="grid grid-cols-[110px_1fr] gap-5 border-t border-ink/10 py-4 first:border-t-0">
                  <span className="text-[15px] font-medium">{t(e.period, locale)}</span>
                  <span className="text-[15px] leading-normal text-ink-2">{t(e.event, locale)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function PeopleSection({ locale, dict, standalone }: SectionProps) {
  return (
    <section id="people" className="scroll-mt-24">
      <Container className={top(standalone)}>
        <SectionHeader title={dict.sections.people} as={standalone ? "h1" : "h2"} />
        <ul data-reveal-stagger className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-x-10">
          {people.map((p) => {
            const portrait = getPhoto(p.photoId);
            return (
              <li key={p.name.en} className="flex gap-[18px] border-t border-ink/10 py-[22px]">
                {portrait ? (
                  <div className="relative size-[72px] flex-none overflow-hidden rounded-full bg-sand ring-1 ring-ink/10">
                    <Image src={portrait.src} alt={t(p.name, locale)} fill sizes="72px" className="object-cover" />
                  </div>
                ) : (
                  <div className="hatch-fine size-[72px] flex-none rounded-full" aria-hidden />
                )}
                <div>
                  <h3 className="text-[17px] font-medium">{t(p.name, locale)}</h3>
                  <div className="mt-0.5 text-xs text-accent">{t(p.role, locale)}</div>
                  <p className="mt-1.5 text-sm leading-normal text-pretty text-muted">{t(p.bio, locale)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

export function GovernanceSection({ locale, dict, standalone }: SectionProps) {
  return (
    <section id="governance" className="scroll-mt-24">
      <Container className={top(standalone)}>
        <SectionHeader
          title={dict.sections.governance}
          as={standalone ? "h1" : "h2"}
          aside={<p className="max-w-[440px] text-sm leading-relaxed text-muted">{t(city.governanceNote, locale)}</p>}
        />
        <ul data-reveal-stagger className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(min(100%,270px),1fr))] gap-3.5">
          {officials.map((o) => (
            <li
              key={o.role.en}
              className="flex flex-col gap-1.5 rounded-[14px] border border-ink/5 bg-white px-[22px] py-5 transition duration-300 ease-out-expo hover:-translate-y-1 hover:shadow-[0_16px_32px_-18px_rgba(26,24,19,.18)]"
            >
              <div className="flex items-center justify-between gap-2.5">
                <span className="text-xs text-muted-2">{t(o.role, locale)}</span>
                <VerifiedBadge verified={o.verified} dict={dict.badges} />
              </div>
              <h3 className="text-lg font-medium tracking-tight">{t(o.name, locale)}</h3>
              <p className="text-[13px] leading-normal text-muted">{t(o.meta, locale)}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export function TransportSection({ locale, dict, standalone }: SectionProps) {
  return (
    <section id="transport" className="scroll-mt-24">
      <Container className={top(standalone)}>
        <SectionHeader title={dict.sections.transport} as={standalone ? "h1" : "h2"} />
        <div
          data-reveal-stagger
          className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] border-t border-ink"
        >
          {transport.map((m) => (
            <div key={m.mode.en} className="flex flex-col gap-2.5 py-6 pr-6 transition-[padding] duration-300 hover:pl-2">
              <div className="text-[13px] text-muted-2">{t(m.mode, locale)}</div>
              <h3 className="text-2xl font-semibold tracking-[-.03em]">{t(m.head, locale)}</h3>
              <p className="text-sm leading-relaxed text-pretty text-muted">{t(m.body, locale)}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function EmergencySection({ locale, dict, standalone }: SectionProps) {
  const Heading = standalone ? "h1" : "h2";
  return (
    <section
      id="emergency"
      className="mt-28 scroll-mt-24 overflow-hidden bg-ink text-paper"
      style={{ background: "radial-gradient(1100px 480px at 85% -10%, rgba(212,96,53,.16), transparent 60%), #1a1813" }}
    >
      <Container className="py-[88px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <Heading className="section-title">{dict.sections.emergency}</Heading>
            <span className="rounded-full bg-accent px-3 py-[5px] text-[11px] font-semibold tracking-[.08em] text-paper">
              24/7
            </span>
            {standalone && <OfflineReady path={`/${locale}/emergency`} label={dict.offline.saved} />}
          </div>
          <p className="max-w-[420px] text-sm leading-relaxed text-night-muted">{dict.sections.emergencyNote}</p>
        </div>
        <div data-reveal-stagger className="mt-11 grid gap-5 md:grid-cols-[minmax(260px,1fr)_1.4fr]">
          <a
            href={telHref(featuredEmergency.number)}
            className="relative flex min-h-[320px] flex-col justify-between gap-7 overflow-hidden rounded-[22px] bg-accent px-[34px] py-10 text-paper transition-transform duration-300 ease-out-expo hover:-translate-y-[5px]"
          >
            <div className="flex items-start justify-between">
              <span
                className="pulse-ring flex size-11 items-center justify-center rounded-full border-[1.5px] border-paper"
                aria-hidden
              >
                <span className="size-2.5 rounded-full bg-paper" />
              </span>
              <span className="em-hint text-[11px] tracking-[.05em] text-paper uppercase">{dict.emergency.tap}</span>
            </div>
            <div>
              <div className="text-[clamp(56px,7vw,92px)] leading-none font-semibold tracking-[-.04em]">
                {featuredEmergency.number}
              </div>
              <div className="mt-2.5 max-w-[280px] text-[15px] leading-normal text-paper">
                {t(featuredEmergency.label, locale)}
              </div>
            </div>
          </a>
          <ul className="flex flex-col overflow-hidden rounded-[22px] border border-paper/15">
            {otherEmergency.map((e) => (
              <li key={e.number} className="flex flex-1 border-t border-paper/10 first:border-t-0">
                <a
                  href={telHref(e.number)}
                  className="flex flex-1 items-center justify-between gap-4 px-[26px] py-[18px] transition-[background,padding] duration-200 hover:bg-paper/5 hover:pl-[34px]"
                >
                  <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="text-xl font-semibold tracking-tight whitespace-nowrap">{e.number}</span>
                    <span className="text-sm text-night-muted">{t(e.label, locale)}</span>
                  </span>
                  <span className="em-hint text-lg text-accent" aria-hidden>
                    →
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

export function CultureSection({ locale, dict, standalone }: SectionProps) {
  return (
    <section id="culture" className="scroll-mt-24">
      <Container className={top(standalone)}>
        <SectionHeader title={dict.sections.culture} as={standalone ? "h1" : "h2"} />
        <ul data-reveal-stagger className="mt-7 flex flex-wrap gap-2.5">
          {city.festivals.map((f) => (
            <li
              key={f.en}
              className="rounded-full border border-ink/20 px-6 py-3 text-[clamp(20px,2.4vw,30px)] font-medium tracking-[-.02em]"
            >
              {t(f, locale)}
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-[720px] text-[17px] leading-[1.7] font-light text-pretty">{t(city.languageNote, locale)}</p>
      </Container>
    </section>
  );
}

export function GallerySection({ locale, dict, standalone }: SectionProps) {
  return (
    <section id="gallery" className="scroll-mt-24">
      <Container className={top(standalone)}>
        <SectionHeader
          title={dict.sections.gallery}
          as={standalone ? "h1" : "h2"}
          aside={
            standalone ? (
              <p className="max-w-[440px] text-sm leading-relaxed text-muted">{dict.sections.galleryNote}</p>
            ) : undefined
          }
        />
        <div
          data-reveal-stagger
          className="mt-8 grid auto-rows-[220px] grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-3"
        >
          {city.gallery.map((g) => {
            const photo = getPhoto(g.photo)!;
            return (
              <div key={g.photo} className="group relative overflow-hidden rounded-[14px]" style={{ gridRow: `span ${g.span}` }}>
                <CityPhoto
                  photo={photo}
                  locale={locale}
                  creditLabel={dict.photos.photoBy}
                  sizes="(min-width: 1240px) 300px, (min-width: 640px) 33vw, 100vw"
                  className="h-full"
                  imageClassName="transition-transform duration-500 ease-out-expo group-hover:scale-[1.03]"
                />
                <p className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-ink/60 to-transparent px-3.5 pt-3 pb-8 text-[13px] font-medium text-paper">
                  {t(photo.caption, locale)}
                </p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
