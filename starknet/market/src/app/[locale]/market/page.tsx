import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketContent } from "./MarketContent";
import { locales } from "@/i18n";
import { BreadcrumbSchema } from "@/components/BreadcrumbSchema";
import { CONTRACT_ADDRESSES } from "@/data/contracts";
import { fetchAllCollectionsListings } from "@/services/nftFetchers";

const COLLECTION_ADDRESSES = [
  CONTRACT_ADDRESSES.V1_COLLECTION,
  CONTRACT_ADDRESSES.GENESIS,
  CONTRACT_ADDRESSES.PASSCARD,
  CONTRACT_ADDRESSES.OG_STOVE,
  CONTRACT_ADDRESSES.ZOMBIE,
  CONTRACT_ADDRESSES.BROTHER,
];

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  const languages: Record<string, string> = {};
  locales.forEach((loc) => {
    languages[loc] = `https://market.metacube.games/${loc}/market`;
  });
  languages["x-default"] = "https://market.metacube.games/en/market";

  return {
    title: t("market.title"),
    description: t("market.description"),
    keywords: t("market.keywords").split(", "),
    alternates: {
      canonical: `https://market.metacube.games/${locale}/market`,
      languages,
    },
    openGraph: {
      title: t("market.title"),
      description: t("market.description"),
      url: `https://market.metacube.games/${locale}/market`,
      images: [
        {
          url: "https://market.metacube.games/og-image.png",
          width: 1200,
          height: 630,
          alt: t("ogImageAlt"),
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("market.title"),
      description: t("market.description"),
      images: [
        {
          url: "https://market.metacube.games/og-image.png",
          width: 1200,
          height: 630,
          alt: t("ogImageAlt"),
        },
      ],
    },
  };
}

export default async function Market({ params }: Props) {
  const { locale } = await params;
  const baseUrl = `https://market.metacube.games/${locale}`;

  // SSR-prefetch so the first paint has real data and crawlers see content.
  let initialListings;
  try {
    initialListings = await fetchAllCollectionsListings(COLLECTION_ADDRESSES);
  } catch {
    initialListings = undefined;
  }

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: baseUrl },
          { name: "Market", url: `${baseUrl}/market` },
        ]}
      />
      <MarketContent
        collectionAddresses={COLLECTION_ADDRESSES}
        initialListings={initialListings}
      />
    </>
  );
}
