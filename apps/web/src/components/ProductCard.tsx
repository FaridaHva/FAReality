import { ArrowUpRight, Box } from "lucide-react";
import Link from "next/link";
import { formatPrice, localized, type Locale } from "@/i18n/config";
import type { CatalogProduct } from "@/lib/catalog";

interface ProductCardLabels {
  priceOnRequest: string;
  no3d: string;
}

/** "165 × 62 × 65 cm" — width × depth × height. */
function formatSize(p: Pick<CatalogProduct, "widthCm" | "depthCm" | "heightCm">): string | null {
  if (!p.widthCm || !p.depthCm || !p.heightCm) return null;
  return `${p.widthCm} × ${p.depthCm} × ${p.heightCm} cm`;
}

export function ProductCard({
  product,
  locale,
  labels,
}: {
  product: CatalogProduct;
  locale: Locale;
  labels: ProductCardLabels;
}) {
  const name = localized(product.name, locale);
  const size = formatSize(product);

  return (
    <Link href={`/${locale}/brands/${product.company.slug}/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-tile">
        {product.model?.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.model.posterUrl}
            alt={name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-contain p-5 transition duration-500 ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-6xl font-semibold text-ink/10">
            {name.charAt(0)}
          </span>
        )}

        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 font-mono text-[11px] text-ink backdrop-blur">
          <Box className="size-3.5 text-accent" strokeWidth={1.75} />
          {product.model?.glbUrl ? "3D · AR" : labels.no3d}
        </span>
        <span className="absolute right-3 top-3 grid size-9 translate-y-1 place-items-center rounded-full bg-ink text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight className="size-4" strokeWidth={1.75} />
        </span>
        {size && (
          <span className="absolute bottom-3 left-3 font-mono text-[11px] text-ink/55">{size}</span>
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-4 px-1">
        <div className="min-w-0">
          <h3 className="truncate font-medium">{name}</h3>
          <p className="truncate text-sm text-muted">{product.company.name}</p>
        </div>
        <p className="shrink-0 text-right text-sm font-medium">
          {product.priceAzn ? formatPrice(product.priceAzn, locale) : labels.priceOnRequest}
        </p>
      </div>
    </Link>
  );
}
