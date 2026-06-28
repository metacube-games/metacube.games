"use client";

import type { NFT, NFTFetchResponse, FetchConfig } from "@/interface";
import type { RarityRank } from "../rarityData";

const MAX_TOKEN_ID = 9999;

export function createNFTFetcher(
  debouncedSearchTerm: string,
  gridItemsPerRow: number,
  fetchConfig: FetchConfig,
  rarityRanks: RarityRank[],
) {
  return async (pageParam: number): Promise<NFTFetchResponse> => {
    try {
      if (!debouncedSearchTerm) {
        const basePageSize = fetchConfig.pageSize || 30;
        const pageSize =
          Math.ceil(basePageSize / gridItemsPerRow) * gridItemsPerRow;

        if (fetchConfig.displayMode === "rarity" && rarityRanks.length > 0) {
          return fetchRarityBasedNFTs(pageParam, pageSize, rarityRanks);
        } else {
          return fetchSequentialNFTs(pageParam, pageSize);
        }
      }

      return searchNFTs(pageParam, debouncedSearchTerm);
    } catch {
      return {
        nfts: [],
        hasMore: false,
        nextPage: pageParam,
      };
    }
  };
}

function fetchRarityBasedNFTs(
  pageParam: number,
  pageSize: number,
  rarityRanks: RarityRank[],
): NFTFetchResponse {
  const startIndex = pageParam * pageSize;
  const endIndex = Math.min(startIndex + pageSize, rarityRanks.length);

  const pageRarityRanks = rarityRanks.slice(startIndex, endIndex);

  const nfts = pageRarityRanks.map((rarity) => {
    const tokenId = rarity.id;
    return createNFTObject(tokenId);
  });

  return {
    nfts,
    hasMore: endIndex < rarityRanks.length,
    nextPage: pageParam + 1,
  };
}

function fetchSequentialNFTs(
  pageParam: number,
  pageSize: number,
): NFTFetchResponse {
  const startIndex = pageParam * pageSize;
  const endIndex = Math.min(startIndex + pageSize, MAX_TOKEN_ID);

  const nfts = Array.from({ length: endIndex - startIndex }, (_, i) => {
    const tokenId = startIndex + i;
    return createNFTObject(tokenId);
  });

  return {
    nfts,
    hasMore: endIndex < MAX_TOKEN_ID,
    nextPage: pageParam + 1,
  };
}

function searchNFTs(pageParam: number, searchTerm: string): NFTFetchResponse {
  const totalSearchBatchSize = 800;
  const startIndex = pageParam * totalSearchBatchSize;
  const endIndex = Math.min(startIndex + totalSearchBatchSize, MAX_TOKEN_ID);

  const nfts = Array.from({ length: endIndex - startIndex }, (_, i) => {
    const tokenId = startIndex + i;
    if (tokenId.toString().includes(searchTerm)) {
      return createNFTObject(tokenId);
    }
    return null;
  })?.filter(Boolean) as NFT[];

  return {
    nfts,
    hasMore: endIndex < MAX_TOKEN_ID,
    nextPage: pageParam + 1,
  };
}

function createNFTObject(tokenId: number): NFT {
  return {
    id: `v1-collection-${tokenId}`,
    name: `Allstars #${tokenId}`,
    type: "Allstars",
    imageUrl: `https://felts.xyz/v1/i/${tokenId}.png`,
    glbUrl: `https://felts.xyz/v1/g/${tokenId}.glb`,
    tokenId: tokenId,
  };
}
