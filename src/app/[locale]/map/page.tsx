import { MapSection } from "@/components/map/map-section";
import { pageMetadata, resolveLocale } from "@/lib/page";

export function generateMetadata({ params }: PageProps<"/[locale]/map">) {
  return pageMetadata(params, "/map", (dict) => ({ title: dict.sections.map }));
}

export default async function Page({ params }: PageProps<"/[locale]/map">) {
  const { locale, dict } = await resolveLocale(params);
  return <MapSection locale={locale} dict={dict} standalone />;
}
