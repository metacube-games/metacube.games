import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

import { ArrowLeft } from "lucide-react";

import { Page } from "@/components/library/page";
import ResponsiveHeaderText from "@/components/responsive-header";
import { Button } from "@/components/ui/button";
import { getBlogPost } from "@/utils/blog-data";
import { locales } from "@/i18n";
import NFTStatsSectionWrapper from "@/components/charts/NFTStatsSectionWrapper";
import PostContentDisplay from "@/components/blog/PostContentDisplay";

interface PageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await getBlogPost(resolvedParams.locale, resolvedParams.slug);
  const baseUrl = "https://metacube.games";

  if (!post) {
    return {
      title: "Post Not Found",
      description: "The requested blog post could not be found.",
    };
  }

  const canonicalUrl = `${baseUrl}/${resolvedParams.locale}/blog/${resolvedParams.slug}`;
  const imageUrl = post.imageUrl.startsWith("http")
    ? post.imageUrl
    : `${baseUrl}${post.imageUrl}`;

  const languages: Record<string, string> = {
    ...Object.fromEntries(
      locales.map((l) => [l, `${baseUrl}/${l}/blog/${resolvedParams.slug}`]),
    ),
    "x-default": `${baseUrl}/en/blog/${resolvedParams.slug}`,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: imageUrl,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: post.author, url: baseUrl },
    publisher: {
      "@type": "Organization",
      name: "Metacube Games",
      url: baseUrl,
      logo: { "@type": "ImageObject", url: `${baseUrl}/metadata-image.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
    inLanguage: resolvedParams.locale,
    url: canonicalUrl,
  };

  return {
    title: post.title,
    description: post.excerpt,
    authors: [{ name: post.author }],
    openGraph: {
      type: "article",
      url: canonicalUrl,
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
      modifiedTime: post.date,
      authors: [post.author],
      images: [{ url: imageUrl, width: 1200, height: 630, alt: post.title }],
      locale:
        resolvedParams.locale === "en"
          ? "en_US"
          : resolvedParams.locale === "de"
            ? "de_DE"
            : resolvedParams.locale === "fr"
              ? "fr_FR"
              : "es_ES",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [imageUrl],
      site: "@MetacubeGames",
      creator: "@MetacubeGames",
    },
    alternates: { canonical: canonicalUrl, languages },
    other: { "application/ld+json": JSON.stringify(jsonLd) },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const resolvedParams = await params;
  const post = await getBlogPost(resolvedParams.locale, resolvedParams.slug);
  const t = await getTranslations({
    locale: resolvedParams.locale,
    namespace: "blog.postPage",
  });
  if (!post) {
    return (
      <main id="main-content">
        <Page hasFooter>
          <div className="text-center">
            <ResponsiveHeaderText>{t("postNotFound")}</ResponsiveHeaderText>
            <p className="mb-6 text-muted-foreground">
              {t("postNotFoundDescription")}
            </p>
            <Link
              href="/blog"
              className="inline-block px-6 py-3 rounded-full bg-primary text-black hover:bg-primary/90 transition-colors"
            >
              {t("backToBlog")}
            </Link>
          </div>
        </Page>
      </main>
    );
  }

  const isNFTStatsPost = post.id === "nft-collectibles-guide";

  return (
    <main id="main-content">
      <Page hasFooter>
        <article className="max-w-4xl mx-auto">
          <div className="mb-8 flex">
            <Button variant="outline" asChild>
              <Link href="/blog">
                <ArrowLeft />
                {t("backToBlog")}
              </Link>
            </Button>
          </div>

          <div className="relative w-full h-80 mb-8 rounded-xl overflow-hidden">
            <Image
              src={post.imageUrl}
              alt={post.title}
              fill
              className="object-cover"
              unoptimized
              priority
            />
          </div>

          <header className="mb-12">
            <div className="text-sm text-muted-foreground mb-2">{post.date}</div>
            <ResponsiveHeaderText>{post.title}</ResponsiveHeaderText>
          </header>

          <PostContentDisplay content={post.content} postId={post.id} />

          {isNFTStatsPost && (
            <div className="mt-12">
              <h2 className="text-3xl font-bold mt-12 mb-6">
                {t("nftRarityTitle")}
              </h2>
              <p className="mb-6 text-muted-foreground leading-relaxed">
                {t("nftRarityDescription")}
                {t("nftRarityDetails")}
              </p>
              <NFTStatsSectionWrapper />
            </div>
          )}

          {post.relatedPosts && post.relatedPosts.length > 0 && (
            <div className="mt-16">
              <h3 className="text-2xl font-bold mb-6">{t("relatedPosts")}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {await Promise.all(
                  post.relatedPosts.map(async (slug) => {
                    const relatedPost = await getBlogPost(
                      resolvedParams.locale,
                      slug,
                    );
                    if (!relatedPost) return null;

                    return (
                      <Link key={slug} href={`/blog/${slug}`} className="group">
                        <div className="bg-card/60 backdrop-blur-sm rounded-lg overflow-hidden border-2 transition-colors hover:border-primary">
                          <div className="relative h-40 w-full">
                            <Image
                              src={relatedPost.imageUrl}
                              alt={relatedPost.title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="p-4">
                            <div className="text-sm text-muted-foreground mb-2">
                              {relatedPost.date}
                            </div>
                            <h2 className="text-xl font-semibold group-hover:text-primary transition-colors">
                              {relatedPost.title}
                            </h2>
                          </div>
                        </div>
                      </Link>
                    );
                  }),
                )}
              </div>
            </div>
          )}
        </article>
      </Page>
    </main>
  );
}
