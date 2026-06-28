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

/**
 * The canonical Metacube header — single source of truth for every app.
 *
 * Layout:
 *
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │ [Locale] [☰mob]      [centered nav pill]      [login + play]    │
 *   └─────────────────────────────────────────────────────────────────┘
 *      ↑ left cluster        ↑ NavigationBar          ↑ right cluster
 *
 * Apps customize via props (no fork required):
 *
 *  - i18n routing: pass your next-intl-wired wrapper as `localeSwitcher`.
 *  - translated CTA: pass `playLabel` / `playSecondary` / `playAriaLabel`.
 *  - SPA navigation: pass `navLinkComponent={Link}` (next/link).
 *  - wallet integration: pass your `<LoginButton />` as `loginSlot`.
 *  - no nav (e.g. link-wallet): omit `navItems` entirely.
 *
 * `leftSlot` and `rightSlot` remain as escape hatches for fully custom
 * clusters (e.g. controller's connection pill replaces the right cluster).
 */
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
  /** Pass `next/link`'s `Link` for SPA routing in Next.js apps. */
  navLinkComponent?: NavLinkComponent;
  /**
   * Replaces the LocaleSwitcher in the left cluster. Apps with i18n
   * routing pass their own next-intl-wired wrapper here so locale clicks
   * actually change the URL. Defaults to the canonical (self-managed)
   * LocaleSwitcher — only correct for the UI showcase.
   */
  localeSwitcher?: React.ReactNode;
  loginSlot?: React.ReactNode;
  playHref?: string;
  playLabel?: React.ReactNode;
  /** PlayButton secondary label, shown ≥ xl (e.g. translated "Metacube"). */
  playSecondary?: string;
  playAriaLabel?: string;
  /** Escape hatch — replaces the entire top-LEFT cluster. */
  leftSlot?: React.ReactNode;
  /** Escape hatch — replaces the entire top-RIGHT cluster. */
  rightSlot?: React.ReactNode;
}) {
  const hasNav = !!(navItems && navItems.length > 0);

  return (
    <HeaderShell>
      {/*
        Centered nav pill — visible only at `lg+`. Below that the same
        pill is rendered in the left cluster (next to the LocaleSwitcher)
        instead, and below `md` it collapses into the hamburger
        dropdown.
      */}
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
                {/* `md – lg`: pill sits next to the LocaleSwitcher. */}
                <div className="hidden md:block lg:hidden">
                  <NavigationBar
                    items={navItems}
                    activeHref={activeHref}
                    LinkComponent={navLinkComponent}
                  />
                </div>
                {/* `< md`: hamburger trigger (own `md:hidden` wrapper). */}
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
