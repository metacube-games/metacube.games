export type { BlogContent, BlogPost } from "./blog-data.en";

// Locale-independent utilities.
export {
  getRarityClass,
  getRarityGlow,
  getCardBorder,
  nftStatistics,
} from "./blog-data.en";

import type { BlogPost } from "./blog-data.en";

const blogDataCache: Record<string, Record<string, BlogPost>> = {};

/**
 * Dynamically loads blog data for the specified locale
 * @param locale - The locale code (en, fr, de, es)
 * @returns Promise resolving to the blog posts object
 */
export async function loadBlogData(
  locale: string,
): Promise<Record<string, BlogPost>> {
  if (blogDataCache[locale]) {
    return blogDataCache[locale];
  }

  try {
    const module = await import(`./blog-data.${locale}`);
    blogDataCache[locale] = module.blogPosts;
    return module.blogPosts;
  } catch (error) {
    console.warn(
      `Blog data for locale "${locale}" not found, falling back to English`,
    );
    const module = await import("./blog-data.en");
    blogDataCache[locale] = module.blogPosts;
    return module.blogPosts;
  }
}

/**
 * Posts that are excluded from listings. Kept in the data file so
 * cross-references (related posts) still resolve, but filtered out of
 * `getAllBlogPosts`.
 */
const HIDDEN_POST_IDS = new Set<string>(["special-events-in-metacube"]);

/**
 * Gets all blog posts for the specified locale, newest first, with
 * hidden posts excluded.
 * @param locale - The locale code (en, fr, de, es)
 */
export async function getAllBlogPosts(locale: string): Promise<BlogPost[]> {
  const blogPosts = await loadBlogData(locale);
  return Object.values(blogPosts)
    .filter((post) => !HIDDEN_POST_IDS.has(post.id))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Gets a specific blog post by slug for the specified locale
 * @param locale - The locale code (en, fr, de, es)
 * @param slug - The blog post slug/ID
 * @returns Promise resolving to the blog post or undefined
 */
export async function getBlogPost(
  locale: string,
  slug: string,
): Promise<BlogPost | undefined> {
  const blogPosts = await loadBlogData(locale);
  return blogPosts[slug];
}

