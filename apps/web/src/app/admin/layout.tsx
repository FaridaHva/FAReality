import type { Metadata } from "next";
import { fontClasses } from "../fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Admin · FAReality", template: "%s · Admin · FAReality" },
  robots: { index: false, follow: false },
};

/** Team-only tool, Azerbaijani UI, kept apart from the public site's locale routing. */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="az" className={`${fontClasses} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
