import { EmergencySection } from "@/components/sections";
import { pageMetadata, resolveLocale } from "@/lib/page";

export function generateMetadata({ params }: PageProps<"/[locale]/emergency">) {
  return pageMetadata(params, "/emergency", (dict) => ({
    title: dict.sections.emergency,
    description: dict.sections.emergencyNote,
  }));
}

/** Cached by public/sw.js so it opens without a connection. */
export default async function Page({ params }: PageProps<"/[locale]/emergency">) {
  const { locale, dict } = await resolveLocale(params);
  return (
    <div className="-mt-28 -mb-28">
      <EmergencySection locale={locale} dict={dict} standalone />
    </div>
  );
}
