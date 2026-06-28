import * as React from "react";
import { useTranslation } from "react-i18next";
import { MenuIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ActiveMarker } from "@/components/library/active-marker";

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

// `focus-visible:` (not `focus:`) so mouse clicks don't leave a sticky highlight.
const linkBase =
  "group inline-flex h-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 [&_svg]:size-4";

export function NavigationBar({
  items,
  activeHref,
  LinkComponent = "a",
}: {
  items: NavItem[];
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
  items,
  activeHref,
  LinkComponent = "a",
}: {
  items: NavItem[];
  activeHref?: string;
  LinkComponent?: NavLinkComponent;
}) {
  const { t } = useTranslation();
  return (
    <div className="lg:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" aria-label={t("ui.openNavigationMenu")}>
            <MenuIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="!min-w-fit">
          {items.map((it) => (
            <DropdownMenuItem
              key={it.href}
              asChild
              className={cn(
                "w-full cursor-pointer",
                activeHref === it.href && "bg-accent text-accent-foreground",
              )}
            >
              <LinkComponent href={it.href}>
                {it.icon}
                <span className="text-sm font-medium">{it.label}</span>
                <ActiveMarker active={activeHref === it.href} />
              </LinkComponent>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
