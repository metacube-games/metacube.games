import { useCallback, useMemo } from "react";
import type { NFT, NFTListing } from "@/interface";
import { BASE_CONTRACTS, CONTRACT_ADDRESSES } from "@/data/contracts";
import { WEI_PER_STRK } from "@/utils/blockchain";

// Returns a resolver that, given an NFT from the grid, looks up the
// matching listing and produces the full display tuple consumed by
// <NFTCardGrid getNftData={...} />.
export function useListingNftDataResolver(listedNfts: NFTListing[]) {
  const listingsByKey = useMemo(() => {
    const map = new Map<string, NFTListing>();
    for (const listing of listedNfts) {
      map.set(`${listing.contract}:${listing.tokenId}`, listing);
    }
    return map;
  }, [listedNfts]);

  return useCallback(
    (nft: NFT) => {
      const listing = listingsByKey.get(
        `${nft.contractAddress}:${nft.tokenId?.toString()}`,
      );
      if (!listing) return undefined;

      const isV1Collection =
        listing.contract === CONTRACT_ADDRESSES.V1_COLLECTION;
      const isGenesis = listing.contract === CONTRACT_ADDRESSES.GENESIS;
      const isPasscard = listing.contract === CONTRACT_ADDRESSES.PASSCARD;
      const isZombie = listing.contract === CONTRACT_ADDRESSES.ZOMBIE;
      const isOgStove = listing.contract === CONTRACT_ADDRESSES.OG_STOVE;
      const isBrother = listing.contract === CONTRACT_ADDRESSES.BROTHER;

      const currentContractDescrp = isGenesis
        ? BASE_CONTRACTS.genesis
        : isPasscard
          ? BASE_CONTRACTS.passcard
          : isOgStove
            ? BASE_CONTRACTS.ogStove
            : isZombie
              ? BASE_CONTRACTS.zombie
              : isBrother
                ? BASE_CONTRACTS.brother
                : isV1Collection
                  ? BASE_CONTRACTS.v1Collection
                  : undefined;

      let videoUrl: string | undefined;
      if (isGenesis) {
        videoUrl = "https://felts.xyz/a/v.mp4";
      } else if (isPasscard) {
        videoUrl = "https://felts.xyz/a/p.mp4";
      }

      return {
        description: currentContractDescrp?.description,
        descriptionCollection: currentContractDescrp?.descriptionCollection,
        collection: currentContractDescrp?.collection,
        rarity: currentContractDescrp?.rarity,
        price: Number(listing.details.price) / WEI_PER_STRK,
        contractAddress: nft.contractAddress,
        imageUrl: nft.imageUrl,
        videoUrl: currentContractDescrp?.videoUrl || videoUrl,
        glbUrl: nft.glbUrl,
        type: currentContractDescrp?.type || nft.type || "Unknown",
        tokenId: nft.tokenId,
        isListed: true,
        listingPrice: listing.details.price,
        owner: listing.details.owner,
      };
    },
    [listingsByKey],
  );
}
