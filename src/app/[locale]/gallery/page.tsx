import { GallerySection } from "@/components/sections";
import { pageMetadata, resolveLocale } from "@/lib/page";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbs } from "@/lib/structured-data";

export function generateMetadata({ params }: PageProps<"/[locale]/gallery">) {
  return pageMetadata(params, "/gallery", (dict) => ({ title: dict.sections.gallery, description: dict.sections.galleryNote }));
}

export default async function Page({ params }: PageProps<"/[locale]/gallery">) {
  const { locale, dict } = await resolveLocale(params);
  return (
    <>
      <JsonLd data={[breadcrumbs(locale, [{ name: dict.nav.gallery, path: `/${locale}/gallery` }])]} />
      <GallerySection locale={locale} dict={dict} standalone />
    </>
  );
}
