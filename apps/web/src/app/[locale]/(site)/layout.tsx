import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

export default async function SiteLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await getLocale();
  const dict = await getDictionary();

  return (
    <>
      <SiteHeader locale={locale} dict={dict} />
      <main className="flex-1">{children}</main>
      <SiteFooter locale={locale} dict={dict} />
    </>
  );
}
