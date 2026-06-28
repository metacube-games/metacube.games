"use client";

import { useState } from "react";
import { Languages, Play } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LocaleEntry = { code: string; flag: string; label: string };

const DEFAULT_LOCALES: LocaleEntry[] = [
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
  { code: "es", flag: "🇪🇸", label: "Español" },
];

/** Locale switcher; controlled via `locale`+`onLocaleChange`, otherwise self-managed. */
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
  const [internalLocale, setInternalLocale] = useState(
    locales[0]?.code ?? "en",
  );
  const currentCode = locale ?? internalLocale;
  const handleSwitch = onLocaleChange ?? setInternalLocale;
  const current =
    locales.find((l) => l.code === currentCode) ??
    locales[0] ??
    DEFAULT_LOCALES[0]!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          aria-label="Select language"
          disabled={isPending}
        >
          <Languages aria-hidden />
          <span className="hidden lg:inline">{current.label}</span>
          <span className="lg:hidden">{current.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="!min-w-fit">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => handleSwitch(l.code)}
            disabled={isPending}
            className="cursor-pointer"
            role="menuitemradio"
            aria-current={l.code === currentCode}
          >
            <span className="mr-2 text-base" aria-hidden>
              {l.flag}
            </span>
            <span className="text-sm">{l.label}</span>
            <Play
              aria-hidden
              className={cn(
                "ml-auto size-3.5 rotate-180 fill-current",
                l.code === currentCode ? "text-primary" : "invisible",
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
