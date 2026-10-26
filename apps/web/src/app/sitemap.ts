import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { getPublishedProducts } from "@/lib/catalog";
import { siteUrl } from "@/lib/site";

/** Every page in every language, each listing its translations (hreflang). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getPublishedProducts();
  const companies = [...new Set(products.map((p) => p.company.slug))];

  const entry = (path: string, extra: Partial<MetadataRoute.Sitemap[number]> = {}) =>
    locales.map((locale) => ({
      url: `${siteUrl}/${locale}${path}`,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}${path}`])) },
      ...extra,
    }));

  return [
    ...entry("", { changeFrequency: "daily", priority: 1 }),
    ...companies.flatMap((c) => entry(`/brands/${c}`, { changeFrequency: "weekly", priority: 0.6 })),
    ...products.flatMap((p) =>
      entry(`/brands/${p.company.slug}/${p.slug}`, {
        lastModified: p.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
        images: p.model?.posterUrl ? [`${siteUrl}${p.model.posterUrl}`] : undefined,
      }),
    ),
  ];
}
