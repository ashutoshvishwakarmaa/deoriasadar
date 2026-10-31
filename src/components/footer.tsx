import Link from "next/link";
import type { Dictionary, Locale } from "@/lib/i18n";
import { Container } from "./ui";

const LINKS = [
  "explore",
  "history",
  "people",
  "governance",
  "transport",
  "map",
  "emergency",
  "culture",
  "gallery",
  "about",
] as const;

export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    // The bottom padding keeps the last links clear of the fixed "Ask about Deoria" button.
    <footer className="mt-24 border-t border-ink/10">
      <Container className="flex flex-wrap items-end justify-between gap-8 pt-10 pb-20 sm:pb-24">
        <span className="text-[clamp(40px,6vw,76px)] leading-[.9] font-semibold tracking-[-.05em]">{dict.home.heroBig}</span>
        <div className="flex flex-col justify-end gap-4 text-[13px] text-muted-2">
          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 gap-x-8 gap-y-0.5 sm:grid-cols-3">
              {LINKS.map((key) => (
                <li key={key}>
                  {/* At least 24px tall: WCAG 2.2 target size, so neighbouring links are easy to tap. */}
                  <Link href={`/${locale}/${key}`} className="inline-flex min-h-6 items-center hover:text-accent">
                    {dict.nav[key]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex flex-col gap-1">
            <span>{dict.footer.sourced}</span>
            <Link href={`/${locale}/about#correction`} className="inline-flex min-h-6 items-center text-ink hover:text-accent">
              {dict.footer.suggest}
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
