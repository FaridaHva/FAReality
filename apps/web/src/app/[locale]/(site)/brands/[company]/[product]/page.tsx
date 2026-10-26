import { ArrowUpRight, Check, ChevronRight, MapPin, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Suspense } from "react";
import { ModelViewer } from "@/components/ModelViewer";
import { ProductCard } from "@/components/ProductCard";
import { fill, formatPrice, localized, type Locale } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { getCompanyProducts, getProduct, getPublishedProducts, type CatalogProduct } from "@/lib/catalog";
import { alternatesFor, ogLocale, siteUrl } from "@/lib/site";

type Props = PageProps<"/[locale]/brands/[company]/[product]">;

export async function generateStaticParams() {
  const products = await getPublishedProducts();
  return products.map((p) => ({ company: p.company.slug, product: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { company, product } = await params;
  const data = await getProduct(company, product);
  if (!data) return {};
  const locale = await getLocale();
  const dict = await getDictionary();
  const title = `${localized(data.name, locale)} — ${data.company.name}`;
  const description = localized(data.description, locale) || dict.meta.description;
  const path = `/brands/${company}/${product}`;
  return {
    title,
    description,
    alternates: alternatesFor(path, locale),
    // Repeats the layout's fields: openGraph objects replace, they don't merge.
    openGraph: { title, description, url: `/${locale}${path}`, siteName: "FAReality", type: "website", locale: ogLocale[locale] },
  };
}

/** schema.org Product, so search engines can show price and photo in results. */
function productJsonLd(product: CatalogProduct, locale: Locale, url: string) {
  const cm = (value: number | null) => (value ? { "@type": "QuantitativeValue", value, unitCode: "CMT" } : undefined);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: localized(product.name, locale),
    description: localized(product.description, locale) || undefined,
    image: product.model?.posterUrl ? `${siteUrl}${product.model.posterUrl}` : undefined,
    brand: { "@type": "Brand", name: product.company.name },
    category: product.category ? localized(product.category.name, locale) : undefined,
    width: cm(product.widthCm),
    depth: cm(product.depthCm),
    height: cm(product.heightCm),
    offers: product.priceAzn
      ? { "@type": "Offer", price: product.priceAzn, priceCurrency: "AZN", url, seller: { "@type": "Organization", name: product.company.name } }
      : undefined,
  };
}

export default function ProductPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="stage h-[70vh] animate-pulse rounded-[2rem]" />
        </div>
      }
    >
      <ProductDetails params={params} />
    </Suspense>
  );
}

async function ProductDetails({ params }: Pick<Props, "params">) {
  const { company, product: slug } = await params;
  const product = await getProduct(company, slug);
  if (!product) notFound();

  const locale = await getLocale();
  const dict = await getDictionary();
  const name = localized(product.name, locale);
  const price = product.priceAzn ? formatPrice(product.priceAzn, locale) : dict.product.priceOnRequest;
  const pageUrl = `${siteUrl}/${locale}/brands/${company}/${slug}`;
  const qr = await QRCode.toString(pageUrl, { type: "svg", margin: 0, color: { dark: "#16150f", light: "#0000" } });
  const others = (await getCompanyProducts(company)).filter((p) => p.id !== product.id).slice(0, 4);
  const whatsappHref = product.company.whatsapp
    ? `https://wa.me/${product.company.whatsapp}?text=${encodeURIComponent(
        fill(dict.product.whatsappMessage, { name, url: pageUrl }),
      )}`
    : null;
  const dims = [
    [dict.product.width, product.widthCm],
    [dict.product.depth, product.depthCm],
    [dict.product.height, product.heightCm],
  ] as const;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 sm:px-6 lg:pb-0">
      <script
        type="application/ld+json"
        // Escape "<" so product text can never close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product, locale, pageUrl)).replace(/</g, "\\u003c") }}
      />
      <nav className="flex items-center gap-1.5 py-5 font-mono text-[11px] uppercase tracking-wider text-muted">
        <Link href={`/${locale}#catalog`} className="shrink-0 hover:text-ink">
          {dict.nav.catalog}
        </Link>
        <ChevronRight className="size-3 shrink-0" />
        <Link href={`/${locale}/brands/${company}`} className="shrink-0 whitespace-nowrap hover:text-ink">
          {product.company.name}
        </Link>
        <ChevronRight className="size-3 shrink-0" />
        <span className="truncate text-ink">{name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
        <div className="stage relative aspect-square overflow-hidden rounded-[2rem] sm:aspect-[4/3] lg:sticky lg:top-20 lg:aspect-auto lg:h-[calc(100dvh-7.5rem)]">
          {product.model?.glbUrl ? (
            <ModelViewer
              className="h-full w-full"
              src={product.model.glbUrl}
              iosSrc={product.model.usdzUrl}
              poster={product.model.posterUrl}
              alt={name}
              size={{ width: product.widthCm, depth: product.depthCm, height: product.heightCm }}
              labels={{
                viewInRoom: dict.product.viewInRoom,
                dragHint: dict.product.dragHint,
                dimensions: dict.product.dimensions,
                fullscreen: dict.product.fullscreen,
              }}
            />
          ) : (
            <p className="flex h-full items-center justify-center text-muted">{dict.product.no3d}</p>
          )}
        </div>

        <div className="lg:py-2">
          {product.category && (
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
              {localized(product.category.name, locale)}
            </p>
          )}
          <h1 className="mt-2 text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl">{name}</h1>
          <p className="mt-4 text-2xl font-medium">{price}</p>
          {product.description && (
            <p className="mt-6 leading-relaxed text-muted">{localized(product.description, locale)}</p>
          )}

          <section className="mt-8 border-t border-line pt-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold">{dict.product.dimensions}</h2>
              {product.model?.glbUrl && (
                <span className="flex items-center gap-1 font-mono text-[11px] text-accent">
                  <Check className="size-3.5" strokeWidth={2} />
                  {dict.product.trueToSize}
                </span>
              )}
            </div>
            <dl className="mt-4 grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-surface">
              {dims.map(([label, value]) => (
                <div key={label} className="px-4 py-3.5">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="mt-1 font-mono text-xl">
                    {value ?? "—"}
                    {value && <span className="text-sm text-muted"> cm</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="mt-8 hidden flex-col gap-3 lg:flex">
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-full bg-whatsapp px-6 py-4 text-sm font-semibold text-white transition hover:brightness-95"
              >
                <MessageCircle className="size-4" strokeWidth={2} />
                {dict.product.whatsapp}
              </a>
            )}
            {product.company.phone && (
              <a
                href={`tel:${product.company.phone}`}
                className="flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-6 py-4 text-sm font-semibold transition hover:border-ink/40"
              >
                <Phone className="size-4" strokeWidth={2} />
                {dict.product.call}
              </a>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">{dict.product.contactNote}</p>

          <Link
            href={`/${locale}/brands/${company}`}
            className="group mt-8 flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:border-ink/40"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent-soft text-lg font-semibold text-accent">
              {product.company.name.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted">{dict.product.seller}</p>
              <p className="truncate font-medium">{product.company.name}</p>
              {product.company.city && (
                <p className="flex items-center gap-1 text-sm text-muted">
                  <MapPin className="size-3.5" strokeWidth={1.75} />
                  {product.company.city}
                </p>
              )}
            </div>
            <ArrowUpRight className="size-5 text-muted transition group-hover:text-ink" strokeWidth={1.5} />
          </Link>

          {/* Desktop visitors can't do AR — hand them over to their phone. */}
          {product.model?.glbUrl && (
            <div className="mt-4 hidden items-center gap-5 rounded-2xl bg-accent-soft p-4 lg:flex">
              <div className="size-20 shrink-0" dangerouslySetInnerHTML={{ __html: qr }} />
              <div>
                <p className="font-semibold">{dict.product.qrTitle}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink/70">{dict.product.qrText}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {others.length > 0 && (
        <section className="mt-24">
          <h2 className="text-3xl font-semibold tracking-[-0.03em]">
            {fill(dict.product.moreFrom, { company: product.company.name })}
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
            {others.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                locale={locale}
                labels={{ priceOnRequest: dict.product.priceOnRequest, no3d: dict.product.no3d }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Phones: keep price and the main action within thumb reach. */}
      {(whatsappHref || product.company.phone) && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-bg/90 p-3 backdrop-blur-xl lg:hidden">
          <div className="min-w-0 flex-1 pl-1">
            <p className="truncate text-xs text-muted">{name}</p>
            <p className="truncate font-semibold">{price}</p>
          </div>
          {product.company.phone && (
            <a
              href={`tel:${product.company.phone}`}
              aria-label={dict.product.call}
              className="grid size-12 place-items-center rounded-full border border-line bg-surface"
            >
              <Phone className="size-4" strokeWidth={2} />
            </a>
          )}
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center gap-2 rounded-full bg-whatsapp px-5 text-sm font-semibold text-white"
            >
              <MessageCircle className="size-4" strokeWidth={2} />
              WhatsApp
            </a>
          )}
        </div>
      )}
    </div>
  );
}
