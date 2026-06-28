"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { Mode, NFTData } from "@/interface";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RarityBadge,
  getRarityGlow,
  getRarityBorder,
} from "@/components/library/rarity-badge";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Sparkles, ShoppingCart, Tag, Eye } from "lucide-react";
import statsData from "../../../../public/final_stats.json";

const MediaViewer = dynamic(
  () => import("../MediaComponents").then((mod) => mod.MediaViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    ),
  },
);

const ModelViewer = dynamic(
  () => import("../MediaComponents").then((mod) => mod.ModelViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    ),
  },
);

interface V1NFTAttribute {
  trait_type: string;
  value: string;
  rarity: string;
}

interface V1NFTMetadata {
  attributes: V1NFTAttribute[];
  name?: string;
  description?: string;
  image?: string;
  [key: string]: unknown;
}

export function NFTDisplay({ nftData }: { nftData: NFTData }) {
  return (
    <div className="w-full lg:aspect-square lg:w-auto h-full p-0 flex items-center justify-center bg-muted">
      <div className="w-auto h-[250px] sm:h-[270px] lg:h-full min-w-[100%] block rounded-t-md lg:rounded-md lg:rounded-r-none overflow-hidden shadow-2xl items-center justify-center">
        <NFTMediaSwitch nftData={nftData} isPopup={true} />
      </div>
    </div>
  );
}

export function NFTMediaSwitch({
  nftData,
  isPopup = true,
  priority,
}: {
  nftData: NFTData;
  isPopup?: boolean;
  /** Eager-load the image (above-the-fold LCP candidates). */
  priority?: boolean;
}) {
  const isV1Collection = nftData?.glbUrl?.includes("felts.xyz/v1/g/");
  const [quality, setQuality] = useState<"standard" | "high">("standard");

  useEffect(() => {
    const handleQualityChange = (e: CustomEvent<"standard" | "high">) => {
      setQuality(e.detail);
    };

    window.addEventListener(
      "qualityChange",
      handleQualityChange as EventListener,
    );
    return () => {
      window.removeEventListener(
        "qualityChange",
        handleQualityChange as EventListener,
      );
    };
  }, []);

  return (
    <>
      {nftData?.glbUrl ? (
        isPopup && isV1Collection ? (
          <ModelViewer
            url={nftData.glbUrl}
            isPopup={isPopup}
            isV1Collection={true}
            quality={quality}
          />
        ) : isPopup || !nftData?.imageUrl ? (
          <ModelViewer
            url={nftData.glbUrl as "zombie" | "ogStove"}
            isPopup={isPopup}
            quality={quality}
          />
        ) : (
          <MediaViewer
            url={nftData.imageUrl as string}
            imageUrl={nftData.imageUrl as string}
            isPopup={isPopup}
            priority={priority}
          />
        )
      ) : nftData?.videoUrl ? (
        <MediaViewer
          url={nftData.videoUrl}
          imageUrl={nftData.imageUrl as string}
          isPopup={isPopup}
          priority={priority}
        />
      ) : nftData?.imageUrl ? (
        <MediaViewer
          url={nftData.imageUrl as string}
          imageUrl={nftData.imageUrl as string}
          isPopup={isPopup}
          priority={priority}
        />
      ) : (
        <></>
      )}
    </>
  );
}

export function NFTDetails({
  nftData,
  mode,
  conditionValid,
}: {
  nftData: NFTData;
  mode: Mode;
  conditionValid?: boolean;
}) {
  const t = useTranslations("nftGrid");
  const conditionsTitle: Record<Mode, string> = {
    Claim: t("details.claimConditions"),
    Buy: t("details.price"),
    Sell: t("details.saleConditions"),
    Details: t("details.details"),
  };

  const [v1Metadata, setV1Metadata] = useState<V1NFTMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isV1Collection =
    nftData.type === "V1AllStars" ||
    nftData?.glbUrl?.includes("felts.xyz/v1/g/");

  const getStatsForAttribute = (traitType: string, value: string) => {
    const categoryMap: Record<string, string> = {
      CoinTexture: "Coin",
      PlaneColor: "Background",
      Skin: "Skin",
      Cube: "Cube",
      Weapon: "Weapon",
    };

    const category =
      categoryMap[traitType as keyof typeof categoryMap] || traitType;

    const categoryData = statsData[category as keyof typeof statsData];
    if (!categoryData) return null;

    const valueData = categoryData[value as keyof typeof categoryData] as
      | {
          count: number;
          percentage: string;
        }
      | undefined;
    if (!valueData) return null;

    return {
      count: valueData.count,
      percentage: valueData.percentage,
    };
  };

  useEffect(() => {
    if (!isV1Collection || !nftData.glbUrl) return;

    const fetchMetadata = async () => {
      try {
        setIsLoading(true);

        const glbUrl = nftData.glbUrl as string;
        const match = glbUrl.match(/\/(\d+)\.glb$/);
        if (!match) {
          throw new Error("Could not extract token ID from GLB URL");
        }

        const tokenId = match[1];
        const response = await fetch(`https://felts.xyz/v1/m/${tokenId}.json`);

        if (!response.ok) {
          throw new Error(`Failed to fetch metadata: ${response.status}`);
        }

        const data = await response.json();
        setV1Metadata(data);
      } catch {
        // Background fetch failure; hide attributes section.
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetadata();
  }, [nftData.glbUrl, isV1Collection]);

  const cleanCollection = nftData?.collection
    ?.replace(/^Metacube:\s*/i, "")
    .trim();
  const tokenLabel =
    nftData?.tokenId !== undefined ? `#${nftData.tokenId}` : "";
  const displayName =
    [cleanCollection, tokenLabel].filter(Boolean).join(" ") || "NFT";
  return (
    <div className="flex-grow overflow-y-auto lg:overflow-y-visible p-4 lg:p-6 lg:pb-4 overflow-auto">
      <DialogHeader>
        <DialogTitle className="text-xl lg:text-2xl font-bold mb-2">
          {mode === "Claim"
            ? t("details.claimTitle", { name: displayName })
            : mode === "Buy"
              ? t("details.buyTitle", { name: displayName })
              : mode === "Sell"
                ? t("details.sellTitle", { name: displayName })
                : t("details.detailsTitle", { name: displayName })}
        </DialogTitle>
        <DialogDescription className="text-sm">
          {nftData.descriptionCollection}
          <br />
          <span className="text-muted-foreground">
            {nftData.description && <>{nftData.description}</>}
          </span>
        </DialogDescription>
      </DialogHeader>

      {mode !== "Details" && (
        <div className="mt-4 lg:mt-6">
          {mode !== "Buy" && (
            <h3 className="text-base lg:text-lg font-semibold mb-2">
              {conditionsTitle[mode]}
            </h3>
          )}
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {mode === "Claim" &&
              nftData.claimConditions?.map(
                (condition: string, index: number) => (
                  <li
                    key={index}
                    className={
                      conditionValid ? "text-primary" : "text-destructive"
                    }
                  >
                    {condition}
                  </li>
                ),
              )}
            {mode === "Sell" && null}
          </ul>
        </div>
      )}

      <div className="mt-4 lg:mt-6">
        <h3 className="text-base lg:text-lg font-semibold mb-2">
          {t("details.nftDetails")}
        </h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-semibold">{t("details.collection")}</span>{" "}
            <span className="italic">{nftData.collection}</span>
          </p>
          {nftData.tokenId !== undefined && (
            <p>
              <span className="font-semibold">{t("details.tokenId")}</span>{" "}
              <span className="italic">{nftData.tokenId}</span>
            </p>
          )}
          {nftData.rarity && (
            <div>
              <span className="font-semibold">{t("details.rarity")}</span>{" "}
              <RarityBadge rarity={nftData.rarity} className="ml-1" />
            </div>
          )}
        </div>
      </div>

      {isV1Collection && (
        <div className="mt-4 lg:mt-6">
          <h3 className="text-base lg:text-lg font-semibold mb-2">
            {t("details.attributes")}
          </h3>

          {isLoading && (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          )}

          {!isLoading && v1Metadata?.attributes && (
            <div className="grid grid-cols-2 gap-3 xs:gap-4 mt-3">
              {v1Metadata.attributes.map((attr, index) => {
                const stats = getStatsForAttribute(attr.trait_type, attr.value);

                return (
                  <div
                    key={index}
                    className={`rounded-md overflow-hidden flex flex-col bg-card ${getRarityGlow(
                      attr.rarity,
                    )} ${getRarityBorder(
                      attr.rarity,
                    )} transition-all duration-300 hover:scale-105 hover:z-10`}
                  >
                    <div className="px-2 py-1 border-b">
                      <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                        {attr.trait_type === "CoinTexture"
                          ? "Coin"
                          : attr.trait_type === "PlaneColor"
                            ? "Background"
                            : attr.trait_type}
                      </div>
                    </div>

                    <div className="px-2 py-1.5 flex flex-col flex-grow gap-1">
                      <div className="text-xs font-semibold leading-tight">
                        {attr.value}
                      </div>

                      {stats && (
                        <div className="text-xs text-muted-foreground">
                          {stats.count} ({stats.percentage})
                        </div>
                      )}

                      <RarityBadge
                        rarity={attr.rarity}
                        className="mt-auto self-start"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ActionButton({
  mode,
  isLoading,
  isApproving,
  additionalText,
  handleClick,
  disabled,
  loadingElement,
  needPadding = true,
}: {
  mode: Mode | string;
  additionalText?: string;
  isLoading: boolean;
  isApproving?: boolean;
  handleClick: () => void;
  disabled?: boolean;
  loadingElement?: React.ReactNode;
  needPadding?: boolean;
}) {
  const t = useTranslations("nftGrid");
  const normalizedMode =
    typeof mode === "string"
      ? mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase()
      : mode;

  const buttonConfig = {
    Claim: {
      text: `${t("actions.claim")}${additionalText ? ` ${additionalText}` : ""}`,
      loadingText: t("actions.claiming"),
      variant: "outline",
      Icon: Sparkles,
    },
    Buy: {
      text: t("actions.buyNow"),
      loadingText: isApproving ? t("actions.approving") : t("actions.buying"),
      variant: "outline",
      Icon: ShoppingCart,
    },
    Sell: {
      text: t("actions.sellNft"),
      loadingText: t("actions.selling"),
      variant: "outline",
      Icon: Tag,
    },
    Details: {
      text: t("actions.details"),
      loadingText: t("common.loading"),
      variant: "outline",
      Icon: Eye,
    },
  } as const;

  const { text, loadingText, variant, Icon } = buttonConfig[
    normalizedMode as Mode
  ] || {
    text: t("actions.confirm"),
    loadingText: t("common.processing"),
    variant: "outline",
    Icon: Sparkles,
  };

  const defaultLoadingElement = (
    <>
      <Loader2 className="animate-spin" />
      <span>{loadingText}</span>
    </>
  );

  return (
    <div className={`bg-background border-t ${needPadding ? "p-4" : ""}`}>
      <Button
        className="w-full"
        variant={variant}
        disabled={isLoading || disabled}
        onClick={handleClick}
      >
        {isLoading ? (
          loadingElement || defaultLoadingElement
        ) : (
          <>
            <Icon />
            {text}
          </>
        )}
      </Button>
    </div>
  );
}
