import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Width tokens for both Container and Page.
 *
 * - `narrow` — `max-w-3xl` (768 px). Long-form text (terms, privacy, blog post).
 * - `default` — `max-w-6xl` (1152 px). Most app content (admin, wallet flow).
 * - `wide` — `max-w-screen-2xl` (1536 px). Marketplace grids with many columns.
 * - `full` — `max-w-none`. Full-bleed marketing pages that manage their own
 *   inner padding.
 */
export type ContainerWidth = "narrow" | "default" | "wide" | "full";

const widthMap: Record<ContainerWidth, string> = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-screen-2xl",
  full: "max-w-none",
};

export const Container = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { width?: ContainerWidth }
>(({ className, width = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "mx-auto w-full px-4 sm:px-6 lg:px-8",
      widthMap[width],
      className,
    )}
    {...props}
  />
));
Container.displayName = "Container";
