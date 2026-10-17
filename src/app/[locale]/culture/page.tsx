import { CultureSection } from "@/components/sections";
import { pageMetadata, resolveLocale } from "@/lib/page";

export function generateMetadata({ params }: PageProps<"/[locale]/culture">) {
  return pageMetadata(params, "/culture", (dict) => ({ title: dict.sections.culture }));
}

export default async function Page({ params }: PageProps<"/[locale]/culture">) {
  const { locale, dict } = await resolveLocale(params);
  return <CultureSection locale={locale} dict={dict} standalone />;
}
