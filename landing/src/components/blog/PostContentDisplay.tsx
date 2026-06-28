"use client";
import { useEffect } from "react";
import Image from "next/image";
import Prism from "prismjs";
import "prismjs/components/prism-go";
import "prismjs/components/prism-typescript";
import type { BlogContent } from "@/utils/blog-data";

interface PostContentDisplayProps {
  content: BlogContent[];
  postId: string;
}

const renderMarkdown = (text: string) => {
  let html = text;
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(
    /\[(.*?)\]\((.*?)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:text-primary/80 underline">$1</a>',
  );
  html = html.replace(/\n/g, "<br />");
  return { __html: html };
};

export default function PostContentDisplay({
  content,
  postId,
}: PostContentDisplayProps) {
  useEffect(() => {
    Prism.highlightAll();
  }, [content]);

  return (
    <div className="prose prose-lg prose-invert max-w-none">
      {content.map((section, index) => {
        if (section.type === "heading") {
          return (
            <h2 key={index} className="text-3xl font-bold mt-10 mb-4">
              {section.content}
            </h2>
          );
        } else if (section.type === "paragraph") {
          if (postId === "nft-collectibles-guide") {
            if (
              section.content.startsWith("• Common: Weight 9+") ||
              section.content.startsWith("• Skins: Common skins like") ||
              section.content.startsWith(
                "• Skins: Common skins like 'Azure Blue'",
              ) ||
              section.content.startsWith(
                "• Common: Weight 9+\\n• Uncommon: Weight 7-8",
              )
            ) {
              const listItems = section.content.split("\n");
              return (
                <ul
                  key={index}
                  className="list-disc list-inside mb-6 text-muted-foreground leading-relaxed"
                >
                  {listItems.map((item, i) => (
                    <li key={i}>{item.replace(/^•\s*/, "")}</li>
                  ))}
                </ul>
              );
            }
          }
          return (
            <p
              key={index}
              className="mb-6 text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={renderMarkdown(section.content)}
            />
          );
        } else if (section.type === "image" && section.content) {
          return (
            <div
              key={index}
              className="my-8 relative aspect-auto w-full flex justify-center"
            >
              <Image
                src={section.content}
                alt={section.alt || "Blog image"}
                width={700}
                height={400}
                className="object-contain rounded-lg shadow-lg"
                style={{ width: "auto", height: "auto" }}
                unoptimized
              />
            </div>
          );
        } else if (section.type === "code" && section.content) {
          return (
            <div
              key={index}
              className="my-6 bg-card/80 backdrop-blur-sm rounded-lg overflow-hidden shadow-xl border-2"
            >
              {section.language && (
                <div className="text-xs text-muted-foreground py-2 px-4 bg-muted/50 border-b border-border">
                  {section.language}
                </div>
              )}
              <pre
                className={`language-${section.language || "none"}`}
                suppressHydrationWarning
              >
                <code className={`language-${section.language || "none"}`}>
                  {section.content}
                </code>
              </pre>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
