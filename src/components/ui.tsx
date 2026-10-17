import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { t, type Dictionary, type Locale } from "@/lib/i18n";
import type { Photo } from "@/lib/schema";

/**
 * A credited, optimized photo filling its container. The credit chip links to
 * the Commons file page, which satisfies the CC BY / BY-SA attribution terms.
 */
export function CityPhoto({
  photo,
  locale,
  sizes,
  priority,
  className = "",
  imageClassName = "",
  creditLabel,
  linkCredit = true,
}: {
  photo: Photo;
  locale: Locale;
  sizes: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  creditLabel: string;
  /** Set false when the photo sits inside another link (cards); credits stay on the detail and About pages. */
  linkCredit?: boolean;
}) {
  const credit = `${creditLabel}: ${photo.author} · ${photo.license}`;
  return (
    <figure className={`relative m-0 overflow-hidden bg-sand ${className}`}>
      <Image
        src={photo.src}
        alt={t(photo.caption, locale)}
        fill
        sizes={sizes}
        priority={priority}
        className={`${photo.fit === "contain" ? "object-contain" : "object-cover"} ${imageClassName}`}
        style={photo.focus ? { objectPosition: photo.focus } : undefined}
      />
      <figcaption className="absolute right-2 bottom-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-ink/55 px-2.5 py-1 text-[10px] text-paper backdrop-blur-sm">
        {linkCredit ? (
          <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer license" className="hover:underline">
            {credit}
          </a>
        ) : (
          credit
        )}
      </figcaption>
    </figure>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-[1240px] px-4 sm:px-8 ${className}`}>{children}</div>;
}

export function SectionHeader({
  title,
  aside,
  href,
  linkLabel,
  as: Tag = "h2",
}: {
  title: string;
  aside?: ReactNode;
  href?: string;
  linkLabel?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <Tag data-reveal className="section-title">
        {title}
      </Tag>
      {aside}
      {href && linkLabel && (
        <Link href={href} className="group text-sm font-medium text-muted hover:text-accent">
          {linkLabel} <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
        </Link>
      )}
    </div>
  );
}

export function VerifiedBadge({ verified, dict }: { verified: boolean; dict: Dictionary["badges"] }) {
  return (
    <span
      className={`rounded-full px-2 py-[3px] text-[11px] font-medium ${
        verified ? "bg-ok-bg text-ok-fg" : "bg-warn-bg text-warn-fg"
      }`}
    >
      {verified ? dict.verified : dict.recheck}
    </span>
  );
}

export function PhotoPlaceholder({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`hatch flex items-end overflow-hidden rounded-2xl p-3.5 ${className}`} role="img" aria-label={label}>
      <span className="font-mono text-[11px] text-muted-2">photo — {label}</span>
    </div>
  );
}

export function PageIntro({ kicker, title, children }: { kicker?: string; title: string; children?: ReactNode }) {
  // Wide letter-spacing breaks Devanagari conjuncts, so it only applies to Latin kickers.
  const latin = !/[ऀ-ॿ]/.test(kicker ?? "");
  return (
    <Container className="pt-16 pb-4 sm:pt-20">
      {kicker && (
        <div className="mb-4 flex items-center gap-3">
          <span className="h-px w-6 bg-accent" aria-hidden />
          <span className={`text-[12.5px] font-medium text-muted-2 uppercase ${latin ? "tracking-[.14em]" : ""}`}>{kicker}</span>
        </div>
      )}
      <h1 className="text-[clamp(40px,6vw,76px)] leading-[.95] font-semibold tracking-[-.045em]">{title}</h1>
      {children && <div className="mt-6 max-w-[680px] text-[17px] leading-relaxed font-light text-ink-2">{children}</div>}
    </Container>
  );
}
