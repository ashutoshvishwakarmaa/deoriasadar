import { Suspense } from "react";
import { SearchResults } from "@/components/search-results";
import { Container } from "@/components/ui";
import { pageMetadata, resolveLocale } from "@/lib/page";

export function generateMetadata({ params }: PageProps<"/[locale]/search">) {
  return pageMetadata(params, "/search", (dict) => ({ title: dict.search.title }));
}

export default async function Page({ params }: PageProps<"/[locale]/search">) {
  const { locale, dict } = await resolveLocale(params);
  return (
    <Container className="pt-16 sm:pt-20">
      <h1 className="mb-8 text-[clamp(40px,6vw,76px)] leading-[.95] font-semibold tracking-[-.045em]">{dict.search.title}</h1>
      {/* The query lives in the URL, so results render on the client inside a Suspense boundary. */}
      <Suspense fallback={<p className="text-muted">{dict.search.loading}</p>}>
        <SearchResults locale={locale} dict={dict.search} />
      </Suspense>
    </Container>
  );
}
