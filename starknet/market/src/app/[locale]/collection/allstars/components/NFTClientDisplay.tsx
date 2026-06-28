"use client";

import { memo, startTransition, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SortAsc, Gem } from "lucide-react";
import type { RarityRank } from "../rarityData";
import { NFTAllStarsGrid } from "./NFTAllStarsGrid";
import { useSearchParams } from "next/navigation";

interface NFTClientDisplayProps {
  initialRarityRanks: RarityRank[];
}

export const NFTClientDisplay = memo(function NFTClientDisplay({
  initialRarityRanks,
}: NFTClientDisplayProps) {
  const t = useTranslations("allstars");
  const searchParams = useSearchParams();

  const [displayMode, setDisplayMode] = useState<"default" | "rarity">(
    () => (searchParams.get("mode") === "rarity" ? "rarity" : "default"),
  );

  const fetchConfig = useMemo(
    () => ({
      queryKey: "v1collection",
      pageSize: 30,
      maxPages: 50,
      fetchDelay: 0,
      apiUrl: "https://felts.xyz/v1/i",
      displayMode,
    }),
    [displayMode],
  );

  // Inline (not useEffect): `useSearchParams()` returns a fresh ref each render in Next 16.2+, causing a loop.
  const handleDisplayModeChange = (mode: "default" | "rarity") => {
    startTransition(() => {
      setDisplayMode(mode);
    });
    const params = new URLSearchParams(searchParams.toString());
    if (mode === "default") params.delete("mode");
    else params.set("mode", mode);
    const newUrl = `${window.location.pathname}${
      params.toString() ? `?${params.toString()}` : ""
    }`;
    window.history.pushState({}, "", newUrl);
  };

  const sortControls = (
    <>
      <Button
        variant={displayMode === "default" ? "secondary" : "outline"}
        onClick={() => handleDisplayModeChange("default")}
      >
        <SortAsc className="h-4 w-4 mr-2" />
        {t("sortDefault")}
      </Button>
      <Button
        variant={displayMode === "rarity" ? "secondary" : "outline"}
        onClick={() => handleDisplayModeChange("rarity")}
      >
        <Gem className="h-4 w-4 mr-2" />
        {t("sortRarity")}
      </Button>
    </>
  );

  return (
    <NFTAllStarsGrid
      fetchConfig={fetchConfig}
      initialRarityRanks={initialRarityRanks}
      sortControls={sortControls}
    />
  );
});

NFTClientDisplay.displayName = "NFTClientDisplay";
