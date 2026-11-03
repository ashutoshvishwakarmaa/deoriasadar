import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { notFound } from "next/navigation";
import { Analytics } from "@/components/analytics";
import { ChatWidget } from "@/components/chat/chat-widget";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { OfflineStatus } from "@/components/offline-status";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { getDictionary, hasLocale, locales } from "@/lib/i18n";
import "../globals.css";

const poppins = Poppins({
  subsets: ["latin", "devanagari"],
  // Only the weights in use (font-light/normal/medium/semibold); each is a preloaded file per script.
  weight: ["300", "400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { default: dict.meta.title, template: `%s · ${dict.brand}` },
    description: dict.meta.description,
    applicationName: dict.brand,
    alternates: {
      canonical: `/${locale}`,
      languages: { en: "/en", hi: "/hi", "x-default": "/en" },
    },
    openGraph: {
      type: "website",
      siteName: dict.brand,
      title: dict.meta.title,
      description: dict.meta.description,
      locale: locale === "hi" ? "hi_IN" : "en_IN",
    },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  themeColor: "#1a1813",
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    // data-scroll-behavior lets Next.js turn smooth scrolling (globals.css) off during page changes.
    <html lang={locale} className={poppins.variable} data-scroll-behavior="smooth">
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {dict.nav.skip}
        </a>
        <Header locale={locale} dict={{ brand: dict.brand, nav: dict.nav }} />
        <main id="main">{children}</main>
        <Footer locale={locale} dict={dict} />
        <ChatWidget locale={locale} dict={dict.chat} />
        <OfflineStatus locale={locale} dict={dict.offline} />
        <ServiceWorkerRegister />
        {process.env.NEXT_PUBLIC_VERCEL_ENV && <Analytics />}
      </body>
    </html>
  );
}
