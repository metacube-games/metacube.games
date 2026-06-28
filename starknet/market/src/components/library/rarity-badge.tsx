import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const RARITY_CLASS: Record<string, string> = {
  common:
    "bg-gradient-to-r from-slate-600 to-slate-700 text-slate-200 border-slate-500",
  uncommon:
    "bg-gradient-to-r from-primary to-primary/80 text-black border-primary",
  rare: "bg-gradient-to-r from-blue-600 to-cyan-500 text-blue-100 border-blue-500",
  epic: "bg-gradient-to-r from-purple-600 to-violet-500 text-white border-violet-500",
  legendary:
    "bg-gradient-to-r from-amber-500 to-orange-400 text-amber-100 border-amber-500",
  mythic:
    "bg-gradient-to-r from-red-600 to-rose-500 text-white border-red-500",
};

const RARITY_GLOW: Record<string, string> = {
  common: "shadow-[0_0_5px_rgba(148,163,184,0.2)]",
  uncommon: "shadow-[0_0_12px_rgba(14,198,48,0.4)]",
  rare: "shadow-[0_0_18px_rgba(59,130,246,0.5)]",
  epic: "shadow-[0_0_24px_rgba(139,92,246,0.6)]",
  legendary: "shadow-[0_0_30px_rgba(245,158,11,0.7)]",
  mythic: "shadow-[0_0_40px_rgba(239,68,68,0.8)]",
};

const RARITY_BORDER: Record<string, string> = {
  common: "border border-slate-600",
  uncommon: "border-2 border-primary",
  rare: "border-2 border-blue-600",
  epic: "border-2 border-purple-600",
  legendary: "border-[3px] border-amber-500",
  mythic: "border-[3px] border-red-600",
};

function getRarityClass(rarity: string): string {
  return RARITY_CLASS[rarity.toLowerCase()] ?? RARITY_CLASS.common!;
}

export function getRarityGlow(rarity: string): string {
  return RARITY_GLOW[rarity.toLowerCase()] ?? RARITY_GLOW.common!;
}

export function getRarityBorder(rarity: string): string {
  return RARITY_BORDER[rarity.toLowerCase()] ?? RARITY_BORDER.common!;
}

/** Drop-in `<Badge>` styled by NFT rarity tier. */
export function RarityBadge({
  rarity,
  className,
  ...props
}: { rarity: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Badge
      className={cn(
        "border-0 font-semibold",
        getRarityClass(rarity),
        getRarityGlow(rarity),
        className,
      )}
      {...props}
    >
      {rarity}
    </Badge>
  );
}
