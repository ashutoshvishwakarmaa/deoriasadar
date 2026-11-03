import type { ReactNode } from "react";
import Image from "next/image";
import { Container } from "@/components/ui";
import { JsonLd } from "@/components/json-ld";
import { creator } from "@/lib/data";
import { t } from "@/lib/i18n";
import { pageMetadata, resolveLocale } from "@/lib/page";
import { breadcrumbs } from "@/lib/structured-data";

export function generateMetadata({ params }: PageProps<"/[locale]/about/creator">) {
  return pageMetadata(params, "/about/creator", (dict) => ({ title: dict.creator.title, description: dict.creator.intro }));
}

/** Blackcoat.ai in its own brand colours (slate wordmark, orange ".ai"); other text is returned unchanged. */
function withBrand(text: string): ReactNode {
  const i = text.indexOf("Blackcoat.ai");
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <span className="whitespace-nowrap">
        <span className="text-[#4a505c]">Blackcoat</span>
        <span className="text-[#f0a04b]">.ai</span>
      </span>
      {text.slice(i + "Blackcoat.ai".length)}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="border-b border-ink pb-3 text-2xl font-semibold tracking-[-.03em]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function Page({ params }: PageProps<"/[locale]/about/creator">) {
  const { locale, dict } = await resolveLocale(params);
  const c = creator;
  const name = t(c.name, locale);
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: c.name.en,
    jobTitle: "AI/ML Engineer",
    worksFor: { "@type": "Organization", name: "Blackcoat.ai" },
    email: `mailto:${c.contact.email}`,
    telephone: c.contact.phone,
    sameAs: c.contact.links.map((l) => l.url),
  };

  return (
    <>
      <JsonLd
        data={[
          breadcrumbs(locale, [
            { name: dict.nav.about, path: `/${locale}/about` },
            { name: dict.creator.title, path: `/${locale}/about/creator` },
          ]),
          person,
        ]}
      />
      <Container className="flex flex-col-reverse gap-8 pt-12 pb-4 sm:pt-20 md:flex-row md:items-center md:justify-between md:gap-12">
        <div className="max-w-[680px]">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px w-6 bg-accent" aria-hidden />
            <span className={`text-[12.5px] font-medium text-muted-2 uppercase ${locale === "hi" ? "" : "tracking-[.14em]"}`}>
              {dict.creator.kicker}
            </span>
          </div>
          <h1 className="text-[clamp(40px,6vw,76px)] leading-[.95] font-semibold tracking-[-.045em]">{name}</h1>
          <p className="mt-6 text-[17px] font-medium text-accent">{withBrand(t(c.role, locale))}</p>
          {c.bio.map((para) => (
            <p key={para.en} className="mt-3 text-[17px] leading-relaxed font-light text-ink-2">
              {t(para, locale)}
            </p>
          ))}
        </div>
        <Image
          src={c.photo.src}
          alt={name}
          width={c.photo.width}
          height={c.photo.height}
          loading="eager"
          fetchPriority="high"
          sizes="(min-width: 768px) 240px, 140px"
          className="size-[140px] flex-none rounded-full shadow-[0_18px_40px_-20px_rgba(26,24,19,.45)] md:size-[240px]"
        />
      </Container>

      <Container className="pt-8">
        <div className="rounded-[14px] border border-ink/5 bg-white p-6">
          <div className="text-[13px] text-muted-2">{dict.creator.fromDeoria}</div>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{t(c.deoria.intro, locale)}</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {c.deoria.points.map((pt) => (
              <li key={pt.en} className="flex gap-2 text-[15px] leading-relaxed text-pretty text-ink-2">
                <span className="mt-[11px] size-1 flex-none rounded-full bg-accent" aria-hidden />
                <span>{t(pt, locale)}</span>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      <Container className="pt-14">
        <div className="flex max-w-[860px] flex-col gap-14">
          <Section title={dict.creator.experience}>
            <ol className="flex flex-col border-l border-ink/15">
              {c.experience.map((job) => (
                <li key={job.org} className="relative pb-8 pl-6 last:pb-0">
                  <span className="absolute top-2 -left-[5px] size-[9px] rounded-full bg-accent ring-4 ring-paper" aria-hidden />
                  <div className="text-[13px] text-muted-2">
                    {t(job.period, locale)} · {t(job.place, locale)}
                  </div>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight">
                    {t(job.title, locale)} ·{" "}
                    {job.url ? (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent underline-offset-4 hover:underline"
                      >
                        {withBrand(job.org)} <span className="text-sm">↗</span>
                      </a>
                    ) : (
                      <span className="text-accent">{withBrand(job.org)}</span>
                    )}
                  </h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-pretty text-ink-2">{t(job.summary, locale)}</p>
                  {job.points && (
                    <ul className="mt-3 flex flex-col gap-2">
                      {job.points.map((pt) => (
                        <li key={pt.en} className="flex gap-2 text-[15px] leading-relaxed text-pretty text-ink-2">
                          <span className="mt-[11px] size-1 flex-none rounded-full bg-accent" aria-hidden />
                          <span>{t(pt, locale)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </Section>

          <div>
            <Section title={dict.creator.contact}>
              <div className="flex flex-col gap-3 text-[15px]">
                <a href={`tel:${c.contact.phone}`} className="inline-flex min-h-6 items-center gap-2 hover:text-accent">
                  <span className="text-muted-2">{dict.creator.call}:</span> {c.contact.phoneDisplay}
                </a>
                <a
                  href={`mailto:${c.contact.email}`}
                  className="inline-flex min-h-6 items-center gap-2 break-all hover:text-accent"
                >
                  <span className="text-muted-2">{dict.creator.email}:</span> {c.contact.email}
                </a>
                <div className="mt-1 flex flex-wrap gap-2">
                  {c.contact.links.map((l) => (
                    <a
                      key={l.url}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer me"
                      className="rounded-full border border-ink/15 bg-white px-3.5 py-2 text-sm hover:border-accent hover:text-accent"
                    >
                      {l.label} ↗
                    </a>
                  ))}
                </div>
              </div>
            </Section>
          </div>
        </div>
      </Container>
    </>
  );
}
