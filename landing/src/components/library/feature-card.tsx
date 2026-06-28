"use client";

import * as React from "react";
import { ArrowUpRight } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function FeatureGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 md:grid-cols-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FeatureCard({
  icon,
  title,
  description,
  href,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  href?: string;
}) {
  const content = (
    <Card className="group relative h-full border-2 transition-colors hover:border-primary">
      {href && (
        <ArrowUpRight
          aria-hidden
          className="absolute right-4 top-4 size-4 shrink-0 text-muted-foreground transition duration-[600ms] ease-in-out group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-primary"
        />
      )}
      <CardHeader>
        {icon && (
          <div className="mb-3 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary [&_svg]:size-6">
            {icon}
          </div>
        )}
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
    </Card>
  );

  if (href) {
    return (
      <a
        href={href}
        className="block h-full"
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }
  return content;
}
