"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Dictionary, Locale } from "@/lib/i18n";

const NAV_KEYS = ["explore", "history", "people", "governance", "transport", "map", "emergency", "gallery"] as const;

export function Header({ locale, dict }: { locale: Locale; dict: Pick<Dictionary, "brand" | "nav"> }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false });

  const segment = pathname.split("/")[2] ?? "";
  const active = (NAV_KEYS as readonly string[]).includes(segment) ? segment : null;
  const otherLocale: Locale = locale === "en" ? "hi" : "en";
  const switchHref = `/${otherLocale}${pathname.slice(locale.length + 1)}`;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu after navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useLayoutEffect(() => {
    const measure = () => {
      const el = active ? navRef.current?.querySelector<HTMLElement>(`[data-key="${active}"]`) : null;
      setIndicator(el ? { left: el.offsetLeft, width: el.offsetWidth, visible: true } : (s) => ({ ...s, visible: false }));
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active, locale]);

  const rememberLocale = () => {
    document.cookie = `locale=${otherLocale}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <header
      className={`sticky top-0 z-30 border-b border-ink/10 bg-paper/90 backdrop-blur-md transition-shadow duration-300 ${
        scrolled ? "shadow-[0_4px_24px_rgba(26,24,19,.08)]" : ""
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-7 px-4 sm:h-[68px] sm:px-8">
        <Link href={`/${locale}`} className="flex shrink-0 items-center gap-2.5 text-lg font-semibold tracking-tight">
          <span className="size-2.5 rounded-full bg-accent" aria-hidden />
          {dict.brand}
        </Link>

        <nav
          ref={navRef}
          aria-label="Main"
          className="relative hidden flex-1 self-stretch gap-[clamp(12px,1.6vw,22px)] text-sm whitespace-nowrap lg:flex"
        >
          {NAV_KEYS.map((key) => (
            <Link
              key={key}
              data-key={key}
              href={`/${locale}/${key}`}
              aria-current={active === key ? "page" : undefined}
              className={`flex items-center transition-colors hover:text-ink ${active === key ? "font-semibold text-ink" : "text-muted"}`}
            >
              {dict.nav[key]}
            </Link>
          ))}
          <span
            aria-hidden
            className="absolute -bottom-px h-0.5 bg-ink transition-[left,width,opacity] duration-300 ease-out-expo"
            style={{ left: indicator.left, width: indicator.width, opacity: indicator.visible ? 1 : 0 }}
          />
        </nav>

        <div className="ml-auto flex items-center gap-3 lg:ml-0">
          <div className="flex rounded-full border border-ink/20 p-[3px] text-[13px]" role="group" aria-label="Language">
            {(["en", "hi"] as const).map((l) =>
              l === locale ? (
                <span key={l} aria-current="true" className="rounded-full bg-ink px-3 py-[5px] font-medium text-paper">
                  {l === "en" ? "EN" : "हिन्दी"}
                </span>
              ) : (
                <Link
                  key={l}
                  href={switchHref}
                  // Rarely used; prefetching the other language on every page load wasted mobile data.
                  prefetch={false}
                  onClick={rememberLocale}
                  hrefLang={l}
                  lang={l}
                  className="rounded-full px-3 py-[5px] font-medium transition-colors hover:bg-ink/5"
                >
                  {l === "en" ? "EN" : "हिन्दी"}
                </Link>
              ),
            )}
          </div>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-full border border-ink/20 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? dict.nav.close : dict.nav.menu}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="relative block h-3 w-4" aria-hidden>
              <span className={`absolute left-0 h-0.5 w-4 bg-ink transition-transform ${open ? "top-1.5 rotate-45" : "top-0"}`} />
              <span className={`absolute top-1.5 left-0 h-0.5 w-4 bg-ink transition-opacity ${open ? "opacity-0" : ""}`} />
              <span
                className={`absolute left-0 h-0.5 w-4 bg-ink transition-transform ${open ? "top-1.5 -rotate-45" : "top-3"}`}
              />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-ink/10 px-4 pb-5 sm:px-8 lg:hidden">
          <ul className="grid grid-cols-2 gap-1 pt-3">
            {[...NAV_KEYS, "culture" as const, "about" as const].map((key) => (
              <li key={key}>
                <Link
                  href={`/${locale}/${key}`}
                  aria-current={segment === key ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2.5 text-[15px] ${segment === key ? "bg-ink/5 font-semibold" : "text-muted"}`}
                >
                  {dict.nav[key]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
