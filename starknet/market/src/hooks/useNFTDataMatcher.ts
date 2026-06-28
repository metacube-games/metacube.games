"use client";

import type { NFT, NFTContract, NFTData } from "@/interface";
import { getV1NFTData } from "@/utils/v1-collection";

export function useNFTDataMatcher(contracts?: NFTContract[]) {
  function getNftData(nft: NFT): NFTData {
    if (
      nft.id.startsWith("v1-collection-") ||
      (nft.imageUrl && nft.imageUrl.includes("felts.xyz/v1/i"))
    ) {
      return getV1NFTData(nft);
    }

    if (contracts && nft.contractAddress) {
      const matchedContract = contracts.find(
        (contract) => contract.address === nft.contractAddress,
      );

      if (matchedContract) {
        return {
          description: matchedContract.description || "",
          descriptionCollection: matchedContract.descriptionCollection || "",
          collection: matchedContract.collection || "Unknown",
          rarity: matchedContract.rarity || "Common",
          price: matchedContract.price,
          claimConditions: matchedContract.claimConditions,
          contractAddress: matchedContract.address,
          imageUrl: matchedContract.imageUrl || nft.imageUrl,
          videoUrl: matchedContract.videoUrl || nft.videoUrl,
          glbUrl: matchedContract.glbUrl || nft.glbUrl,
          type: matchedContract.type || "Unknown",
          tokenId: nft.tokenId,
        };
      }
    }

    return {
      description: "",
      descriptionCollection: "",
      collection: "Unknown",
      rarity: "Common",
      contractAddress: nft.contractAddress,
      imageUrl: nft.imageUrl,
      videoUrl: nft.videoUrl,
      glbUrl: nft.glbUrl,
      type: nft.type || "Unknown",
      tokenId: nft.tokenId,
    };
  }

  return { getNftData };
}
