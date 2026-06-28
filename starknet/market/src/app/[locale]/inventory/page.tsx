import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import NftGallery from "@/components/nft-grid";
import { createStarknetConfig } from "@/data/contracts";
import ResponsiveHeaderText from "@/components/responsive-header";
import { locales } from "@/i18n";
import { BreadcrumbSchema } from "@/components/BreadcrumbSchema";
import { Page } from "@/components/library/page";

const STARKNET_CONFIG = createStarknetConfig("inventory");

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  const languages: Record<string, string> = {};
  locales.forEach((loc) => {
    languages[loc] = `https://market.metacube.games/${loc}/inventory`;
  });
  languages["x-default"] = "https://market.metacube.games/en/inventory";

  return {
    title: t("inventory.title"),
    description: t("inventory.description"),
    keywords: t("inventory.keywords").split(", "),
    alternates: {
      canonical: `https://market.metacube.games/${locale}/inventory`,
      languages,
    },
    openGraph: {
      title: t("inventory.title"),
      description: t("inventory.description"),
      url: `https://market.metacube.games/${locale}/inventory`,
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
      title: t("inventory.title"),
      description: t("inventory.description"),
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

export default async function Inventory({ params }: Props) {
  const t = await getTranslations("inventory");
  const { locale } = await params;
  const baseUrl = `https://market.metacube.games/${locale}`;

  return (
    <main>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: baseUrl },
          { name: "Inventory", url: `${baseUrl}/inventory` },
        ]}
      />
      <Page hasFooter width="full" className="px-3 sm:px-3 lg:px-20">
        <ResponsiveHeaderText>{t("title")}</ResponsiveHeaderText>
        <NftGallery
          starknetConfig={STARKNET_CONFIG}
          buttonAction="DetailsSell"
          displayMode="owned"
        />
      </Page>
    </main>
  );
}
