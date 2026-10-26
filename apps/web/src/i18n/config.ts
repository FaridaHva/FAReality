import type { Localized } from "@fareality/db/schema";

export const locales = ["az", "ru", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "az";

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

/** Picks the visitor's language, falling back to Azerbaijani (always present). */
export function localized(text: Localized | null | undefined, locale: Locale): string {
  return text?.[locale] || text?.az || "";
}

/** "Hello {name}" + { name: "Aytac" } -> "Hello Aytac" */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

const intlLocale: Record<Locale, string> = { az: "az-AZ", ru: "ru-RU", en: "en-GB" };

export function formatPrice(priceAzn: string, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    style: "currency",
    currency: "AZN",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(Number(priceAzn));
}
