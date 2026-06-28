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

export type NavLinkComponent = "a" | React.ComponentType<NavLinkProps>;

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { href: "#rewards", icon: <AwardIcon />, label: "Rewards" },
  { href: "#market", icon: <ShoppingBagIcon />, label: "Market" },
  { href: "#inventory", icon: <PackageIcon />, label: "Inventory" },
  { href: "#allstars", icon: <StarIcon />, label: "Allstars" },
];

const linkBase =
  "group inline-flex h-full w-28 items-center justify-center gap-2 whitespace-nowrap bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 [&_svg]:size-4";

export function NavigationBar({
  items = DEFAULT_NAV_ITEMS,
  activeHref,
  LinkComponent = "a",
}: {
  items?: NavItem[];
  activeHref?: string;
  LinkComponent?: NavLinkComponent;
}) {
  return (
    <div>
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
