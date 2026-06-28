"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";

import type { BlogPost } from "@/utils/blog-data";
import { Card } from "@/components/ui/card";

interface BlogPostCardProps {
  post: BlogPost;
  index: number;
}

export default function BlogPostCard({ post, index }: BlogPostCardProps) {
  const tCard = useTranslations("blog.card");

  return (
    <Link href={`/blog/${post.id}`} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden border-2 transition-colors hover:border-primary">
        <div className="relative aspect-[16/9] w-full">
          <Image
            priority={index < 3}
            src={post.imageUrl}
            alt={post.title}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
        <div className="flex flex-grow flex-col p-6">
          <p className="mb-2 text-sm text-muted-foreground">{post.date}</p>
          <h2 className="mb-2 line-clamp-2 overflow-hidden text-xl font-semibold transition-colors group-hover:text-primary">
            {post.title}
          </h2>
          <p className="line-clamp-3 overflow-hidden text-sm text-muted-foreground">
            {post.excerpt}
          </p>
          <div className="min-h-[12px] flex-grow" />
          <p className="mt-4 text-sm font-medium text-muted-foreground transition-colors group-hover:text-primary">
            {tCard("readMore")}
          </p>
        </div>
      </Card>
    </Link>
  );
}
