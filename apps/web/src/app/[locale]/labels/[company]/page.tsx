/**
 * Printable A4 sheet of showroom price tags, one per product, each with a QR
 * code to the product page. Not linked from the site yet — it moves into the
 * company dashboard once that exists.
 */
import { ScanLine } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Suspense } from "react";
import { PrintButton } from "@/components/PrintButton";
import { formatPrice, localized } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { getCompany, getCompanyProducts, getPublishedProducts } from "@/lib/catalog";
import { siteUrl } from "@/lib/site";

type Props = PageProps<"/[locale]/labels/[company]">;

export async function generateStaticParams() {
  const products = await getPublishedProducts();
  return [...new Set(products.map((p) => p.company.slug))].map((company) => ({ company }));
}

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.labels.title, robots: { index: false } };
}

export default function LabelsPage({ params }: Props) {
  return (
    <Suspense>
      <Labels params={params} />
    </Suspense>
  );
}

async function Labels({ params }: Pick<Props, "params">) {
  const { company: slug } = await params;
  const company = await getCompany(slug);
  if (!company) notFound();

  const locale = await getLocale();
  const dict = await getDictionary();
  const products = await getCompanyProducts(slug);
  const tags = await Promise.all(
    products.map(async (p) => ({
      product: p,
      // ?ref marks visits that came from a showroom tag, for analytics later.
      qr: await QRCode.toString(`${siteUrl}/${locale}/brands/${slug}/${p.slug}?ref=showroom`, {
        type: "svg",
        margin: 0,
        color: { dark: "#16150f", light: "#0000" },
      }),
    })),
  );

  return (
    <div className="min-h-dvh py-10 print:py-0">
      <style>{"@page { size: A4; margin: 10mm; } @media print { html { background: white; } }"}</style>

      <div className="mx-auto mb-8 flex w-[190mm] max-w-full flex-wrap items-end justify-between gap-4 px-4 print:hidden">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted">{company.name}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{dict.labels.title}</h1>
          <p className="mt-1 text-sm text-muted">{dict.labels.hint}</p>
        </div>
        <PrintButton label={dict.labels.print} />
      </div>

      <div className="mx-auto w-[190mm] bg-white shadow-xl print:shadow-none">
        <div className="grid grid-cols-3">
          {tags.map(({ product, qr }) => (
            <div
              key={product.id}
              className="flex h-[69mm] break-inside-avoid flex-col border border-dashed border-ink/25 p-[5mm] text-ink"
            >
              <p className="truncate font-mono text-[7pt] uppercase tracking-wider text-muted">{company.name}</p>
              <p className="mt-[1mm] line-clamp-2 text-[12pt] font-semibold leading-tight">
                {localized(product.name, locale)}
              </p>
              <p className="mt-[1mm] text-[11pt] font-medium">
                {product.priceAzn ? formatPrice(product.priceAzn, locale) : dict.product.priceOnRequest}
              </p>
              {product.widthCm && product.depthCm && product.heightCm && (
                <p className="font-mono text-[8pt] text-muted">
                  {product.widthCm} × {product.depthCm} × {product.heightCm} cm
                </p>
              )}
              <div className="mt-auto flex items-end gap-[3mm]">
                <div className="size-[26mm] shrink-0" dangerouslySetInnerHTML={{ __html: qr }} />
                <div className="flex flex-col gap-[1.5mm]">
                  <ScanLine className="size-[5mm] text-accent" strokeWidth={2} />
                  <p className="text-[7.5pt] font-medium leading-snug">{dict.labels.scan}</p>
                  <p className="text-[7pt] font-semibold tracking-tight text-muted">FAReality</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
