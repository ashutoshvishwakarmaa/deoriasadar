import { GovernanceSection } from "@/components/sections";
import { pageMetadata, resolveLocale } from "@/lib/page";

export function generateMetadata({ params }: PageProps<"/[locale]/governance">) {
  return pageMetadata(params, "/governance", (dict) => ({ title: dict.sections.governance }));
}

export default async function Page({ params }: PageProps<"/[locale]/governance">) {
  const { locale, dict } = await resolveLocale(params);
  return <GovernanceSection locale={locale} dict={dict} standalone />;
}
