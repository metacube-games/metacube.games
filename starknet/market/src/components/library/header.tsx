import * as React from "react";
import { HeaderShell } from "./header-shell";
import {
  NavigationBar,
  NavigationBarMobile,
  type NavItem,
  type NavLinkComponent,
} from "./navigation-bar";
import { LocaleSwitcher } from "./locale-switcher";
import { PlayButton } from "./play-button";

export function Header({
  navItems,
  activeHref,
  navLinkComponent,
  localeSwitcher,
  loginSlot,
  playHref = "https://play.metacube.games",
  playLabel,
  playSecondary,
  playAriaLabel,
  leftSlot,
  rightSlot,
}: {
  navItems?: NavItem[];
  activeHref?: string;
  navLinkComponent?: NavLinkComponent;
  localeSwitcher?: React.ReactNode;
  loginSlot?: React.ReactNode;
  playHref?: string;
  playLabel?: React.ReactNode;
  playSecondary?: string;
  playAriaLabel?: string;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  const hasNav = !!(navItems && navItems.length > 0);

  return (
    <HeaderShell>
      {hasNav && (
        <div className="hidden lg:block">
          <NavigationBar
            items={navItems}
            activeHref={activeHref}
            LinkComponent={navLinkComponent}
          />
        </div>
      )}

      <div className="absolute left-3 top-3">
        {leftSlot === undefined ? (
          <div className="flex items-center gap-3">
            {localeSwitcher === undefined ? <LocaleSwitcher /> : localeSwitcher}
            {hasNav && (
              <>
                <div className="hidden md:block lg:hidden">
                  <NavigationBar
                    items={navItems}
                    activeHref={activeHref}
                    LinkComponent={navLinkComponent}
                  />
                </div>
                <NavigationBarMobile
                  items={navItems}
                  activeHref={activeHref}
                  LinkComponent={navLinkComponent}
                />
              </>
            )}
          </div>
        ) : (
          leftSlot
        )}
      </div>

      <div className="absolute right-3 top-3">
        {rightSlot === undefined ? (
          <div className="flex items-center gap-3">
            {loginSlot}
            <PlayButton
              href={playHref}
              target="_blank"
              rel="noopener noreferrer"
              secondary={playSecondary}
              aria-label={playAriaLabel}
            >
              {playLabel}
            </PlayButton>
          </div>
        ) : (
          rightSlot
        )}
      </div>
    </HeaderShell>
  );
}
