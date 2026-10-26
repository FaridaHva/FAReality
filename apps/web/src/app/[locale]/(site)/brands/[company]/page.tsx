import { MapPin, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductCard } from "@/components/ProductCard";
import { localized } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { getCompany, getCompanyProducts, getPublishedProducts } from "@/lib/catalog";
import { alternatesFor } from "@/lib/site";

type Props = PageProps<"/[locale]/brands/[company]">;

export async function generateStaticParams() {
  const products = await getPublishedProducts();
  return [...new Set(products.map((p) => p.company.slug))].map((company) => ({ company }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const company = await getCompany((await params).company);
  if (!company) return {};
  const locale = await getLocale();
  return {
    title: company.name,
    description: localized(company.description, locale) || undefined,
    alternates: alternatesFor(`/brands/${company.slug}`, locale),
  };
}

export default function CompanyPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="h-56 animate-pulse rounded-[2rem] bg-surface" />
        </div>
      }
    >
      <CompanyDetails params={params} />
    </Suspense>
  );
}

async function CompanyDetails({ params }: Pick<Props, "params">) {
  const { company: slug } = await params;
  const company = await getCompany(slug);
  if (!company) notFound();

  const locale = await getLocale();
  const dict = await getDictionary();
  const products = await getCompanyProducts(slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="stage flex flex-col gap-6 rounded-[2rem] p-6 sm:flex-row sm:items-end sm:p-10">
        <span className="grid size-20 shrink-0 place-items-center rounded-3xl bg-ink text-3xl font-semibold text-white">
          {company.name.charAt(0)}
        </span>
        <div className="flex-1">
          <h1 className="text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">{company.name}</h1>
          {company.city && (
            <p className="mt-2 flex items-center gap-1 text-muted">
              <MapPin className="size-4" strokeWidth={1.75} />
              {company.city}
            </p>
          )}
          {company.description && (
            <p className="mt-4 max-w-2xl leading-relaxed text-ink/75">{localized(company.description, locale)}</p>
          )}
        </div>
        <div className="flex gap-2">
          {company.phone && (
            <a
              href={`tel:${company.phone}`}
              aria-label={dict.product.call}
              className="grid size-12 place-items-center rounded-full border border-line bg-surface transition hover:border-ink/40"
            >
              <Phone className="size-4" strokeWidth={2} />
            </a>
          )}
          {company.whatsapp && (
            <a
              href={`https://wa.me/${company.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center gap-2 rounded-full bg-whatsapp px-5 text-sm font-semibold text-white transition hover:brightness-95"
            >
              <MessageCircle className="size-4" strokeWidth={2} />
              WhatsApp
            </a>
          )}
        </div>
      </div>

      <h2 className="mt-16 text-3xl font-semibold tracking-[-0.03em]">
        {dict.company.products}
        <sup className="ml-2 font-mono text-base font-normal tracking-normal text-muted">{products.length}</sup>
      </h2>
      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            locale={locale}
            labels={{ priceOnRequest: dict.product.priceOnRequest, no3d: dict.product.no3d }}
          />
        ))}
      </div>
    </div>
  );
}
