"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";

export function LocaleSwitcher({ current }: { current: Locale }) {
  // Keep the visitor on the same page, swapping only the locale prefix.
  const rest = usePathname().replace(/^\/[a-z]{2}(?=\/|$)/, "");
  return (
    <nav className="flex rounded-full border border-line bg-surface p-0.5 font-mono text-[11px] uppercase">
      {locales.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest}`}
          aria-current={l === current ? "true" : undefined}
          className={`rounded-full px-2.5 py-1 transition ${
            l === current ? "bg-ink text-white" : "text-muted hover:text-ink"
          }`}
        >
          {l}
        </Link>
      ))}
    </nav>
  );
}
