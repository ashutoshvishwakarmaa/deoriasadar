import { TransportSection } from "@/components/sections";
import { pageMetadata, resolveLocale } from "@/lib/page";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbs } from "@/lib/structured-data";

export function generateMetadata({ params }: PageProps<"/[locale]/transport">) {
  return pageMetadata(params, "/transport", (dict) => ({ title: dict.sections.transport }));
}

export default async function Page({ params }: PageProps<"/[locale]/transport">) {
  const { locale, dict } = await resolveLocale(params);
  return (
    <>
      <JsonLd data={[breadcrumbs(locale, [{ name: dict.nav.transport, path: `/${locale}/transport` }])]} />
      <TransportSection locale={locale} dict={dict} standalone />
    </>
  );
}
