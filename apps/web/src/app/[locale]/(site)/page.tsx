import { ArrowRight, ArrowUpRight, Check, Link2, MessageCircle, Search, Smartphone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { IsoBox, ShowroomTag } from "@/components/BusinessVisuals";
import { CatalogGrid } from "@/components/CatalogGrid";
import { ModelViewer } from "@/components/ModelViewer";
import { ProductCard } from "@/components/ProductCard";
import { formatPrice, localized, type Locale } from "@/i18n/config";
import { getDictionary, getLocale, type Dictionary } from "@/i18n/dictionaries";
import { getFeaturedProduct, getPublishedProducts, type CatalogProduct } from "@/lib/catalog";
import { alternatesFor, siteUrl } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  return { alternates: alternatesFor("", await getLocale()) };
}

export default async function HomePage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const [products, featured] = await Promise.all([getPublishedProducts(), getFeaturedProduct()]);

  return (
    <>
      <Hero locale={locale} dict={dict} featured={featured} />
      <HowItWorks dict={dict} />

      <section id="catalog" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-24 sm:px-6">
        <h2 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
          {dict.catalog.title}
          <sup className="ml-2 font-mono text-base font-normal tracking-normal text-muted">{products.length}</sup>
        </h2>
        <CatalogGrid
          items={products.map((p) => ({
            id: p.id,
            category: p.category?.slug ?? null,
            size: { width: p.widthCm, depth: p.depthCm, height: p.heightCm },
            card: (
              <ProductCard
                product={p}
                locale={locale}
                labels={{ priceOnRequest: dict.product.priceOnRequest, no3d: dict.product.no3d }}
              />
            ),
          }))}
          categories={[
            ...new Map(
              products.flatMap((p) => (p.category ? [[p.category.slug, localized(p.category.name, locale)]] : [])),
            ),
          ].map(([slug, name]) => ({ slug, name }))}
          labels={{ all: dict.catalog.all, empty: dict.catalog.empty, fit: dict.catalog.fit }}
        />
      </section>

      <Business locale={locale} dict={dict} featured={featured} />
    </>
  );
}

function Hero({ locale, dict, featured }: { locale: Locale; dict: Dictionary; featured: CatalogProduct | null }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:pt-12">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted">
            <span className="size-1.5 rounded-full bg-accent" />
            {dict.hero.eyebrow}
          </p>
          <h1 className="mt-5 text-[clamp(2.75rem,6.5vw,5.75rem)] font-semibold leading-[0.95] tracking-[-0.045em]">
            {dict.hero.title}
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">{dict.hero.subtitle}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href="#catalog"
              className="flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-white transition hover:bg-ink/85"
            >
              {dict.hero.primary}
              <ArrowRight className="size-4" strokeWidth={1.75} />
            </a>
            <a
              href="#how"
              className="rounded-full border border-line bg-surface px-6 py-3.5 text-sm font-medium transition hover:border-ink/40"
            >
              {dict.hero.secondary}
            </a>
          </div>
        </div>

        {featured?.model?.glbUrl && (
          <div className="stage relative aspect-[4/3.4] overflow-hidden rounded-[2rem]">
            <ModelViewer
              variant="hero"
              className="h-full w-full"
              src={featured.model.glbUrl}
              poster={featured.model.posterUrl}
              iosSrc={featured.model.usdzUrl}
              alt={localized(featured.name, locale)}
              size={{ width: featured.widthCm, depth: featured.depthCm, height: featured.heightCm }}
              labels={{
                viewInRoom: dict.product.viewInRoom,
                dragHint: dict.product.dragHint,
                dimensions: dict.product.dimensions,
                fullscreen: dict.product.fullscreen,
              }}
            />
            <Link
              href={`/${locale}/brands/${featured.company.slug}/${featured.slug}`}
              className="group absolute left-4 top-4 flex max-w-[calc(100%-9.5rem)] items-center gap-4 rounded-2xl bg-white/85 p-3 pl-4 backdrop-blur-md transition hover:bg-white sm:min-w-64"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-wider text-accent">{dict.hero.featured}</p>
                <p className="truncate font-medium">{localized(featured.name, locale)}</p>
                <p className="truncate text-xs text-muted">
                  {featured.company.name} ·{" "}
                  {featured.priceAzn ? formatPrice(featured.priceAzn, locale) : dict.product.priceOnRequest}
                </p>
              </div>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-white transition group-hover:bg-accent">
                <ArrowUpRight className="size-4" strokeWidth={1.75} />
              </span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function HowItWorks({ dict }: { dict: Dictionary }) {
  const icons = [Search, Smartphone, MessageCircle];
  return (
    <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-24 sm:px-6">
      <h2 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{dict.how.title}</h2>
      <ol className="mt-10 grid gap-4 md:grid-cols-3">
        {dict.how.steps.map((step, i) => {
          const Icon = icons[i];
          return (
            <li key={step.title} className="flex flex-col rounded-3xl border border-line bg-surface p-7">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-muted">0{i + 1}</span>
                <span className="grid size-11 place-items-center rounded-full bg-accent-soft text-accent">
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
              </div>
              <h3 className="mt-12 text-xl font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{step.text}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

async function Business({ locale, dict, featured }: { locale: Locale; dict: Dictionary; featured: CatalogProduct | null }) {
  const b = dict.business;
  const featuredPath = featured ? `/${locale}/brands/${featured.company.slug}/${featured.slug}` : `/${locale}`;
  const qrSvg = await QRCode.toString(`${siteUrl}${featuredPath}`, {
    type: "svg",
    margin: 0,
    color: { dark: "#16150f", light: "#ffffff" },
  });
  const card = "rounded-3xl border border-white/10 bg-white/[0.05] p-7";

  return (
    <section id="business" className="scroll-mt-16 px-2 sm:px-4">
      <div className="mx-auto max-w-[90rem] rounded-[2.5rem] bg-ink px-4 py-20 text-white sm:px-10 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-accent-light">
            <span className="size-1.5 rounded-full bg-accent-light" />
            {b.eyebrow}
          </p>
          <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl">
            {b.title}
          </h2>
          <p className="mt-5 max-w-xl text-lg text-white/60">{b.subtitle}</p>

          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            <div className={`${card} flex flex-col gap-8 sm:flex-row sm:items-center lg:col-span-2`}>
              <div className="sm:max-w-xs">
                <h3 className="text-xl font-semibold tracking-tight">{b.models.title}</h3>
                <p className="mt-2 leading-relaxed text-white/60">{b.models.text}</p>
              </div>
              <div className="flex flex-1 justify-center">
                <IsoBox
                  width={`${featured?.widthCm ?? 165} cm`}
                  depth={`${featured?.depthCm ?? 62} cm`}
                  height={`${featured?.heightCm ?? 65} cm`}
                />
              </div>
            </div>

            <div className={`${card} flex flex-col lg:row-span-2`}>
              <h3 className="text-xl font-semibold tracking-tight">{b.qr.title}</h3>
              <p className="mt-2 leading-relaxed text-white/60">{b.qr.text}</p>
              <div className="flex flex-1 items-center justify-center py-10">
                <ShowroomTag
                  name={featured ? localized(featured.name, locale) : "FAReality"}
                  price={
                    featured?.priceAzn ? formatPrice(featured.priceAzn, locale) : dict.product.priceOnRequest
                  }
                  qrSvg={qrSvg}
                  caption={dict.product.viewInRoom}
                />
              </div>
            </div>

            <div className={card}>
              <h3 className="text-xl font-semibold tracking-tight">{b.link.title}</h3>
              <p className="mt-2 leading-relaxed text-white/60">{b.link.text}</p>
              <p className="mt-6 flex items-center gap-2 truncate rounded-full bg-white/10 px-4 py-2 font-mono text-xs text-white/80">
                <Link2 className="size-3.5 shrink-0" strokeWidth={1.75} />
                <span className="truncate">…{featuredPath}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {b.link.chips.map((c) => (
                  <span key={c} className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div className={card}>
              <h3 className="text-xl font-semibold tracking-tight">{b.qa.title}</h3>
              <p className="mt-2 leading-relaxed text-white/60">{b.qa.text}</p>
              <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {b.qa.checks.map((c) => (
                  <li key={c} className="flex items-center gap-2 text-white/80">
                    <Check className="size-4 text-accent-light" strokeWidth={2} />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {process.env.CONTACT_EMAIL && (
            <a
              href={`mailto:${process.env.CONTACT_EMAIL}`}
              className="mt-12 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-ink transition hover:bg-white/85"
            >
              {b.cta}
              <ArrowRight className="size-4" strokeWidth={1.75} />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
