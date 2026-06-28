import * as React from "react";
import {
  BarChart3,
  Hammer,
  Package,
  Settings,
  Trophy,
  User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { HeaderShell } from "./library/header-shell";
import {
  NavigationBar,
  NavigationBarMobile,
  type NavItem,
} from "./library/navigation-bar";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { LoginButton } from "../menu/subMenus/NavigationBar/LoginButton";
import {
  useTopMenuStore,
  type TopMenuName,
} from "../menu/subMenus/NavigationBar/useTopMenuStore";
import { CISoundMng } from "../sound/soundFX";
import { cn } from "../lib/utils";

export const Header = React.memo(
  ({
    onAuthRequest,
    onDisconnect,
    onAuthSuccess,
  }: {
    onAuthRequest: (method: "google" | "guest") => Promise<void>;
    onDisconnect: (isGoogle: boolean, isGuest?: boolean) => Promise<void>;
    onAuthSuccess?: () => void;
  }) => {
    const { t } = useTranslation();
    const open = useTopMenuStore((s) => s.open);

    const navItems: NavItem[] = React.useMemo(
      () => [
        { href: "Skins", icon: <User aria-hidden />, label: t("menu.skins") },
        {
          href: "Upgrades",
          icon: <Hammer aria-hidden />,
          label: t("menu.upgrades"),
        },
        {
          href: "Market",
          icon: <Package aria-hidden />,
          label: t("menu.market"),
        },
        {
          href: "Achievements",
          icon: <Trophy aria-hidden />,
          label: t("menu.achievements"),
        },
        {
          href: "Stats",
          icon: <BarChart3 aria-hidden />,
          label: t("menu.stats"),
        },
        {
          href: "Settings",
          icon: <Settings aria-hidden />,
          label: t("menu.settings"),
        },
      ],
      [t],
    );

    return (
      <HeaderShell>
        <div className="hidden lg:block">
          <NavigationBar
            items={navItems}
            activeHref={open ?? undefined}
            LinkComponent={PanelLink}
          />
        </div>

        <div className="absolute left-3 top-3">
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <NavigationBarMobile
              items={navItems}
              activeHref={open ?? undefined}
              LinkComponent={PanelLink}
            />
          </div>
        </div>

        <div className="absolute right-3 top-3">
          <LoginButton
            onAuthRequest={onAuthRequest}
            onDisconnect={onDisconnect}
            onAuthSuccess={onAuthSuccess}
          />
        </div>
      </HeaderShell>
    );
  },
);

Header.displayName = "Header";

// Radix `asChild` injects menuitem role and focus/pointer handlers — must forward ref and spread props.
type PanelLinkProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  ref?: React.Ref<HTMLButtonElement>;
};

const PanelLink = ({
  href,
  className,
  onClick,
  children,
  ref,
  ...rest
}: PanelLinkProps) => {
  const setOpen = useTopMenuStore((s) => s.setOpen);
  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        CISoundMng?.soundsFx.menuChange.updateSound();
        if (href) setOpen(href as TopMenuName);
      }}
      className={cn(className)}
    >
      {children}
    </button>
  );
};
