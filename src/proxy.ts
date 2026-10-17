import { NextResponse, type NextRequest } from "next/server";
import placesJson from "@/data/places.json";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { isUnknownPlacePath } from "@/lib/place-path";

const placeSlugs = new Set(placesJson.map((p) => p.slug));

/** Pick the first supported language from Accept-Language, honouring q-values. */
function preferredLocale(header: string | null): Locale {
  if (!header) return defaultLocale;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { lang } of ranked) if (hasLocale(lang)) return lang;
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if (hasLocale(first)) {
    // Unknown place slugs (e.g. a place that was removed) get a real 404 status. The page itself can
    // only call notFound() after streaming has started, which would leave the status at 200.
    if (isUnknownPlacePath(pathname, placeSlugs)) {
      return NextResponse.rewrite(new URL(`/${first}/place-not-found`, request.url), { status: 404 });
    }
    return;
  }

  const cookieLocale = request.cookies.get("locale")?.value;
  const locale = cookieLocale && hasLocale(cookieLocale) ? cookieLocale : preferredLocale(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API routes, Next internals and any path with a file extension (icons, sw.js, images…).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
