import { SkeletonRow } from "@/components/nft-grid/Skeleton";

export function NFTCollectionSkeleton() {
  const keys = Array.from({ length: 40 }, (_, index) => index + 1);
  return <SkeletonRow keys={keys} />;
}

export function NFTCollectionSkeletonRow({
  skeletonKeys,
}: {
  skeletonKeys: number[];
}) {
  return <SkeletonRow keys={skeletonKeys} />;
}
