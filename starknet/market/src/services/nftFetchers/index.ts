import { Contract, RpcProvider } from "starknet";
import type {
  FetchConfig,
  NFT,
  NFTContract,
  NFTFetchResponse,
  StarknetConfig,
  DisplayMode,
  NFTListing,
} from "@/interface";
import { CONTRACT_ADDRESSES } from "@/data/contracts";
import { reportError } from "@/lib/reportError";

export async function fetchRegularNfts(
  pageParam: number = 0,
  fetchConfig: FetchConfig,
): Promise<NFTFetchResponse> {
  const pageSize = fetchConfig.pageSize;

  return new Promise<NFTFetchResponse>((resolve) => {
    setTimeout(() => {
      const newNfts = Array.from({ length: pageSize }).map((_, i) => ({
        id: `nft-${pageParam * pageSize + i + 1}`,
        name: `NFT`,
        glbUrl: fetchConfig.apiUrl,
      }));

      resolve({
        nfts: newNfts,
        hasMore: pageParam < fetchConfig.maxPages,
        nextPage: pageParam + 1,
      });
    }, fetchConfig.fetchDelay);
  });
}

export async function fetchStarknetNfts(
  pageParam: number = 0,
  starknetConfig: StarknetConfig,
  walletAddress: string,
  displayMode: DisplayMode,
  provider?: RpcProvider,
): Promise<NFTFetchResponse> {
  if (!starknetConfig.contracts || starknetConfig.contracts.length === 0) {
    return {
      nfts: [],
      hasMore: false,
      nextPage: pageParam,
    };
  }

  if (displayMode === "owned" && (!walletAddress || walletAddress.length < 5)) {
    return {
      nfts: [],
      hasMore: false,
      nextPage: pageParam,
    };
  }

  if (!provider) {
    return {
      nfts: [],
      hasMore: false,
      nextPage: pageParam,
    };
  }

  try {
    const contractInstances = await createContractInstances(
      starknetConfig.contracts,
      provider,
    );

    if (displayMode === "owned") {
      return await fetchOwnedNFTs(contractInstances, walletAddress);
    } else {
      return fetchAllNFTs(contractInstances);
    }
  } catch (err) {
    reportError("nftFetchers:fetchRegularNfts", err);
    return {
      nfts: [],
      hasMore: false,
      nextPage: pageParam,
    };
  }
}

async function createContractInstances(
  contracts: NFTContract[],
  provider: RpcProvider,
) {
  const contractInstances = await Promise.all(
    contracts.map(async (contractConfig) => {
      try {
        const abi = await provider.getClassAt(contractConfig.address);
        return {
          contract: new Contract({
            abi: abi.abi,
            address: contractConfig.address,
            providerOrAccount: provider,
          }),
          config: contractConfig,
        };
      } catch (err) {
        reportError(
          `nftFetchers:createContractInstances(${contractConfig.address})`,
          err,
        );
        return null;
      }
    }),
  );

  return contractInstances?.filter((c) => c !== null) as {
    contract: Contract;
    config: NFTContract;
  }[];
}

async function fetchOwnedNFTs(
  contractInstances: { contract: Contract; config: NFTContract }[],
  walletAddress: string,
): Promise<NFTFetchResponse> {
  const nfts: NFT[] = [];

  for (const { config } of contractInstances) {
    if (!config.address) continue;

    try {
      const indexerUrl = `https://indexer.felts.xyz/owned/${config.address}/${walletAddress}`;
      const response = await fetch(indexerUrl);

      if (!response.ok) {
        continue;
      }

      const ownedTokenIds = (await response.json()) as number[];

      if (!ownedTokenIds || ownedTokenIds.length === 0) {
        continue;
      }

      for (const tokenId of ownedTokenIds) {
        try {
          const isV1Collection =
            config.address === CONTRACT_ADDRESSES.V1_COLLECTION;

          let imageUrl = config.imageUrl || "";
          let glbUrl = "";

          if (isV1Collection) {
            imageUrl = `https://felts.xyz/v1/i/${tokenId}.png`;
            glbUrl = `https://felts.xyz/v1/g/${tokenId}.glb`;
          }

          nfts.push({
            id: `${config.address}-${tokenId}`,
            name: isV1Collection ? `Allstars #${tokenId}` : `${config.name}`,
            type: config.type || "Unknown",
            imageUrl: imageUrl,
            glbUrl: isV1Collection ? glbUrl : "",
            tokenId: Number(tokenId),
            contractAddress: config.address,
          });
        } catch (err) {
          // Skip individual token but keep iterating the collection.
          reportError(
            `nftFetchers:fetchOwnedNFTs(${config.address}:${tokenId})`,
            err,
          );
        }
      }
    } catch (err) {
      reportError(`nftFetchers:fetchOwnedNFTs(${config.address})`, err);
      continue;
    }
  }

  return {
    nfts,
    hasMore: false,
    nextPage: 0,
  };
}

function fetchAllNFTs(
  contractInstances: { contract: Contract; config: NFTContract }[],
): NFTFetchResponse {
  const nfts: NFT[] = contractInstances.map(({ config }) => {
    const contractType = config.type || "unknown";
    return {
      id: config.id || `${contractType.toLowerCase()}-001`,
      name: config.name,
      type: config.type || "Unknown",
      imageUrl: config.imageUrl || "",
      contractAddress: config.address,
    };
  });

  return {
    nfts,
    hasMore: false,
    nextPage: 0,
  };
}

export async function fetchV1CollectionNfts(
  pageParam: number = 0,
  fetchConfig: FetchConfig,
): Promise<NFTFetchResponse> {
  try {
    const pageSize = fetchConfig.pageSize || 20;
    const startIndex = pageParam * pageSize;
    const endIndex = Math.min(startIndex + pageSize, 1000);

    const nfts: NFT[] = [];
    for (let tokenId = startIndex; tokenId < endIndex; tokenId++) {
      nfts.push({
        id: `v1-collection-${tokenId}`,
        name: `Allstars #${tokenId}`,
        type: "Allstars",
        imageUrl: `https://felts.xyz/v1/i/${tokenId}.png`,
        glbUrl: `https://felts.xyz/v1/g/${tokenId}.glb`,
        tokenId: tokenId,
      });
    }

    return {
      nfts,
      hasMore: endIndex < 1000,
      nextPage: pageParam + 1,
    };
  } catch (err) {
    reportError("nftFetchers:fetchAllStarsNfts", err);
    return {
      nfts: [],
      hasMore: false,
      nextPage: pageParam,
    };
  }
}

export async function fetchUserListings(
  walletAddress: string,
): Promise<NFTListing[]> {
  if (!walletAddress || walletAddress.length < 5) {
    return [];
  }

  try {
    const indexerUrl = `https://indexer.felts.xyz/listing/owner/${walletAddress}`;
    const response = await fetch(indexerUrl);

    if (!response.ok) return [];

    const listings = await response.json();
    if (!listings?.length) return [];

    return (
      listings.filter(
        (listing: NFTListing) =>
          listing &&
          listing.details &&
          Number(listing.details.expirationTimestamp) > 0,
      ) || []
    );
  } catch (err) {
    reportError("nftFetchers:fetchUserListings", err);
    return [];
  }
}

async function fetchCollectionListings(
  contractAddress: string,
): Promise<NFTListing[]> {
  if (!contractAddress) {
    return [];
  }

  try {
    const indexerUrl = `https://indexer.felts.xyz/listing/collection/${contractAddress}`;
    const response = await fetch(indexerUrl);

    if (!response.ok) return [];

    const listings = await response.json();
    if (!listings?.length) return [];

    const listingsWithContract = listings.map(
      (listing: {
        details: {
          price: string;
          paymentToken: string;
          expirationTimestamp: string;
          owner: string;
        };
        tokenId: string;
      }) => ({
        ...listing,
        contract: contractAddress,
      }),
    );

    return (listingsWithContract || []).filter(
      (listing: NFTListing) =>
        listing &&
        listing.details &&
        Number(listing.details.expirationTimestamp) > 0,
    );
  } catch (err) {
    reportError(`nftFetchers:fetchCollectionListings(${contractAddress})`, err);
    return [];
  }
}

export async function fetchAllCollectionsListings(
  contractAddresses: string[],
): Promise<NFTListing[]> {
  if (!contractAddresses || contractAddresses.length === 0) {
    return [];
  }

  try {
    const listingsPromises = contractAddresses.map((address) =>
      fetchCollectionListings(address),
    );

    const allListingsArrays = await Promise.all(listingsPromises);
    if (!allListingsArrays) return [];

    const allListings = allListingsArrays.flat();
    if (!allListings) return [];

    const listingsByCollection = new Map<string, NFTListing[]>();

    allListings.forEach((listing) => {
      if (!listing || !listing.contract) return;

      const contractAddress = listing.contract;
      if (!listingsByCollection.has(contractAddress)) {
        listingsByCollection.set(contractAddress, []);
      }
      listingsByCollection.get(contractAddress)?.push(listing);
    });

    const sortedListings: NFTListing[] = [];

    contractAddresses.forEach((address) => {
      const listings = listingsByCollection.get(address) || [];
      const sortedByPrice = listings.sort((a, b) => {
        if (!a?.details?.price || !b?.details?.price) return 0;

        const priceA = BigInt(a.details.price);
        const priceB = BigInt(b.details.price);
        return priceA < priceB ? -1 : priceA > priceB ? 1 : 0;
      });
      sortedListings.push(...sortedByPrice);
    });

    return sortedListings;
  } catch (err) {
    reportError("nftFetchers:fetchAllCollectionsListings", err);
    return [];
  }
}
