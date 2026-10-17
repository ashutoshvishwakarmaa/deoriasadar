import Link from "next/link";
import { Container } from "@/components/ui";
import { getDictionary } from "@/lib/i18n";

// not-found receives no params; English is the safe default.
export default function NotFound() {
  const dict = getDictionary("en");
  return (
    <Container className="py-32">
      <p className="text-sm font-medium text-accent">404</p>
      <h1 className="mt-2 text-[clamp(40px,6vw,72px)] font-semibold tracking-[-.045em]">{dict.notFound.title}</h1>
      <p className="mt-4 max-w-[480px] text-muted">
        {dict.notFound.body}
        <br />
        <span lang="hi">{getDictionary("hi").notFound.body}</span>
      </p>
      <Link href="/" className="mt-8 inline-block rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-accent">
        {dict.notFound.home}
      </Link>
    </Container>
  );
}
