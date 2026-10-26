import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

export default async function NotFound() {
  const locale = await getLocale();
  const dict = await getDictionary();

  return (
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="mt-3 text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">{dict.notFound.title}</h1>
      <p className="mt-4 max-w-md text-lg text-muted">{dict.notFound.text}</p>
      <Link
        href={`/${locale}#catalog`}
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-white transition hover:bg-ink/85"
      >
        <ArrowLeft className="size-4" strokeWidth={1.75} />
        {dict.notFound.back}
      </Link>
    </div>
  );
}
