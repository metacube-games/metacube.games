import { useMemo } from "react";
import type { NFT, NFTListing } from "@/interface";
import { CONTRACT_ADDRESSES } from "@/data/contracts";
import {
  getCollectionName,
  getCollectionType,
  getDefaultGlb,
  getDefaultImage,
} from "./collectionMeta";

// Groups listings by collection, sorts each group by ascending price, then
// flattens to a single NFT[] suitable for the grid.
export function useListingsAsNfts(listedNfts: NFTListing[]): NFT[] {
  return useMemo(() => {
    const listingsByCollection = new Map<string, NFTListing[]>();
    listedNfts.forEach((listing) => {
      const existing = listingsByCollection.get(listing.contract);
      if (existing) {
        existing.push(listing);
      } else {
        listingsByCollection.set(listing.contract, [listing]);
      }
    });

    const sortedListings: NFTListing[] = [];
    listingsByCollection.forEach((listings) => {
      const sortedByPrice = listings.sort((a, b) => {
        const priceA = BigInt(a.details.price);
        const priceB = BigInt(b.details.price);
        return priceA < priceB ? -1 : priceA > priceB ? 1 : 0;
      });
      sortedListings.push(...sortedByPrice);
    });

    return sortedListings.map(listingToNft);
  }, [listedNfts]);
}

function listingToNft(listing: NFTListing): NFT {
  const tokenId = Number(listing.tokenId);
  const isV1Collection = listing.contract === CONTRACT_ADDRESSES.V1_COLLECTION;
  const isGenesis = listing.contract === CONTRACT_ADDRESSES.GENESIS;
  const isPasscard = listing.contract === CONTRACT_ADDRESSES.PASSCARD;
  const isBrother = listing.contract === CONTRACT_ADDRESSES.BROTHER;

  let imageUrl = "";
  let glbUrl = "";

  if (isV1Collection) {
    imageUrl = `https://felts.xyz/v1/i/${tokenId}.png`;
    glbUrl = `https://felts.xyz/v1/g/${tokenId}.glb`;
  } else if (isGenesis) {
    imageUrl = "https://felts.xyz/a/g.gif";
  } else if (isPasscard) {
    imageUrl = "https://felts.xyz/a/p.gif";
  } else if (isBrother) {
    imageUrl = "/images/brother.png";
    glbUrl = "brother";
  }

  return {
    id: `${listing.contract}-${listing.tokenId}`,
    name: isV1Collection
      ? `Allstars #${tokenId}`
      : getCollectionName(listing.contract),
    type: getCollectionType(listing.contract),
    imageUrl: imageUrl || getDefaultImage(listing.contract),
    glbUrl:
      isV1Collection || isBrother ? glbUrl : getDefaultGlb(listing.contract),
    tokenId,
    contractAddress: listing.contract,
  };
}
