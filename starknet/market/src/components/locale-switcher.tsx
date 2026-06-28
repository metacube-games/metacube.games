"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { LocaleSwitcher as SharedLocaleSwitcher } from "@/components/library/locale-switcher";

/** next-intl + next/navigation glue for the shared LocaleSwitcher. Visual surface lives in the canonical file. */
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
