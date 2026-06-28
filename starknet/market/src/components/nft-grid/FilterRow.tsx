"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { isRoute } from "@/lib/i18n-utils";

interface FilterRowProps {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  collections: string[];
  isConnected?: boolean;
  hasListings?: boolean;
}

export function FilterRow({
  selectedFilter,
  onFilterChange,
  collections,
  isConnected,
  hasListings,
}: FilterRowProps) {
  const t = useTranslations("nftGrid.filter");
  const pathname = usePathname();
  const isInventoryPage = isRoute(pathname, "/inventory");

  return (
    <div className="mb-4 flex flex-wrap gap-2 sm:mb-6 md:mb-8">
      <Button
        variant={selectedFilter === "all" ? "secondary" : "outline"}
        onClick={() => onFilterChange("all")}
      >
        {t("all")}
      </Button>

      {isInventoryPage && isConnected && hasListings && (
        <Button
          variant={selectedFilter === "listed" ? "secondary" : "outline"}
          onClick={() => onFilterChange("listed")}
        >
          {t("listed")}
        </Button>
      )}

      {collections.map((collection) => {
        const displayName = collection.replace(/^Metacube:\s*/i, "");

        return (
          <Button
            key={collection}
            variant={
              selectedFilter === collection.toLowerCase()
                ? "secondary"
                : "outline"
            }
            onClick={() => onFilterChange(collection.toLowerCase())}
          >
            {displayName}
          </Button>
        );
      })}
    </div>
  );
}
