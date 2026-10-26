import { ImageResponse } from "next/og";
import { defaultLocale, hasLocale } from "@/i18n/config";
import { loadDictionary } from "@/i18n/dictionaries";
import { getFeaturedProduct } from "@/lib/catalog";
import { loadOgFonts, OgCard, ogSize, posterDataUrl } from "@/lib/og";

export const size = ogSize;
export const contentType = "image/png";
export const alt = "FAReality";

/** Default preview for every page without its own (home, company pages). */
export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = hasLocale(raw) ? raw : defaultLocale;
  const [dict, featured] = await Promise.all([loadDictionary(locale), getFeaturedProduct()]);

  return new ImageResponse(
    (
      <OgCard
        eyebrow={dict.hero.eyebrow}
        title={dict.hero.title}
        lines={[dict.footer.tagline]}
        poster={await posterDataUrl(featured?.model?.posterUrl)}
        cta={dict.hero.primary}
      />
    ),
    { ...size, fonts: await loadOgFonts() },
  );
}
