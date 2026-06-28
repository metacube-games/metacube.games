"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { LocaleSwitcher as SharedLocaleSwitcher } from "@/components/library/locale-switcher";

/**
 * App-local LocaleSwitcher = the canonical shared LocaleSwitcher wrapped
 * with next-intl + next/navigation glue that swaps the `[locale]` segment
 * in the URL on click. Same body across every i18n app (market /
 * link-wallet / landing) — only the consuming Header import changes.
 * NOTHING about the visual surface lives here — see the canonical file.
 */
export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: string) => {
    if (newLocale === locale) return;
    // Replace the locale segment (position 1) — `/en/blog/foo` → `/fr/blog/foo`.
    const segments = pathname.split("/");
    segments[1] = newLocale;
    startTransition(() => {
      router.push(segments.join("/"));
    });
  };

  return (
    <SharedLocaleSwitcher
      locale={locale}
      onLocaleChange={switchLocale}
      isPending={isPending}
    />
  );
}
