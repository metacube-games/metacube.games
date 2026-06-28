import type { NFT, NFTData } from "@/interface";

export function getV1NFTData(nft: NFT): NFTData {
  return {
    description: undefined,
    rarity: undefined,
    contractAddress: nft.contractAddress,
    imageUrl: nft.imageUrl,
    videoUrl: nft.videoUrl,
    glbUrl: nft.glbUrl,
    type: nft.type || "Allstars",
    tokenId: nft.tokenId,
    collection: "Metacube: Allstars",
    descriptionCollection:
      "Unique digital cards offering cosmetic and functional benefits in the Metacube game, used as skins for future events.",
  };
}
