import { CorrectionForm } from "@/components/correction-form";
import { Container, PageIntro } from "@/components/ui";
import { photos, sources } from "@/lib/data";
import { t } from "@/lib/i18n";
import { pageMetadata, resolveLocale } from "@/lib/page";

export function generateMetadata({ params }: PageProps<"/[locale]/about">) {
  return pageMetadata(params, "/about", (dict) => ({ title: dict.about.title, description: dict.about.intro }));
}

export default async function Page({ params }: PageProps<"/[locale]/about">) {
  const { locale, dict } = await resolveLocale(params);
  return (
    <>
      <PageIntro title={dict.about.title}>{dict.about.intro}</PageIntro>
      <Container className="grid gap-16 pt-14 lg:grid-cols-2">
        <section>
          <h2 className="text-2xl font-semibold tracking-[-.03em]">{dict.about.sources}</h2>
          <ul className="mt-4">
            {sources.map((s) => (
              <li key={s.id} className="border-t border-ink/10 py-3 text-sm leading-normal">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-accent">
                  {s.name} ↗
                </a>
                <div className="text-[13px] text-muted-2">{s.usedFor}</div>
              </li>
            ))}
          </ul>
        </section>
        <section id="correction" className="scroll-mt-24">
          <h2 className="text-2xl font-semibold tracking-[-.03em]">{dict.about.correctionTitle}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{dict.about.correctionIntro}</p>
          <CorrectionForm locale={locale} dict={dict.about.form} />
        </section>
      </Container>
      <Container className="pt-20">
        <section id="photo-credits" className="scroll-mt-24">
          <h2 className="text-2xl font-semibold tracking-[-.03em]">{dict.photos.credits}</h2>
          <p className="mt-2 max-w-[680px] text-[15px] leading-relaxed text-muted">{dict.photos.creditsIntro}</p>
          <ul className="mt-6 grid gap-x-10 sm:grid-cols-2">
            {photos.map((p) => (
              <li key={p.id} className="border-t border-ink/10 py-3 text-sm leading-normal">
                <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-accent">
                  {t(p.caption, locale)} ↗
                </a>
                <div className="text-[13px] text-muted-2">
                  {p.author} ·{" "}
                  <a
                    href={p.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer license"
                    className="underline underline-offset-2"
                  >
                    {p.license}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </Container>
    </>
  );
}
