import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog.metadata" });
  const tMeta = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: {
      default: t("title"),
      template: tMeta("titleTemplate"),
    },
    description: t("description"),
    alternates: {
      canonical: `https://metacube.games/${locale}/blog`,
    },
  };
}

export default function BlogLayout({ children }: Props) {
  return <section>{children}</section>;
}
