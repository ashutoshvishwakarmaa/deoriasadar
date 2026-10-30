import { PeopleSection } from "@/components/sections";
import { pageMetadata, resolveLocale } from "@/lib/page";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbs } from "@/lib/structured-data";

export function generateMetadata({ params }: PageProps<"/[locale]/people">) {
  return pageMetadata(params, "/people", (dict) => ({ title: dict.sections.people }));
}

export default async function Page({ params }: PageProps<"/[locale]/people">) {
  const { locale, dict } = await resolveLocale(params);
  return (
    <>
      <JsonLd data={[breadcrumbs(locale, [{ name: dict.nav.people, path: `/${locale}/people` }])]} />
      <PeopleSection locale={locale} dict={dict} standalone />
    </>
  );
}
