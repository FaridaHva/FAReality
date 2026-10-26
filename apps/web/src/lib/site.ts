import { defaultLocale, locales, type Locale } from "@/i18n/config";

/** Public origin, used for links that leave the site (QR codes, WhatsApp messages, SEO). */
export const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const ogLocale: Record<Locale, string> = { az: "az_AZ", ru: "ru_RU", en: "en_US" };

/** Canonical + hreflang links for a page that exists in every language, e.g. "/brands/demo-mebel". */
export function alternatesFor(path: string, locale: Locale) {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, `/${l}${path}`])),
      "x-default": `/${defaultLocale}${path}`,
    },
  };
}
