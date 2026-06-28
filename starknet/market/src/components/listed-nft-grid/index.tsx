"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { NFTListing, ButtonAction } from "@/interface";
import { NFTCardGrid } from "@/components/nft-grid/NFT";
import { EmptyMessage, ErrorMessage } from "@/components/nft-grid/Messages";
import { SkeletonRow } from "@/components/nft-grid/Skeleton";
import { FilterRow } from "@/components/nft-grid/FilterRow";
import { getCollectionName } from "./collectionMeta";
import { useListingsAsNfts } from "./useListingsAsNfts";
import { useListingNftDataResolver } from "./useListingNftDataResolver";

// Matches NFTClientGrid's responsive columns; the CSS grid handles the
// actual layout, so we always render the maximum.
const SKELETON_COUNT = 24;

interface ListedNftGalleryProps {
  collectionAddresses: string[];
  buttonAction: ButtonAction;
  initialListings?: NFTListing[];
}

export default function ListedNftGallery({
  collectionAddresses,
  buttonAction = "Buy",
  initialListings,
}: ListedNftGalleryProps) {
  const t = useTranslations("nft");
  const [selectedFilter, setSelectedFilter] = useState("all");

  const {
    data: listedNfts = [],
    isLoading,
    error,
  } = useQuery<NFTListing[]>({
    queryKey: ["allListings", collectionAddresses.join("-")],
    queryFn: async () => {
      const { fetchAllCollectionsListings } =
        await import("@/services/nftFetchers");
      return fetchAllCollectionsListings(collectionAddresses);
    },
    initialData: initialListings,
  });

  const listingsAsNfts = useListingsAsNfts(listedNfts);
  const getNftData = useListingNftDataResolver(listedNfts);

  const collections = useMemo(() => {
    const uniqueCollections = new Set<string>();
    listingsAsNfts.forEach((nft) => {
      const name = getCollectionName(nft.contractAddress || "");
      if (name) {
        uniqueCollections.add(name);
      }
    });
    return Array.from(uniqueCollections);
  }, [listingsAsNfts]);

  const filteredNfts = useMemo(() => {
    if (selectedFilter === "all") return listingsAsNfts;
    return listingsAsNfts.filter((nft) => {
      const collectionName = getCollectionName(nft.contractAddress || "");
      return collectionName.toLowerCase() === selectedFilter.toLowerCase();
    });
  }, [listingsAsNfts, selectedFilter]);

  if (error) {
    return <ErrorMessage error={error} />;
  }

  if (isLoading) {
    return (
      <>
        <FilterRow
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
          collections={[]}
        />
        <SkeletonRow
          keys={Array.from({ length: SKELETON_COUNT }, (_, i) => i + 1)}
        />
      </>
    );
  }

  if (listedNfts.length === 0) {
    return (
      <div className="text-center py-10">
        <EmptyMessage message={t("emptyStateListed")} />
      </div>
    );
  }

  return (
    <>
      <FilterRow
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
        collections={collections}
      />
      <NFTCardGrid
        NBNft={filteredNfts}
        buttonAction={buttonAction}
        getNftData={getNftData}
      />
    </>
  );
}
