import * as React from "react";
import { PlayIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * `PlayButton` mirrors the LocaleSwitcher Button surface with two exceptions:
 *   1. `--primary` green color.
 *   2. Green halo shadow + 1.05× hover scale.
 */
export const PlayButton = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { secondary?: string }
>(({ className, children = "Play", secondary = "Metacube", ...props }, ref) => (
  <a
    ref={ref}
    className={cn(
      // h-9 px-4 py-2: canonical default Button surface; no responsive shrink.
      "inline-flex h-9 cursor-pointer items-center justify-center gap-2",
      "whitespace-nowrap rounded-md border px-4 py-2 text-sm font-bold uppercase",
      "transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
      "disabled:pointer-events-none disabled:opacity-50",
      "[&_svg]:size-4 [&_svg]:shrink-0",
      "border-primary bg-primary text-primary-foreground",
      // Spread (not pure blur) gives the glow a rounded-rectangle shape.
      "shadow-[0_0_20px_5px_rgba(34,197,94,0.4)]",
      "hover:scale-[1.05] hover:shadow-[0_0_30px_8px_rgba(34,197,94,0.6)]",
      className,
    )}
    {...props}
  >
    <PlayIcon className="fill-current" aria-hidden />
    <span className="whitespace-nowrap">{children}</span>
    {secondary && (
      <span className="hidden whitespace-nowrap xl:inline">{secondary}</span>
    )}
  </a>
));
PlayButton.displayName = "PlayButton";
