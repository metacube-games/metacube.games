import * as React from "react";
import { Container, type ContainerWidth } from "./container";
import { cn } from "@/lib/utils";

/**
 * Page wrapper for every route.
 *
 * - `pt-18` (72 px) = 60 px fixed header + 12 px gap.
 * - `pb-18` with footer (72 px) = 60 px fixed footer + 12 px gap.
 * - `pb-8` without footer — smaller bottom for apps without a fixed Footer.
 *
 * Always use this rather than raw `<Container>` + manual paddings.
 */
export function Page({
  hasFooter = true,
  width,
  className,
  children,
  ...props
}: {
  /** Set to `false` if the app has no fixed Footer (e.g. controller). */
  hasFooter?: boolean;
  width?: ContainerWidth;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Container
      width={width}
      className={cn(
        "pt-18",
        hasFooter ? "pb-18" : "pb-8",
        className,
      )}
      {...props}
    >
      {children}
    </Container>
  );
}
