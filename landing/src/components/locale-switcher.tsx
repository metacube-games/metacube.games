"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { LocaleSwitcher as SharedLocaleSwitcher } from "@/components/library/locale-switcher";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: string) => {
    if (newLocale === locale) return;
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
