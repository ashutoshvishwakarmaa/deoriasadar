import { CultureSection } from "@/components/sections";
import { pageMetadata, resolveLocale } from "@/lib/page";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbs } from "@/lib/structured-data";

export function generateMetadata({ params }: PageProps<"/[locale]/culture">) {
  return pageMetadata(params, "/culture", (dict) => ({ title: dict.sections.culture }));
}

export default async function Page({ params }: PageProps<"/[locale]/culture">) {
  const { locale, dict } = await resolveLocale(params);
  return (
    <>
      <JsonLd data={[breadcrumbs(locale, [{ name: dict.nav.culture, path: `/${locale}/culture` }])]} />
      <CultureSection locale={locale} dict={dict} standalone />
    </>
  );
}
