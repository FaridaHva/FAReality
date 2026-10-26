import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { LocaleSwitcher } from "./LocaleSwitcher";

function Logo({ locale }: { locale: Locale }) {
  return (
    <Link href={`/${locale}`} className="flex items-center gap-2">
      <Image src="/logo.png" alt="" width={28} height={28} />
      <span className="text-lg font-semibold tracking-tight">FAReality</span>
    </Link>
  );
}

export function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const links = [
    [`/${locale}#catalog`, dict.nav.catalog],
    [`/${locale}#how`, dict.nav.how],
    [`/${locale}#business`, dict.nav.business],
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6">
        <Logo locale={locale} />
        <nav className="hidden gap-6 text-sm text-muted md:flex">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="transition hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Suspense>
            <LocaleSwitcher current={locale} />
          </Suspense>
          <Link
            href={`/${locale}#business`}
            className="hidden rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink/85 sm:block"
          >
            {dict.nav.cta}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <footer className="mt-24 overflow-hidden border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-[2fr_1fr_1fr] sm:px-6">
        <div>
          <Logo locale={locale} />
          <p className="mt-3 max-w-xs text-muted">{dict.footer.tagline}</p>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted">{dict.footer.explore}</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href={`/${locale}#catalog`} className="hover:text-accent">
                {dict.nav.catalog}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}#how`} className="hover:text-accent">
                {dict.nav.how}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}#business`} className="hover:text-accent">
                {dict.nav.business}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-muted">{dict.footer.language}</p>
          <Suspense>
            <LocaleSwitcher current={locale} />
          </Suspense>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl justify-between px-4 font-mono text-[11px] text-muted sm:px-6">
        <span>© FAReality</span>
        <span>{dict.footer.rights}</span>
      </div>
      <p
        aria-hidden
        className="-mb-[3.5vw] mt-6 select-none text-center text-[21vw] font-semibold leading-[0.8] tracking-[-0.06em] text-ink/[0.045]"
      >
        FAReality
      </p>
    </footer>
  );
}
