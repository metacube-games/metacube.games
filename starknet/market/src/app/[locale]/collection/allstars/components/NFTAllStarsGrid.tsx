"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useHandleScroll } from "@/hooks/useHandleScroll";
import { useNFTDataMatcher } from "@/hooks/useNFTDataMatcher";
import type { FetchConfig } from "@/interface";
import type { RarityRank } from "../rarityData";
import { NFTCardGrid } from "@/components/nft-grid/NFT";
import { NFTSearchSection } from "./NFTSearchSection";
import { NFTGridStatusSection } from "./NFTGridStatusSection";
import { createNFTFetcher } from "../services/nftFetchService";
import { SkeletonRow } from "@/components/nft-grid/Skeleton";

interface NFTAllStarsGridProps {
  fetchConfig: FetchConfig;
  initialRarityRanks: RarityRank[];
  sortControls?: React.ReactNode;
}

const SEARCH_DEBOUNCE_MS = 500;
const DEFAULT_GRID_ITEMS_PER_ROW = 10;
const MIN_INITIAL_NFT_COUNT = 50;

export function NFTAllStarsGrid({
  fetchConfig,
  initialRarityRanks,
  sortControls,
}: NFTAllStarsGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [gridItemsPerRow, setGridItemsPerRow] = useState(
    DEFAULT_GRID_ITEMS_PER_ROW,
  );

  const [rarityRanks, setRarityRanks] =
    useState<RarityRank[]>(initialRarityRanks);
  const [isLoadingRarity, setIsLoadingRarity] = useState(false);

  const { getNftData } = useNFTDataMatcher();

  useEffect(() => {
    const fetchRarityRanks = async () => {
      if (fetchConfig.displayMode === "rarity" && rarityRanks.length === 0) {
        setIsLoadingRarity(true);
        try {
          const response = await fetch("/rarity_ranks.json");
          if (!response.ok) {
            throw new Error("Failed to fetch rarity ranks");
          }
          const data = await response.json();
          setRarityRanks(data);
        } catch {
          // Background fetch failure; rarity ranks are decorative.
        } finally {
          setIsLoadingRarity(false);
        }
      }
    };

    fetchRarityRanks();
  }, [fetchConfig.displayMode, rarityRanks.length]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      let newGridItemsPerRow = DEFAULT_GRID_ITEMS_PER_ROW;

      if (width < 640) newGridItemsPerRow = 2;
      else if (width < 768) newGridItemsPerRow = 3;
      else if (width < 1024) newGridItemsPerRow = 4;
      else if (width < 1280) newGridItemsPerRow = 6;
      else if (width < 1536) newGridItemsPerRow = 8;

      setGridItemsPerRow(newGridItemsPerRow);
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
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const fetchNFTs = useMemo(
    () =>
      createNFTFetcher(
        debouncedSearchTerm,
        gridItemsPerRow,
        fetchConfig,
        rarityRanks,
      ),
    [debouncedSearchTerm, gridItemsPerRow, fetchConfig, rarityRanks],
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error,
    isLoading,
  } = useInfiniteQuery({
    queryKey: [
      "nfts",
      "v1collection",
      debouncedSearchTerm,
      gridItemsPerRow,
      fetchConfig.displayMode,
    ],
    queryFn: async ({ pageParam = 0 }) => {
      return fetchNFTs(pageParam as number);
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
    initialPageParam: 0,
  });

  const isPageLoading =
    isLoading || (fetchConfig.displayMode === "rarity" && isLoadingRarity);

  const allNfts = useMemo(
    () => data?.pages.flatMap((page) => page.nfts) ?? [],
    [data?.pages],
  );

  // queryKey already contains debouncedSearchTerm so React Query refetches
  // on its own; this effect only resets the scroll position to the top
  // when the settled search term changes.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [debouncedSearchTerm]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  useHandleScroll(
    hasNextPage ?? false,
    isFetchingNextPage as boolean,
    fetchNextPage as () => void,
  );

  useEffect(() => {
    if (
      !isLoading &&
      !isFetchingNextPage &&
      hasNextPage &&
      allNfts?.length < MIN_INITIAL_NFT_COUNT
    ) {
      fetchNextPage();
    }
  }, [allNfts, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading]);

  const skeletonKeys = useMemo(
    () => Array.from({ length: gridItemsPerRow * 4 }, (_, index) => index + 1),
    [gridItemsPerRow],
  );

  const renderNFTRows = useCallback(() => {
    if (isLoading && allNfts.length > 1) {
      return <SkeletonRow keys={skeletonKeys} />;
    }
    return (
      <NFTCardGrid
        NBNft={allNfts}
        buttonAction="Details"
        getNftData={getNftData}
      />
    );
  }, [allNfts, getNftData, isLoading, skeletonKeys]);

  return (
    <div>
      <NFTSearchSection
        isLoading={isPageLoading}
        onSearch={handleSearch}
        sortControls={sortControls}
      />

      <div>
        <NFTGridStatusSection
          isLoading={isPageLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasItems={allNfts?.length > 0}
          error={error}
          searchTerm={debouncedSearchTerm}
          skeletonKeys={skeletonKeys}
        />

        {!isPageLoading && allNfts?.length > 0 && renderNFTRows()}
      </div>
    </div>
  );
}
