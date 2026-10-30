"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- full page loads on purpose: the router may be what failed. */

import { Poppins } from "next/font/google";
import { useEffect } from "react";
import { reportError } from "@/lib/report-error";
import en from "@/i18n/en.json";
import hi from "@/i18n/hi.json";
import "./globals.css";

// Same face as the root layout, which this page replaces.
const poppins = Poppins({ subsets: ["latin", "devanagari"], weight: ["400", "500", "600"], variable: "--font-poppins" });

/**
 * Last-resort error page, used when the root layout (/[locale]/layout.tsx) itself fails.
 * It replaces that layout, so it renders its own document. The locale is unknown
 * here, so both languages are shown, and links are plain <a> tags in case the
 * client router is what broke.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <html lang="en" className={poppins.variable} data-scroll-behavior="smooth">
      <body className="min-h-dvh bg-paper text-ink">
        <title>{`${en.error.title} · ${en.brand}`}</title>
        <main className="mx-auto max-w-[720px] px-4 py-32 sm:px-8">
          <p className="text-sm font-medium text-accent">{en.brand}</p>
          <h1 className="mt-2 text-[clamp(36px,5vw,60px)] leading-tight font-semibold tracking-[-.04em]">
            {en.error.title}
            <br />
            <span lang="hi">{hi.error.title}</span>
          </h1>
          <p className="mt-4 text-muted">{en.error.body}</p>
          <p lang="hi" className="mt-2 text-muted">
            {hi.error.body}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => retry()}
              className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-accent"
            >
              {en.error.retry} · <span lang="hi">{hi.error.retry}</span>
            </button>
            <a href="/" className="rounded-full border border-ink/20 px-6 py-3 text-sm font-medium hover:bg-ink/5">
              {en.error.home}
            </a>
          </div>
          <p className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
            <a href="/en/emergency" className="text-warn-fg underline underline-offset-2">
              {en.error.emergency}
            </a>
            <a href="/hi/emergency" lang="hi" className="text-warn-fg underline underline-offset-2">
              {hi.error.emergency}
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
