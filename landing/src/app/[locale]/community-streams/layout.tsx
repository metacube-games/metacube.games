import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "communityStreams.metadata",
  });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `https://metacube.games/${locale}/community-streams`,
    },
  };
}

export default function CommunityStreamsLayout({ children }: Props) {
  return <section>{children}</section>;
}
