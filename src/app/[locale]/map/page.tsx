import { MapSection } from "@/components/map/map-section";
import { pageMetadata, resolveLocale } from "@/lib/page";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbs } from "@/lib/structured-data";

export function generateMetadata({ params }: PageProps<"/[locale]/map">) {
  return pageMetadata(params, "/map", (dict) => ({ title: dict.sections.map }));
}

export default async function Page({ params }: PageProps<"/[locale]/map">) {
  const { locale, dict } = await resolveLocale(params);
  return (
    <>
      <JsonLd data={[breadcrumbs(locale, [{ name: dict.nav.map, path: `/${locale}/map` }])]} />
      <MapSection locale={locale} dict={dict} standalone />
    </>
  );
}
