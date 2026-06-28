import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonRowProps {
  keys: number[];
}

export const SkeletonRow = memo(({ keys }: SkeletonRowProps) => {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
      {keys.map((key) => (
        <SkeletonCard key={key} />
      ))}
    </div>
  );
});

SkeletonRow.displayName = "SkeletonRow";

const SkeletonCard = memo(() => (
  <Skeleton className="relative w-full h-full border-2 bg-card rounded-lg flex flex-col overflow-hidden m-auto aspect-[2/3] max-w-[300px]" />
));

SkeletonCard.displayName = "SkeletonCard";
