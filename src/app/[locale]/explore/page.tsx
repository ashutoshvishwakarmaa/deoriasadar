import { PlaceCard } from "@/components/sections";
import { Container, PageIntro } from "@/components/ui";
import { mapCategories, placesIn } from "@/lib/data";
import { pageMetadata, resolveLocale } from "@/lib/page";

export function generateMetadata({ params }: PageProps<"/[locale]/explore">) {
  return pageMetadata(params, "/explore", (dict) => ({ title: dict.sections.places }));
}

export default async function Page({ params }: PageProps<"/[locale]/explore">) {
  const { locale, dict } = await resolveLocale(params);
  return (
    <>
      <PageIntro kicker={dict.nav.explore} title={dict.sections.places} />
      {mapCategories.map((category) => {
        const items = placesIn(category);
        if (items.length === 0) return null;
        return (
          <Container key={category} className="pt-16">
            <h2 data-reveal className="border-b border-ink pb-3 text-2xl font-semibold tracking-[-.03em]">
              {dict.map.layers[category]}
            </h2>
            <div data-reveal-stagger className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-7">
              {items.map((p) => (
                <PlaceCard key={p.slug} place={p} locale={locale} />
              ))}
            </div>
          </Container>
        );
      })}
    </>
  );
}
