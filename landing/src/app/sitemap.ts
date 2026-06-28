import type { MetadataRoute } from "next";
import { locales } from "@/i18n";
import { blogPosts } from "@/utils/blog-data.en";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://metacube.games";
  const currentDate = new Date();

  const staticPages = [
    "", // home page
    "/blog",
    "/community-streams",
    "/privacy",
    "/terms",
  ];

  const staticEntries: MetadataRoute.Sitemap = [];

  locales.forEach((locale) => {
    staticPages.forEach((page) => {
      const url = `${baseUrl}/${locale}${page}`;

      let priority = 0.7;
      let changeFrequency:
        | "always"
        | "hourly"
        | "daily"
        | "weekly"
        | "monthly"
        | "yearly"
        | "never" = "weekly";

      if (page === "") {
        priority = 1.0;
        changeFrequency = "daily";
      } else if (page === "/blog") {
        priority = 0.9;
        changeFrequency = "daily";
      } else if (page === "/community-streams") {
        priority = 0.8;
        changeFrequency = "daily";
      } else if (page === "/privacy" || page === "/terms") {
        priority = 0.3;
        changeFrequency = "yearly";
      }

      staticEntries.push({
        url,
        lastModified: currentDate,
        changeFrequency,
        priority,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${baseUrl}/${l}${page}`]),
          ),
        },
      });
    });
  });

  const blogPostEntries: MetadataRoute.Sitemap = [];
  const blogPostIds = Object.keys(blogPosts);

  locales.forEach((locale) => {
    blogPostIds.forEach((postId) => {
      const post = blogPosts[postId];
      if (!post) return;
      const url = `${baseUrl}/${locale}/blog/${postId}`;

      let lastModified = currentDate;
      try {
        lastModified = new Date(post.date);
        if (isNaN(lastModified.getTime())) {
          lastModified = currentDate;
        }
      } catch {
        lastModified = currentDate;
      }

      blogPostEntries.push({
        url,
        lastModified,
        changeFrequency: "monthly",
        priority: 0.8,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${baseUrl}/${l}/blog/${postId}`]),
          ),
        },
      });
    });
  });

  return [...staticEntries, ...blogPostEntries];
}
