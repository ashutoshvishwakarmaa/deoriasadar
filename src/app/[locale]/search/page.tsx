import { Suspense } from "react";
import { SearchResults } from "@/components/search-results";
import { Container } from "@/components/ui";
import { pageMetadata, resolveLocale } from "@/lib/page";
import { searchIndex } from "@/lib/search";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbs } from "@/lib/structured-data";

export function generateMetadata({ params }: PageProps<"/[locale]/search">) {
  return pageMetadata(params, "/search", (dict) => ({ title: dict.search.title }));
}

export default async function Page({ params }: PageProps<"/[locale]/search">) {
  const { locale, dict } = await resolveLocale(params);
  return (
    <>
      <JsonLd data={[breadcrumbs(locale, [{ name: dict.search.title, path: `/${locale}/search` }])]} />
      <Container className="pt-16 sm:pt-20">
        <h1 className="mb-8 text-[clamp(40px,6vw,76px)] leading-[.95] font-semibold tracking-[-.045em]">{dict.search.title}</h1>
        {/* The query lives in the URL, so results render on the client, from the index shipped with the page. */}
        <Suspense fallback={<p className="text-muted">{dict.search.loading}</p>}>
          <SearchResults locale={locale} dict={dict.search} index={searchIndex[locale]} />
        </Suspense>
      </Container>
    </>
  );
}
