"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { reportError } from "@/lib/report-error";
import { Container } from "@/components/ui";
import { defaultLocale, getDictionary, hasLocale } from "@/lib/i18n";

/**
 * Shown when a page under /[locale] throws while rendering. The header, footer
 * and chat (from the layout) stay usable. The emergency link matters most: that
 * page is saved for offline use, so it works even when the rest of the site does not.
 */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale && hasLocale(params.locale) ? params.locale : defaultLocale;
  const d = getDictionary(locale).error;
  // Server errors arrive without their message (hidden in production) but with a digest that matches the server log.
  const digest = typeof error === "object" && error && "digest" in error ? String(error.digest) : undefined;

  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <Container className="py-32">
      <p className="text-sm font-medium text-accent">500</p>
      <h1 className="mt-2 text-[clamp(40px,6vw,72px)] font-semibold tracking-[-.045em]">{d.title}</h1>
      <p className="mt-4 max-w-[480px] text-muted">{d.body}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-accent"
        >
          {d.retry}
        </button>
        <Link href={`/${locale}`} className="rounded-full border border-ink/20 px-6 py-3 text-sm font-medium hover:bg-ink/5">
          {d.home}
        </Link>
      </div>
      <p className="mt-10">
        <Link href={`/${locale}/emergency`} className="text-sm font-medium text-warn-fg underline underline-offset-2">
          {d.emergency}
        </Link>
      </p>
      {digest && (
        <p className="mt-6 text-xs text-faint">
          {d.code}: {digest}
        </p>
      )}
    </Container>
  );
}
