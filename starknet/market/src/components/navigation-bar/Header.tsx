"use client";

import { Header as SharedHeader } from "@/components/library/header";
import { useMarketNavItems } from "@/components/navigation-bar/NavigationBar";
import { LoginButton } from "@/components/navigation-bar/LoginButton";
import { LocaleSwitcher } from "@/components/locale-switcher";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

export function Header() {
  const t = useTranslations("navigation");
  const items = useMarketNavItems();
  const pathname = usePathname();
  const locale = useLocale();
  const activeHref = pathname.replace(new RegExp(`^/${locale}`), "") || "/";

  return (
    <SharedHeader
      navItems={items}
      activeHref={activeHref}
      navLinkComponent={Link}
      localeSwitcher={<LocaleSwitcher />}
      loginSlot={<LoginButton />}
      playLabel={t("play")}
      playSecondary={t("playMetacube")}
      playAriaLabel={`${t("play")} ${t("playMetacube")}`}
    />
  );
};
