import type { pathTypes } from "@/components/glb/Model";

export interface FetchConfig {
  queryKey: string;
  pageSize: number;
  maxPages: number;
  fetchDelay: number;
  apiUrl: string;
  displayMode?: "default" | "rarity";
}

export type ButtonAction = "Claim" | "Buy" | "Sell" | "Details" | "DetailsSell";
export type Mode = "Claim" | "Buy" | "Sell" | "Details";

export type DisplayMode = "owned" | "all";

export interface NFT {
  id: string;
  name: string;
  type?: "Genesis" | "Passcard" | string;
  imageUrl?: string;
  videoUrl?: string;
  tokenId?: number;
  contractAddress?: string;
  glbUrl?: string;
}

export interface NFTFetchResponse {
  nfts: NFT[];
  hasMore: boolean;
  nextPage: number;
}

export interface NFTData {
  /** Description of the NFT */
  description: string | undefined;
  /** Description of the collection */
  descriptionCollection: string | undefined;
  /** Collection the NFT belongs to */
  collection: string | undefined;
  /** Rarity level of the NFT */
  rarity: string | undefined;
  /** Market price of the NFT (if applicable) */
  price?: number | undefined;
  /** Conditions required to claim the NFT */
  claimConditions?: string[] | undefined;
  /** Contract address of the NFT */
  contractAddress: string | undefined;
  /** URL to the image representation */
  imageUrl: string | undefined;
  /** URL to video content if available */
  videoUrl: string | undefined;
  /** URL to 3D model if available */
  glbUrl: pathTypes | undefined | string;
  /** Type of NFT — determines contract interactions */
  type: string;
  /** Token ID of the NFT in the contract */
  tokenId?: number;
  /** Whether the NFT is currently listed for sale by the owner */
  isListed?: boolean;
  /** Listed price in wei (raw blockchain format) */
  listingPrice?: string;
  /** Owner of the NFT (wallet address) */
  owner?: string;
}

export interface NFTContract {
  address: string;
  name: string;
  type?: string;
  imageUrl?: string;
  videoUrl?: string;
  glbUrl?: pathTypes;
  id?: string;
  descriptionCollection?: string;
  description?: string;
  collection?: string;
  rarity?: string;
  price?: number;
  claimConditions?: string[];
}

export interface StarknetConfig {
  enabled: boolean;
  contracts: NFTContract[];
}

export interface NFTListing {
  contract: string;
  tokenId: string;
  details: {
    price: string;
    paymentToken: string;
    expirationTimestamp: string;
    owner: string;
  };
}
