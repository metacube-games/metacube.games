import type { MetadataRoute } from "next";
import { locales } from "@/i18n";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://link.metacube.games";

  return locales.map((locale) => ({
    url: `${baseUrl}/${locale}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
    alternates: {
      languages: Object.fromEntries(
        locales.map((loc) => [loc, `${baseUrl}/${loc}`]),
      ),
    },
  }));
}
