import { LinkWallet } from "@/components/navigation-bar/ModalContents/LinkWallet";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Page } from "@/components/library/page";
import ResponsiveHeaderText from "@/components/responsive-header";

export default async function RootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LinkWalletPage />;
}

function LinkWalletPage() {
  const t = useTranslations("linkWallet");

  return (
    <main id="main-content">
      <Page hasFooter width="narrow">
        <ResponsiveHeaderText>{t("title")}</ResponsiveHeaderText>
        <LinkWallet />
      </Page>
    </main>
  );
}
