import { PeopleSection } from "@/components/sections";
import { pageMetadata, resolveLocale } from "@/lib/page";

export function generateMetadata({ params }: PageProps<"/[locale]/people">) {
  return pageMetadata(params, "/people", (dict) => ({ title: dict.sections.people }));
}

export default async function Page({ params }: PageProps<"/[locale]/people">) {
  const { locale, dict } = await resolveLocale(params);
  return <PeopleSection locale={locale} dict={dict} standalone />;
}
