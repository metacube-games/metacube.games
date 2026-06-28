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

export type LocaleEntry = { code: string; flag: string; label: string };

export const DEFAULT_LOCALES: LocaleEntry[] = [
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
  { code: "es", flag: "🇪🇸", label: "Español" },
];

/**
 * Single canonical locale switcher used across every Metacube frontend.
 *
 * Controlled / uncontrolled:
 * - Pass `locale` + `onLocaleChange` to wire it to your router (this is what
 *   market, link-wallet and landing do via next-intl + next/navigation).
 * - Omit them and the component manages its own state — useful for the UI
 *   showcase and any preview where switching is cosmetic.
 *
 * The visual surface (Button trigger, dropdown items, ✓ marker, paddings,
 * font sizes, alignment) is defined ONCE here. Apps must NEVER fork this
 * file — only wrap it with their routing logic.
 */
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
  const [internalLocale, setInternalLocale] = useState(locales[0]?.code ?? "en");
  const currentCode = locale ?? internalLocale;
  const handleSwitch = onLocaleChange ?? setInternalLocale;
  const current = locales.find((l) => l.code === currentCode) ?? locales[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* No size override — canonical default Button (h-9) for mobile hit target. */}
        <Button
          variant="outline"
          aria-label="Select language"
          disabled={isPending}
        >
          <Languages aria-hidden />
          {/*
            Switches at `lg` (in lockstep with the NavigationBar pill /
            mobile dropdown). PlayButton + LoginButton flip earlier at
            `xl` because their long form is wider and runs out of room
            sooner.
          */}
          <span className="hidden lg:inline">{current.label}</span>
          <span className="lg:hidden">{current.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      {/*
        `!min-w-fit` overrides the shadcn `DropdownMenuContent` default
        floor of `min-w-[8rem]` (128px) so the popover sizes strictly to
        its widest row — the longest label in the active language plus
        the reserved marker slot below.
      */}
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
            {/*
              Marker slot is rendered on EVERY row (transparent when
              inactive) — that way the dropdown auto-sizes to "longest
              label + marker width", and the marker on the selected row
              always sits at the same x position via `ml-auto`. Without
              this placeholder the inactive rows would be narrower, the
              container would shrink, and the active row's marker would
              hug the label instead of the right edge.

              Marker shape: same Play triangle as the green CTA button,
              filled (`fill-current`) and rotated 180° to point left
              toward the item label.
            */}
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
