import { CONTRACT_ADDRESSES } from "@/data/contracts";

export function getCollectionName(contractAddress: string): string {
  switch (contractAddress) {
    case CONTRACT_ADDRESSES.GENESIS:
      return "Genesis";
    case CONTRACT_ADDRESSES.PASSCARD:
      return "Passcards";
    case CONTRACT_ADDRESSES.OG_STOVE:
      return "OG Stove";
    case CONTRACT_ADDRESSES.ZOMBIE:
      return "Zombie";
    case CONTRACT_ADDRESSES.BROTHER:
      return "Brother";
    case CONTRACT_ADDRESSES.V1_COLLECTION:
      return "Allstars";
    default:
      return "Unknown";
  }
}

export function getCollectionType(contractAddress: string): string {
  switch (contractAddress) {
    case CONTRACT_ADDRESSES.GENESIS:
    case CONTRACT_ADDRESSES.OG_STOVE:
      return "Genesis";
    case CONTRACT_ADDRESSES.PASSCARD:
    case CONTRACT_ADDRESSES.ZOMBIE:
      return "Passcard";
    case CONTRACT_ADDRESSES.BROTHER:
    case CONTRACT_ADDRESSES.V1_COLLECTION:
      return "Collection";
    default:
      return "Unknown";
  }
}

export function getDefaultImage(contractAddress: string): string {
  switch (contractAddress) {
    case CONTRACT_ADDRESSES.GENESIS:
      return "https://felts.xyz/a/g.gif";
    case CONTRACT_ADDRESSES.PASSCARD:
      return "https://felts.xyz/a/p.gif";
    case CONTRACT_ADDRESSES.OG_STOVE:
      return "/images/OG_Stove.png";
    case CONTRACT_ADDRESSES.ZOMBIE:
      return "/images/Zombie.png";
    case CONTRACT_ADDRESSES.BROTHER:
      return "/images/brother.png";
    default:
      return "";
  }
}

export function getDefaultGlb(contractAddress: string): string {
  switch (contractAddress) {
    case CONTRACT_ADDRESSES.OG_STOVE:
      return "ogStove";
    case CONTRACT_ADDRESSES.ZOMBIE:
      return "zombie";
    case CONTRACT_ADDRESSES.BROTHER:
      return "brother";
    default:
      return "";
  }
}
