import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getRarityRanks } from "./rarityData";
import { NFTCollectionPage } from "./NFTCollectionPage";
import { locales } from "@/i18n";
import { NFTCollectionSchema } from "@/components/StructuredData";
import { BreadcrumbSchema } from "@/components/BreadcrumbSchema";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  const languages: Record<string, string> = {};
  locales.forEach((loc) => {
    languages[loc] = `https://market.metacube.games/${loc}/collection/allstars`;
  });
  languages["x-default"] =
    "https://market.metacube.games/en/collection/allstars";

  return {
    title: t("allstars.title"),
    description: t("allstars.description"),
    keywords: t("allstars.keywords").split(", "),
    alternates: {
      canonical: `https://market.metacube.games/${locale}/collection/allstars`,
      languages,
    },
    twitter: {
      card: "summary_large_image",
      title: t("allstars.twitterTitle"),
      description: t("allstars.twitterDescription"),
      creator: t("allstars.twitterCreator"),
      images: [
        {
          url: "https://market.metacube.games/og-image.png",
          width: 1200,
          height: 630,
          alt: t("ogImageAlt"),
        },
      ],
    },
    openGraph: {
      title: t("allstars.title"),
      description: t("allstars.description"),
      url: `https://market.metacube.games/${locale}/collection/allstars`,
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
    appleWebApp: {
      title: t("appTitle"),
      statusBarStyle: "black-translucent",
    },
  };
}

async function fetchRarityData() {
  const rarityRanks = await getRarityRanks();
  return { rarityRanks };
}

export default async function AllstarsPage({ params }: Props) {
  const { rarityRanks } = await fetchRarityData();
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  const baseUrl = `https://market.metacube.games/${locale}`;

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: baseUrl },
          { name: "Collection", url: `${baseUrl}/collection` },
          { name: "Allstars", url: `${baseUrl}/collection/allstars` },
        ]}
      />
      <NFTCollectionSchema
        name={t("allstars.title")}
        description={t("allstars.description")}
        url={`${baseUrl}/collection/allstars`}
        image="https://market.metacube.games/og-image.png"
        numberOfItems={1000}
        locale={locale}
      />
      <NFTCollectionPage initialRarityRanks={rarityRanks} />
    </>
  );
}
