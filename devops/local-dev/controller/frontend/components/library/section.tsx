import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Page-section wrapper. Every route should compose itself out of one or more
 * Sections so vertical rhythm stays consistent across apps:
 *
 *   - `py-6` between sections (24 px top + bottom)
 *   - eyebrow + optional title separated from content by `mb-6 pb-4 border-b`
 *   - `stack` prop applies `space-y-3` to children for the common pattern of
 *     vertically stacked cards (the canonical 12 px gap).
 *
 * Don't tweak the spacing in callers. If you need a different cadence, build
 * it into Section here so every app inherits the change.
 */
export function Section({
  title,
  description,
  stack,
  className,
  children,
  ...props
}: {
  title?: string;
  description?: string;
  /** Apply the canonical 12 px vertical gap between direct children. */
  stack?: boolean;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("py-6", className)} {...props}>
      {(title || description) && (
        <header className="mb-6 flex flex-col gap-1 border-b border-border pb-4">
          {title && (
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {title}
            </span>
          )}
          {description && (
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {description}
            </h2>
          )}
        </header>
      )}
      <div className={cn(stack && "space-y-3")}>{children}</div>
    </section>
  );
}

/** Canonical section heading — never restyle locally. */
export function SectionTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "text-3xl font-medium uppercase tracking-widest text-foreground sm:text-4xl",
        className,
      )}
      {...props}
    />
  );
}
