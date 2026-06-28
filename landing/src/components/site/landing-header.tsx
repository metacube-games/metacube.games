"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { BookOpen, Home as HomeIcon, Tv } from "lucide-react";

import { Header } from "@/components/library/header";
import { LocaleSwitcher } from "@/components/locale-switcher";
import type { NavItem } from "@/components/library/navigation-bar";

export const LANDING_NAV: NavItem[] = [
  { href: "/", icon: <HomeIcon />, label: "Home" },
  { href: "/community-streams", icon: <Tv />, label: "Streams" },
  { href: "/blog", icon: <BookOpen />, label: "Blog" },
];

export function LandingHeader() {
  const pathname = usePathname() ?? "/";
  const stripped = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
  const active = stripped.startsWith("/blog")
    ? "/blog"
    : stripped.startsWith("/community-streams")
      ? "/community-streams"
      : "/";
  return (
    <Header
      navItems={LANDING_NAV}
      activeHref={active}
      navLinkComponent={Link}
      localeSwitcher={<LocaleSwitcher />}
    />
  );
}
