"use client";

import { useTranslations } from "next-intl";
import type { NFTListing } from "@/interface";
import ListedNftGallery from "@/components/listed-nft-grid";
import ResponsiveHeaderText from "@/components/responsive-header";
import { Page } from "@/components/library/page";

interface MarketContentProps {
  collectionAddresses: string[];
  initialListings?: NFTListing[];
}

export function MarketContent({
  collectionAddresses,
  initialListings,
}: MarketContentProps) {
  const t = useTranslations("market");

  return (
    <main>
      <Page hasFooter width="full" className="px-3 sm:px-3 lg:px-20">
        <ResponsiveHeaderText>{t("title")}</ResponsiveHeaderText>
        <ListedNftGallery
          collectionAddresses={collectionAddresses}
          buttonAction="Buy"
          initialListings={initialListings}
        />
      </Page>
    </main>
  );
}
