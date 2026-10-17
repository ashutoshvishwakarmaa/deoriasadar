import { HistorySection } from "@/components/sections";
import { PageIntro } from "@/components/ui";
import { pageMetadata, resolveLocale } from "@/lib/page";

export function generateMetadata({ params }: PageProps<"/[locale]/history">) {
  return pageMetadata(params, "/history", (dict) => ({ title: dict.sections.timeline, description: dict.sections.nameKicker }));
}

export default async function Page({ params }: PageProps<"/[locale]/history">) {
  const { locale, dict } = await resolveLocale(params);
  return (
    <>
      <PageIntro title={dict.nav.history} />
      <div className="-mt-16">
        <HistorySection locale={locale} dict={dict} />
      </div>
    </>
  );
}
