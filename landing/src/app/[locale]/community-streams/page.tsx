import { getTranslations } from "next-intl/server";

import { Page } from "@/components/library/page";
import ResponsiveHeaderText from "@/components/responsive-header";
import CommunityVideoGrid from "@/components/community-streams/CommunityVideoGrid";

export default async function CommunityStreamsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "communityStreams" });

  return (
    <main id="main-content">
      <Page hasFooter width="default">
        <ResponsiveHeaderText>{t("title")}</ResponsiveHeaderText>
        <CommunityVideoGrid />
      </Page>
    </main>
  );
}
