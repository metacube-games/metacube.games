"use client";

import {
  AwardIcon,
  ShoppingBagIcon,
  PackageIcon,
  StarIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { type NavItem } from "@/components/library/navigation-bar";

export function useMarketNavItems(): NavItem[] {
  const t = useTranslations("navigation");
  return [
    { href: "/rewards", icon: <AwardIcon />, label: t("rewards") },
    { href: "/market", icon: <ShoppingBagIcon />, label: t("market") },
    { href: "/inventory", icon: <PackageIcon />, label: t("inventory") },
    { href: "/collection/allstars", icon: <StarIcon />, label: t("allStars") },
  ];
}
