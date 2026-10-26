import { ImageResponse } from "next/og";
import { defaultLocale, formatPrice, hasLocale, localized } from "@/i18n/config";
import { loadDictionary } from "@/i18n/dictionaries";
import { getProduct } from "@/lib/catalog";
import { loadOgFonts, OgCard, ogSize, posterDataUrl } from "@/lib/og";

export const size = ogSize;
export const contentType = "image/png";
export const alt = "FAReality";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; company: string; product: string }>;
}) {
  const { locale: raw, company, product: slug } = await params;
  const locale = hasLocale(raw) ? raw : defaultLocale;
  const [dict, product] = await Promise.all([loadDictionary(locale), getProduct(company, slug)]);

  const lines = product
    ? [
        product.priceAzn ? formatPrice(product.priceAzn, locale) : dict.product.priceOnRequest,
        [product.company.name, product.company.city].filter(Boolean).join(" · "),
        product.widthCm && product.depthCm && product.heightCm
          ? `${product.widthCm} × ${product.depthCm} × ${product.heightCm} cm`
          : "",
      ].filter(Boolean)
    : [];

  return new ImageResponse(
    (
      <OgCard
        eyebrow={dict.hero.eyebrow}
        title={product ? localized(product.name, locale) : "FAReality"}
        lines={lines}
        poster={await posterDataUrl(product?.model?.posterUrl)}
        cta={dict.product.viewInRoom}
      />
    ),
    { ...size, fonts: await loadOgFonts() },
  );
}
