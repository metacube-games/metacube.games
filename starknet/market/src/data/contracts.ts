import type { NFTContract } from "@/interface";

// Marketplace royalty percentage applied to every secondary-market sale.
// Single source of truth — both the price-breakdown UI in
// `<MarketplaceBuyConfirmation>` and the badge fee in the NFT card
// import this constant.
export const ROYALTY_PERCENTAGE = 2;

// Constants for contract addresses
export const CONTRACT_ADDRESSES = {
  GENESIS: "0x007ca74fd0a9239678cc6355e38ac1e7820141501727ae37f9c733e5ed1c3592",
  PASSCARD:
    "0x0602c301f6a1c2ef174bafaab7389c3f6165df34736befcf2ca3df7764934caf",
  OG_STOVE:
    "0x05c15109745fd726f302ac7a16fad3f5f073aa07ff6e0fa9291e2c89eb7bc5cd",
  ZOMBIE: "0x05bee0ba034b07c6246c2e1e6fea2fb7df2c2108603895c367bdece3d0e0b478",
  V1_COLLECTION:
    "0x0680e5fe0b71702a1227fa8bcd083c7a8cf7aa535e848b2dd0a82b4d01257255",
  MARKETPLACE:
    "0x03ffcdb47b567c5621150e355f652244690c7afe64a31cdc06037444fa7b9ffb", // Marketplace contract address
  FEE_DISTRIBUTOR:
    "0x071C8e7d65BA0eB2cB57479eC66343fdCe9166936F610ff0b4c49e37Ea8bad2C", // Fee distributor contract address
  STRK_TOKEN:
    "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
  BROTHER: "0x039189a5de1c0a4ff558276ee48dd1ae9d6a5bd498635420f1f6344e8416b3f7",
};

// Base contract data
type BaseContractKey =
  | "genesis"
  | "passcard"
  | "ogStove"
  | "zombie"
  | "brother"
  | "v1Collection";

export const BASE_CONTRACTS: Record<BaseContractKey, NFTContract> = {
  // Genesis NFT
  genesis: {
    address: CONTRACT_ADDRESSES.GENESIS,
    name: "Genesis",
    type: "Genesis",
    imageUrl: "https://felts.xyz/a/g.gif",
    videoUrl: "https://felts.xyz/a/v.mp4",
    id: "genesis-001",
    descriptionCollection:
      "The Metacube Genesis Card is the rarest item in the Metacube Universe. With only 75 units available, each one of these cards provides its owner with access to free in-game items and special advantages at the various Metacube events.",
    collection: "Metacube: Genesis",
    rarity: "Legendary",
    price: 120,
  },

  // Passcard NFT
  passcard: {
    address: CONTRACT_ADDRESSES.PASSCARD,
    name: "Passcard",
    type: "Passcard",
    imageUrl: "https://felts.xyz/a/p.gif",
    videoUrl: "https://felts.xyz/a/p.mp4",
    id: "passcard-002",
    descriptionCollection:
      "The Metacube Passcards collection features 3,000 units, each providing its owner with exclusive advantages and access to free in-game content for upcoming Metacube events.",
    collection: "Metacube: Passcards",
    rarity: "Mythic",
    price: 120,
  },

  // OG Stove NFT
  ogStove: {
    address: CONTRACT_ADDRESSES.OG_STOVE,
    imageUrl: "/images/OG_Stove.png",
    name: "OG Stove",
    type: "Genesis",
    glbUrl: "ogStove",
    id: "OG-Stove-base",
    descriptionCollection: "Special skin of the Metacube V1 collection.",
    description: "He seems somewhat familiar..??",
    collection: "Metacube: OG Stove",
    rarity: "Legendary",
    price: 600,
    claimConditions: ["Must own at least 1 Genesis NFT"],
  },

  // Zombie NFT
  zombie: {
    address: CONTRACT_ADDRESSES.ZOMBIE,
    name: "Zombie",
    imageUrl: "/images/Zombie.png",
    type: "Passcard",
    glbUrl: "zombie",
    id: "zombie-base",
    descriptionCollection: "Special skin of the Metacube V1 collection.",
    description: "Not very alive, not very smart, but he's a good cook.",
    collection: "Metacube: Zombie",
    rarity: "Mythic",
    price: 120,
    claimConditions: ["Must own at least 1 Passcard NFT"],
  },

  brother: {
    address: CONTRACT_ADDRESSES.BROTHER,
    name: "Brother",
    type: "Collection",
    imageUrl: "/images/brother.png",
    glbUrl: "brother",
    id: "brother-base",
    rarity: "Mythic",
    descriptionCollection: "Special skin of the Metacube V1 collection.",
    description: "Brother get up, the fight goes on!",
    collection: "Metacube: Brother",
  },

  v1Collection: {
    address: CONTRACT_ADDRESSES.V1_COLLECTION,
    name: "Allstars",
    type: "Collection",
    collection: "Metacube: Allstars",
    descriptionCollection:
      "Unique digital cards offering cosmetic and functional benefits in the Metacube game, used as skins for future events.",
  },
};

// Specialized contract data for different contexts
export const CONTRACTS = {
  // For inventory page
  inventory: [
    { ...BASE_CONTRACTS.genesis },
    { ...BASE_CONTRACTS.passcard },
    {
      ...BASE_CONTRACTS.ogStove,
      id: "OG-Stove-claim-000",
    },
    {
      ...BASE_CONTRACTS.zombie,
      id: "zombie-claim-001",
    },
    {
      ...BASE_CONTRACTS.v1Collection,
      id: "v1-collection-claim-000",
    },
    {
      ...BASE_CONTRACTS.brother,
      id: "brother-claim-002",
    },
  ],

  // For rewards page
  rewards: [
    {
      ...BASE_CONTRACTS.ogStove,
      id: "OG-Stove-claim-000",
    },
    {
      ...BASE_CONTRACTS.zombie,
      id: "zombie-claim-001",
    },
  ],

  // For market page
  market: [
    {
      ...BASE_CONTRACTS.ogStove,
      id: "OG-Stove-market-000",
    },
    {
      ...BASE_CONTRACTS.zombie,
      id: "zombie-market-001",
    },
  ],
};

// Helper function to create Starknet config
export const createStarknetConfig = (contractsKey: keyof typeof CONTRACTS) => {
  return {
    enabled: true,
    contracts: CONTRACTS[contractsKey]!,
  };
};
