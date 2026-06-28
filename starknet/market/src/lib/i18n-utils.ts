import { locales } from "@/i18n";

/** Match pathname against route, accounting for locale prefixes. */
export function isRoute(pathname: string, route: string): boolean {
  if (pathname === route) return true;
  return locales.some((locale) => pathname === `/${locale}${route}`);
}
