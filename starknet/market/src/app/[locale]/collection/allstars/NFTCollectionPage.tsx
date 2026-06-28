import { useTranslations } from "next-intl";
import ResponsiveHeaderText from "@/components/responsive-header";
import type { RarityRank } from "./rarityData";
import { NFTClientDisplay } from "./components/NFTClientDisplay";
import { Suspense } from "react";
import { NFTCollectionSkeleton } from "./components/NFTCollectionSkeleton";
import { Page } from "@/components/library/page";

interface NFTCollectionPageProps {
  initialRarityRanks: RarityRank[];
}

export function NFTCollectionPage({
  initialRarityRanks,
}: NFTCollectionPageProps) {
  const t = useTranslations("allstars");

  return (
    <main>
      <Page hasFooter width="full" className="px-3 sm:px-3 lg:px-20">
        <ResponsiveHeaderText>{t("title")}</ResponsiveHeaderText>
        <Suspense fallback={<NFTCollectionSkeleton />}>
          <NFTClientDisplay initialRarityRanks={initialRarityRanks} />
        </Suspense>
      </Page>
    </main>
  );
}
