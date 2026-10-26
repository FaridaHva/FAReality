import type { Metadata } from "next";
import { locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { ogLocale, siteUrl } from "@/lib/site";
import { fontClasses } from "../fonts";
import "../globals.css";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    // Makes relative og:image and canonical URLs absolute, as crawlers require.
    metadataBase: new URL(siteUrl),
    title: { default: "FAReality", template: "%s · FAReality" },
    description: dict.meta.description,
    openGraph: { siteName: "FAReality", type: "website", locale: ogLocale[await getLocale()] },
    twitter: { card: "summary_large_image" },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <html lang={await getLocale()} className={`${fontClasses} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
