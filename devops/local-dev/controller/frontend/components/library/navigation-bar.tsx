import * as React from "react";
import {
  AwardIcon,
  ShoppingBagIcon,
  PackageIcon,
  StarIcon,
  MenuIcon,
  Play,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  icon: React.ReactNode;
  label: string;
};

type NavLinkProps = {
  href: string;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
};

export type NavLinkComponent =
  | "a"
  | React.ComponentType<NavLinkProps>;

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { href: "#rewards", icon: <AwardIcon />, label: "Rewards" },
  { href: "#market", icon: <ShoppingBagIcon />, label: "Market" },
  { href: "#inventory", icon: <PackageIcon />, label: "Inventory" },
  { href: "#allstars", icon: <StarIcon />, label: "Allstars" },
];

/**
 * `h-full` on each `<a>` fills the pill height so hover paints edge-to-edge.
 * `w-28` keeps all tabs uniform (segmented-control look).
 * `focus-visible:` (not `focus:`) — no sticky highlight on mouse clicks.
 */
const linkBase =
  "group inline-flex h-full w-28 items-center justify-center gap-2 whitespace-nowrap bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 [&_svg]:size-4";

/**
 * The desktop navigation pill — always renders when included; it's the
 * caller's job to hide / show it at the right breakpoint. The Header
 * uses two copies of this component:
 *
 *   - one centered (visible `≥ lg`),
 *   - one in the left cluster next to the LocaleSwitcher
 *     (visible `md – lg`).
 *
 * Below `md` the pill collapses into the `<NavigationBarMobile />`
 * hamburger dropdown, also rendered by the Header.
 */
export function NavigationBar({
  items = DEFAULT_NAV_ITEMS,
  activeHref,
  LinkComponent = "a",
}: {
  items?: NavItem[];
  activeHref?: string;
  /**
   * Replaces the rendered `<a>` tags. Pass `next/link`'s `Link` for SPA
   * routing in Next.js apps; default `"a"` is fine for plain anchor /
   * hash navigation (UI showcase, controller).
   */
  LinkComponent?: NavLinkComponent;
}) {
  return (
    <div>
      {/* No `items-center` here — default `align-items: stretch` lets each
          <li> (and the link inside via `h-full`) fill the full pill height,
          so the hover background paints edge-to-edge. */}
      <ul className="flex h-9 w-max justify-center overflow-hidden rounded-md border bg-background shadow-sm">
        {items.map((it) => (
          <li key={it.href}>
            <LinkComponent
              href={it.href}
              className={cn(
                linkBase,
                activeHref === it.href && "bg-accent text-accent-foreground",
              )}
            >
              {it.icon}
              <span>{it.label}</span>
            </LinkComponent>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Mobile navigation trigger — a hamburger Button that opens a dropdown
 * of the same nav items. Visible at `< md` only; from `md` upwards the
 * Header switches to the full pill (left-positioned next to the
 * LocaleSwitcher between `md` and `lg`, then centered at `lg+`).
 */
export function NavigationBarMobile({
  items = DEFAULT_NAV_ITEMS,
  activeHref,
  LinkComponent = "a",
}: {
  items?: NavItem[];
  activeHref?: string;
  LinkComponent?: NavLinkComponent;
}) {
  return (
    <div className="md:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" aria-label="Open navigation menu">
            <MenuIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        {/*
          `!min-w-fit` overrides the shadcn `DropdownMenuContent` default
          floor of `min-w-[8rem]` (128px) so the popover sizes strictly
          to its longest tab label in the active language (e.g.
          `Inventory` in en, `Inventaire` in fr).
        */}
        <DropdownMenuContent align="start" className="!min-w-fit">
          {items.map((it) => (
            <DropdownMenuItem
              key={it.href}
              asChild
              className={cn(
                "cursor-pointer",
                activeHref === it.href && "bg-accent text-accent-foreground",
              )}
            >
              <LinkComponent href={it.href}>
                {it.icon}
                <span className="text-sm font-medium">{it.label}</span>
                {/*
                  Marker slot is rendered on EVERY row (transparent when
                  inactive) so the dropdown auto-sizes to "longest label
                  + marker width" and the active row's marker always
                  sits at the same x position via `ml-auto`.
                */}
                <Play
                  aria-hidden
                  className={cn(
                    "ml-auto size-3.5 rotate-180 fill-current",
                    activeHref === it.href ? "text-primary" : "invisible",
                  )}
                />
              </LinkComponent>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
