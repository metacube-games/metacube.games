"use client";

import { useTranslations } from "next-intl";
import { EmptyMessage, ErrorMessage } from "@/components/nft-grid/Messages";
import { NFTCollectionSkeletonRow } from "./NFTCollectionSkeleton";

interface NFTGridStatusSectionProps {
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasItems: boolean;
  error: unknown;
  searchTerm: string;
  skeletonKeys: number[];
}

export function NFTGridStatusSection({
  isLoading,
  isFetchingNextPage,
  hasItems,
  error,
  searchTerm,
  skeletonKeys,
}: NFTGridStatusSectionProps) {
  const t = useTranslations("allstars");

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return (
    <>
      {isFetchingNextPage && (
        <NFTCollectionSkeletonRow skeletonKeys={skeletonKeys} />
      )}

      {!isLoading && !isFetchingNextPage && !hasItems && (
        <div className="text-center py-10">
          <EmptyMessage
            message={searchTerm ? t("noResults", { searchTerm }) : t("noNFTs")}
          />
        </div>
      )}
    </>
  );
}
