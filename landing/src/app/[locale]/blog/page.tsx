import { getTranslations } from "next-intl/server";

import { Page } from "@/components/library/page";
import ResponsiveHeaderText from "@/components/responsive-header";
import { getAllBlogPosts } from "@/utils/blog-data";
import BlogPostCard from "@/components/blog/BlogPostCard";

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tFooter = await getTranslations({ locale, namespace: "footer.links" });
  const allPosts = await getAllBlogPosts(locale);

  return (
    <main id="main-content">
      <Page hasFooter width="default">
        <ResponsiveHeaderText>{tFooter("blog")}</ResponsiveHeaderText>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allPosts.map((post, index) => (
            <BlogPostCard key={post.id} post={post} index={index} />
          ))}
        </div>
      </Page>
    </main>
  );
}
