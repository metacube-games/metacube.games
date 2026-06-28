import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ExternalLink, Link2 } from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { cn } from "../../../lib/utils";
import { openInSameBrowser } from "../../../utils/browserUtils";
import { METACUBE_MARKET_URL } from "../../../constants";

import { useGStore } from "../../useGeneralStore";
import { getRewardAddress } from "../../../API/backendAPI";

type CollectionName =
  | "Genesis"
  | "Passcard"
  | "Zombie"
  | "Brother"
  | "OGStove"
  | "Allstars";

interface CollectionMeta {
  address: string;
  /** Static thumbnail URL. Used as poster when `video` is set. */
  image: (tokenId: number) => string;
  /** Optional looping mp4 — rendered as `<video>` when present. */
  video?: (tokenId: number) => string;
}

const MARKET_ORIGIN = METACUBE_MARKET_URL;
const MARKET_INVENTORY_URL = `${MARKET_ORIGIN}/inventory`;
const MARKET_HOME_URL = `${MARKET_ORIGIN}/market`;

const COLLECTIONS: Record<CollectionName, CollectionMeta> = {
  Genesis: {
    address:
      "0x007ca74fd0a9239678cc6355e38ac1e7820141501727ae37f9c733e5ed1c3592",
    image: () => "https://felts.xyz/a/g.gif",
    video: () => "https://felts.xyz/a/v.mp4",
  },
  Passcard: {
    address:
      "0x0602c301f6a1c2ef174bafaab7389c3f6165df34736befcf2ca3df7764934caf",
    image: () => "https://felts.xyz/a/p.gif",
    video: () => "https://felts.xyz/a/p.mp4",
  },
  Zombie: {
    address:
      "0x05bee0ba034b07c6246c2e1e6fea2fb7df2c2108603895c367bdece3d0e0b478",
    image: () => `${MARKET_ORIGIN}/images/Zombie.png`,
  },
  Brother: {
    address:
      "0x039189a5de1c0a4ff558276ee48dd1ae9d6a5bd498635420f1f6344e8416b3f7",
    image: () => `${MARKET_ORIGIN}/images/brother.png`,
  },
  OGStove: {
    address:
      "0x05c15109745fd726f302ac7a16fad3f5f073aa07ff6e0fa9291e2c89eb7bc5cd",
    image: () => `${MARKET_ORIGIN}/images/OG_Stove.png`,
  },
  Allstars: {
    address:
      "0x0680e5fe0b71702a1227fa8bcd083c7a8cf7aa535e848b2dd0a82b4d01257255",
    image: (tokenId) => `https://felts.xyz/v1/i/${tokenId}.png`,
  },
};

const COLLECTION_NAMES = Object.keys(COLLECTIONS) as CollectionName[];

interface NFTItem {
  collection: CollectionName;
  tokenId: number;
}

async function fetchTokenIds(
  walletAddress: string,
  contractAddress: string,
): Promise<number[]> {
  const url = `https://indexer.felts.xyz/owned/${contractAddress}/${walletAddress}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (import.meta.env.DEV) {
      console.warn(`Indexer ${res.status} ${res.statusText}`);
    }
    return [];
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

const SKELETON_COUNT = 10;
const SKELETON_KEYS = Array.from(
  { length: SKELETON_COUNT },
  (_, i) => `nft-skeleton-${i}`,
);

const NFTGallery = React.memo(function NFTGallery() {
  const isLogin = useGStore((s) => s.isConnected);
  const googleId = useGStore((s) => s.googleId);
  const guestId = useGStore((s) => s.guestId);
  const isGoogleOrGuest =
    (googleId?.length ?? 0) > 2 || (guestId?.length ?? 0) > 2;

  const { data: rewardAddress = "" } = useQuery({
    queryKey: ["nfts.rewardAddress", isLogin],
    queryFn: async () => {
      const res = await getRewardAddress();
      return res.address ? `0x${res.address}` : "";
    },
    enabled: isLogin,
    refetchOnWindowFocus: false,
  });
  const hasRewardAddress = rewardAddress.length > 5;

  const {
    data: nfts = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["nfts.owned", rewardAddress],
    queryFn: async () => {
      const perCollection = await Promise.all(
        COLLECTION_NAMES.map(async (collection) => {
          const ids = await fetchTokenIds(
            rewardAddress,
            COLLECTIONS[collection].address,
          );
          return ids.map((tokenId) => ({ collection, tokenId }));
        }),
      );
      return perCollection.flat();
    },
    enabled: hasRewardAddress,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="flex flex-col gap-3">
      {!isLogin ? (
        <LoginState />
      ) : isGoogleOrGuest && !hasRewardAddress ? (
        <WalletWarning />
      ) : isError ? (
        <ErrorState />
      ) : (
        <InventorySection loading={isLoading} nfts={nfts} />
      )}
      <DiscoverMoreButton />
    </div>
  );
});
export default NFTGallery;

function MessageCard({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "error";
}) {
  return (
    <Card
      className={cn(
        "flex h-48 items-center justify-center p-3 text-center",
        tone === "error" && "border-destructive/40",
      )}
    >
      <p
        className={cn(
          "text-sm text-muted-foreground",
          tone === "error" && "text-destructive",
        )}
      >
        {children}
      </p>
    </Card>
  );
}

function LoginState() {
  const { t } = useTranslation();
  return <MessageCard>{t("nfts.loginToSeeAssets")}</MessageCard>;
}

function ErrorState() {
  const { t } = useTranslation();
  return <MessageCard tone="error">{t("nfts.errorLoadingAssets")}</MessageCard>;
}

function WalletWarning() {
  const { t } = useTranslation();
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-3 text-center">
      <h3 className="text-base font-semibold">{t("nfts.warning")}</h3>
      <p className="text-sm text-muted-foreground">
        {t("nfts.walletLinkWarning")}
      </p>
      <Button
        variant="outline"
        onClick={() => openInSameBrowser("https://link.metacube.games")}
      >
        <Link2 />
        {t("nfts.linkWallet")}
      </Button>
    </Card>
  );
}

function InventorySection({
  loading,
  nfts,
}: {
  loading: boolean;
  nfts: NFTItem[];
}) {
  const { t } = useTranslation();
  if (!loading && nfts.length === 0) {
    return <MessageCard>{t("nfts.noAssetsYet")}</MessageCard>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {loading
        ? SKELETON_KEYS.map((key) => <NFTCardSkeleton key={key} />)
        : nfts.map((nft) => (
            <NFTCard key={`${nft.collection}-${nft.tokenId}`} nft={nft} />
          ))}
    </div>
  );
}

function NFTCardSkeleton() {
  return (
    <Skeleton className="m-auto aspect-[2/3] w-full max-w-[300px] rounded-lg border-2 bg-card" />
  );
}

function NFTCard({ nft }: { nft: NFTItem }) {
  const { t } = useTranslation();
  const meta = COLLECTIONS[nft.collection];
  const displayName = `${nft.collection} #${nft.tokenId}`;

  return (
    <div className="group m-auto flex h-full w-full max-w-[300px] flex-col overflow-hidden rounded-lg border-2 bg-card">
      <div className="relative w-full aspect-[2/3]">
        {meta.video ? (
          <video
            src={meta.video(nft.tokenId)}
            poster={meta.image(nft.tokenId)}
            aria-label={displayName}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            crossOrigin="anonymous"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <img
            src={meta.image(nft.tokenId)}
            alt={displayName}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 backdrop-blur-sm transition-opacity duration-300 ease-in-out group-hover:opacity-100">
          <div className="translate-y-4 transition-transform duration-300 ease-out group-hover:translate-y-0">
            <Button
              variant="outline"
              onClick={() => openInSameBrowser(MARKET_INVENTORY_URL)}
            >
              <ExternalLink />
              {t("nfts.openInMarket", "Market")}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center border-t-2 px-2 py-1">
        <p className="w-full truncate text-center text-sm font-semibold">
          {displayName}
        </p>
      </div>
    </div>
  );
}

function DiscoverMoreButton() {
  const { t } = useTranslation();
  return (
    <div className="flex justify-center">
      <Button
        variant="outline"
        onClick={() => openInSameBrowser(MARKET_HOME_URL)}
      >
        <ExternalLink />
        {t("nfts.discoverMoreAssets", "Discover more assets")}
      </Button>
    </div>
  );
}
