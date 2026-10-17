import { TransportSection } from "@/components/sections";
import { pageMetadata, resolveLocale } from "@/lib/page";

export function generateMetadata({ params }: PageProps<"/[locale]/transport">) {
  return pageMetadata(params, "/transport", (dict) => ({ title: dict.sections.transport }));
}

export default async function Page({ params }: PageProps<"/[locale]/transport">) {
  const { locale, dict } = await resolveLocale(params);
  return <TransportSection locale={locale} dict={dict} standalone />;
}
