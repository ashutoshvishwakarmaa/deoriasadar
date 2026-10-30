import { Container } from "@/components/ui";
import en from "@/i18n/en.json";
import hi from "@/i18n/hi.json";

/**
 * Shown while a page that is not prerendered or prefetched yet streams in. Loading UI
 * receives no params, so the screen-reader text carries both languages.
 */
export default function Loading() {
  return (
    <Container className="py-16 sm:py-20">
      <div role="status" aria-live="polite" className="animate-pulse motion-reduce:animate-none">
        <span className="sr-only">
          {en.status.loading} <span lang="hi">{hi.status.loading}</span>
        </span>
        <div aria-hidden className="h-3 w-24 rounded-full bg-ink/10" />
        <div aria-hidden className="mt-5 h-12 w-[min(560px,80%)] rounded-2xl bg-ink/10" />
        <div aria-hidden className="mt-6 h-4 w-[min(480px,70%)] rounded-full bg-ink/5" />
        <div aria-hidden className="mt-3 h-4 w-[min(420px,60%)] rounded-full bg-ink/5" />
        <div aria-hidden className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-[4/3] rounded-[20px] bg-ink/5" />
          ))}
        </div>
      </div>
    </Container>
  );
}
