"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { NFTCardGrid } from "./NFT";
import type {
  FetchConfig,
  NFTFetchResponse,
  StarknetConfig,
  ButtonAction,
  DisplayMode,
  NFTListing,
  NFT,
} from "@/interface";
import { SkeletonRow } from "./Skeleton";
import { useHandleScroll } from "@/hooks/useHandleScroll";
import { useAccount } from "@starknet-react/core";
import { useStarknetProvider } from "@/hooks/useStarknetProvider";
import { useNFTDataMatcher } from "@/hooks/useNFTDataMatcher";
import { useConnectWallet } from "@/hooks/useConnectWallet";
import { FilterRow } from "./FilterRow";
import { LoginPrompt, EmptyMessage, ErrorMessage } from "./Messages";

const DEFAULT_FETCH_CONFIG: FetchConfig = {
  queryKey: "regular",
  pageSize: 10,
  maxPages: 10,
  fetchDelay: 300,
  apiUrl: "",
};

export function NFTClientGrid({
  fetchConfig,
  starknetConfig,
  buttonAction = "Claim",
  displayMode = "owned",
}: {
  fetchConfig?: FetchConfig;
  starknetConfig?: StarknetConfig;
  buttonAction?: ButtonAction;
  displayMode?: DisplayMode;
}) {
  const t = useTranslations("nft");
  const { address, isConnected, status } = useAccount();
  const { provider } = useStarknetProvider();
  const isConnecting = status === "connecting" || status === "reconnecting";
  const { getNftData } = useNFTDataMatcher(starknetConfig?.contracts);
  const connectWallet = useConnectWallet();

  const [selectedFilter, setSelectedFilter] = useState("all");

  const { data: userListings = [] } = useQuery<NFTListing[]>({
    queryKey: ["listings", address],
    queryFn: async () => {
      if (!address || !isConnected) return [];
      try {
        const { fetchUserListings } =
          await import("../../services/nftFetchers");
        const listings = await fetchUserListings(address);
        return listings || [];
      } catch {
        return [];
      }
    },
    enabled: isConnected && !!address && displayMode === "owned",
  });

  const listedNftsMap = useMemo(() => {
    const map = new Map<string, NFTListing>();
    userListings.forEach((listing) => {
      const key = `${listing.contract}-${listing.tokenId}`;
      map.set(key, listing);
    });
    return map;
  }, [userListings]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error,
    isLoading,
  } = useInfiniteQuery<NFTFetchResponse>({
    queryKey: [
      "nfts",
      starknetConfig ? "starknet" : fetchConfig?.queryKey || "regular",
      address,
      displayMode,
    ],
    queryFn: async ({ pageParam = 0 }) => {
      if (starknetConfig?.enabled) {
        const { fetchStarknetNfts } =
          await import("../../services/nftFetchers");
        return fetchStarknetNfts(
          pageParam as number,
          starknetConfig,
          address || "",
          displayMode,
          provider,
        );
      } else if (fetchConfig?.queryKey === "v1collection") {
        const { fetchV1CollectionNfts } =
          await import("../../services/nftFetchers");
        return fetchV1CollectionNfts(pageParam as number, fetchConfig);
      } else {
        const { fetchRegularNfts } = await import("../../services/nftFetchers");
        return fetchRegularNfts(
          pageParam as number,
          fetchConfig || DEFAULT_FETCH_CONFIG,
        );
      }
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
    initialPageParam: 0,
    enabled: starknetConfig?.enabled
      ? displayMode === "owned"
        ? isConnected
        : true
      : true,
  });

  const allNfts = useMemo(
    () => data?.pages.flatMap((page) => page.nfts) ?? [],
    [data?.pages],
  );

  const collections = useMemo(() => {
    const uniqueCollections = new Set<string>();
    allNfts.forEach((nft) => {
      const nftData = getNftData(nft);
      if (nftData?.collection) {
        uniqueCollections.add(nftData.collection);
      }
    });
    return Array.from(uniqueCollections);
  }, [allNfts, getNftData]);

  const filteredNfts = useMemo(() => {
    if (selectedFilter === "all") return allNfts;

    if (selectedFilter === "listed") {
      return allNfts?.filter((nft) => {
        const key = `${nft.contractAddress}-${nft.tokenId}`;
        return listedNftsMap.has(key);
      });
    }

    return allNfts?.filter((nft) => {
      const nftData = getNftData(nft);
      return nftData?.collection?.toLowerCase() === selectedFilter;
    });
  }, [allNfts, selectedFilter, getNftData, listedNftsMap]);

  const [delayedLoading, setDelayedLoading] = useState(true);

  const [GridItemsPerRow, setGridItemsPerRow] = useState(20);
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if ((isLoading && !data) || delayedLoading) {
        if (width < 640) {
          setGridItemsPerRow(2);
        } else if (width < 1024) {
          setGridItemsPerRow(4);
        } else {
          setGridItemsPerRow(20);
        }
        return;
      }

      if (width < 640) {
        setGridItemsPerRow(2);
      } else if (width < 768) {
        setGridItemsPerRow(3);
      } else if (width < 1024) {
        setGridItemsPerRow(4);
      } else if (width < 1280) {
        setGridItemsPerRow(6);
      } else if (width < 1536) {
        setGridItemsPerRow(8);
      } else {
        setGridItemsPerRow(10);
      }
    };
    handleResize();
    let frame = 0;
    const onResize = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        handleResize();
      });
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [isLoading, data, delayedLoading]);

  useHandleScroll(
    hasNextPage ?? false,
    isFetchingNextPage as boolean,
    fetchNextPage as () => void,
  );

  const SkeletonKeys = useMemo(() => {
    return Array.from({ length: GridItemsPerRow * 3 }, (_, index) => index + 1);
  }, [GridItemsPerRow]);

  useEffect(() => {
    if (!isLoading && !isConnected) {
      const timeout = setTimeout(() => {
        setDelayedLoading(false);
      }, 1000);
      return () => clearTimeout(timeout);
    } else if (isConnected) {
      setDelayedLoading(false);
    }
  }, [isLoading, isConnected]);

  const getNftDataWithListing = useCallback(
    (nft: NFT) => {
      const nftData = getNftData(nft);
      if (!nftData) return undefined;

      const key = `${nft.contractAddress}-${nft.tokenId}`;
      const listing = listedNftsMap.get(key);

      if (listing) {
        return {
          ...nftData,
          isListed: true,
          listingPrice: listing.details.price,
        };
      }

      return nftData;
    },
    [getNftData, listedNftsMap],
  );

  if (error) {
    return <ErrorMessage error={error} />;
  }

  const loadingStates = isLoading || isConnecting || delayedLoading;
  return (
    <>
      {!(
        displayMode === "owned" &&
        !loadingStates &&
        (!isConnected || allNfts.length === 0)
      ) && (
        <FilterRow
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
          collections={collections}
          isConnected={isConnected}
          hasListings={userListings?.length > 0}
        />
      )}

      {loadingStates ? (
        <SkeletonRow keys={SkeletonKeys} />
      ) : filteredNfts?.length > 0 ? (
        <NFTCardGrid
          NBNft={filteredNfts}
          buttonAction={buttonAction}
          getNftData={getNftDataWithListing}
        />
      ) : null}

      {isFetchingNextPage && <SkeletonRow keys={SkeletonKeys} />}

      {!loadingStates && allNfts?.length === 0 && (
        <div className="text-center py-10">
          {displayMode === "owned" && !isConnected ? (
            <LoginPrompt openLoginDialog={connectWallet} />
          ) : (
            <EmptyMessage />
          )}
        </div>
      )}

      {!loadingStates && allNfts?.length > 0 && filteredNfts?.length === 0 && (
        <div className="text-center py-10">
          <EmptyMessage message={t("emptyStateWithFilter")} />
        </div>
      )}
    </>
  );
}
