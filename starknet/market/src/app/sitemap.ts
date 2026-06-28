import type { MetadataRoute } from "next";
import { locales } from "@/i18n";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://market.metacube.games";

  const routes = [
    "",
    "/market",
    "/inventory",
    "/rewards",
    "/collection/allstars",
  ];

  const sitemap: MetadataRoute.Sitemap = [];

  locales.forEach((locale) => {
    routes.forEach((route) => {
      sitemap.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency:
          route === "" || route === "/market" ? "daily" : "weekly",
        priority: route === "" ? 1.0 : route === "/market" ? 0.9 : 0.8,
        alternates: {
          languages: Object.fromEntries(
            locales.map((loc) => [loc, `${baseUrl}/${loc}${route}`]),
          ),
        },
      });
    });
  });

  return sitemap;
}
