import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { hasLocale, type Locale } from "./config";

const dictionaries = {
  az: () => import("./dictionaries/az.json").then((m) => m.default),
  ru: () => import("./dictionaries/ru.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
};

export type Dictionary = Awaited<ReturnType<(typeof dictionaries)["az"]>>;

export async function getLocale(): Promise<Locale> {
  // Undefined outside app/[locale] (the admin has its own root layout).
  const value = await localeParam();
  if (!value || !hasLocale(value)) notFound();
  return value;
}

export async function getDictionary(): Promise<Dictionary> {
  return loadDictionary(await getLocale());
}

/** For route handlers (OG images, sitemap), where root params aren't available. */
export function loadDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
