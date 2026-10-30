import { HistorySection } from "@/components/sections";
import { PageIntro } from "@/components/ui";
import { pageMetadata, resolveLocale } from "@/lib/page";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbs } from "@/lib/structured-data";

export function generateMetadata({ params }: PageProps<"/[locale]/history">) {
  return pageMetadata(params, "/history", (dict) => ({ title: dict.sections.timeline, description: dict.sections.nameKicker }));
}

export default async function Page({ params }: PageProps<"/[locale]/history">) {
  const { locale, dict } = await resolveLocale(params);
  return (
    <>
      <JsonLd data={[breadcrumbs(locale, [{ name: dict.nav.history, path: `/${locale}/history` }])]} />
      <PageIntro title={dict.nav.history} />
      <div className="-mt-16">
        <HistorySection locale={locale} dict={dict} />
      </div>
    </>
  );
}
