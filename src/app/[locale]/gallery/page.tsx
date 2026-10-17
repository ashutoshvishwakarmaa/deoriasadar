import { GallerySection } from "@/components/sections";
import { pageMetadata, resolveLocale } from "@/lib/page";

export function generateMetadata({ params }: PageProps<"/[locale]/gallery">) {
  return pageMetadata(params, "/gallery", (dict) => ({ title: dict.sections.gallery, description: dict.sections.galleryNote }));
}

export default async function Page({ params }: PageProps<"/[locale]/gallery">) {
  const { locale, dict } = await resolveLocale(params);
  return <GallerySection locale={locale} dict={dict} standalone />;
}
