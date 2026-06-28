"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ActiveMarker } from "@/components/library/active-marker";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n/config";

type LocaleEntry = { code: string; flag: string; label: string };

const LOCALE_META: Record<SupportedLanguage, { flag: string; label: string }> =
  {
    en: { flag: "🇬🇧", label: "English" },
    fr: { flag: "🇫🇷", label: "Français" },
    de: { flag: "🇩🇪", label: "Deutsch" },
    es: { flag: "🇪🇸", label: "Español" },
  };

const DEFAULT_LOCALES: LocaleEntry[] = SUPPORTED_LANGUAGES.map((code) => ({
  code,
  flag: LOCALE_META[code].flag,
  label: LOCALE_META[code].label,
}));

/** Canonical locale switcher. Controlled via `locale`/`onLocaleChange`, or self-managed if omitted. */
export function LocaleSwitcher({
  locales = DEFAULT_LOCALES,
  locale,
  onLocaleChange,
  isPending,
}: {
  locales?: LocaleEntry[];
  locale?: string;
  onLocaleChange?: (locale: string) => void;
  isPending?: boolean;
} = {}) {
  const { t } = useTranslation();
  const [internalLocale, setInternalLocale] = useState(
    locales[0]?.code ?? "en",
  );
  const currentCode = locale ?? internalLocale;
  const handleSwitch = onLocaleChange ?? setInternalLocale;
  const current = locales.find((l) => l.code === currentCode) ?? locales[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          aria-label={t("ui.selectLanguage")}
          disabled={isPending}
        >
          <Languages aria-hidden />
          <span className="hidden lg:inline">{current.label}</span>
          <span className="lg:hidden">{current.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      {/* `!min-w-fit` overrides shadcn's `min-w-[8rem]` floor so popover sizes to widest row. */}
      <DropdownMenuContent align="start" className="!min-w-fit">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => handleSwitch(l.code)}
            disabled={isPending}
            className="cursor-pointer"
            role="menuitemradio"
            aria-checked={l.code === currentCode}
            aria-current={l.code === currentCode}
          >
            <span className="mr-2 text-base" aria-hidden>
              {l.flag}
            </span>
            <span className="text-sm">{l.label}</span>
            {/* Marker rendered on every row (invisible when inactive) to stabilize dropdown width. */}
            <ActiveMarker active={l.code === currentCode} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
