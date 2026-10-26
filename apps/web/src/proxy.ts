import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, hasLocale, locales } from "./i18n/config";
import { SESSION_COOKIE } from "./lib/admin/session-cookie";

/** First supported language from Accept-Language, e.g. "ru-RU,ru;q=0.9" -> "ru". */
function preferredLocale(request: NextRequest): string {
  const accepted = (request.headers.get("accept-language") ?? "")
    .split(",")
    .map((part) => part.split(";")[0].trim().slice(0, 2).toLowerCase());
  return accepted.find(hasLocale) ?? defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin has no locale. Bounce visitors without a session cookie early;
  // pages and actions still verify the cookie's signature themselves.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname !== "/admin/login" && !request.cookies.has(SESSION_COOKIE)) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return;
  }

  const hasPrefix = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasPrefix) return;

  request.nextUrl.pathname = `/${preferredLocale(request)}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  // Skip Next internals, API routes and anything with a file extension (models, images).
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
