import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

import { Page } from "@/components/library/page";
import ResponsiveHeaderText from "@/components/responsive-header";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const tf = await getTranslations({ locale, namespace: "footer" });
  const t = await getTranslations({ locale, namespace: "terms" });

  return {
    title: tf("terms"),
    description: t("sections.introduction.content"),
    alternates: {
      canonical: `https://metacube.games/${locale}/terms`,
    },
  };
}

export default function TermsOfService() {
  const t = useTranslations("terms");

  return (
    <main id="main-content">
      <Page hasFooter>
        <article className="max-w-3xl mx-auto">
          <ResponsiveHeaderText>{t("title")}</ResponsiveHeaderText>

          <div className="space-y-8">
            <Article
              title={t("sections.introduction.title")}
              body={t("sections.introduction.content")}
            />

            <ListSection
              title={t("sections.useOfServices.title")}
              description={t("sections.useOfServices.description")}
              items={t.raw("sections.useOfServices.items")}
            />

            <ListSection
              title={t("sections.userAccounts.title")}
              description={t("sections.userAccounts.description")}
              items={t.raw("sections.userAccounts.items")}
              footer={t("sections.userAccounts.footer")}
            />

            <Article
              title={t("sections.intellectualProperty.title")}
              body={t("sections.intellectualProperty.content")}
            />

            <ListSection
              title={t("sections.blockchainNfts.title")}
              description={t("sections.blockchainNfts.description")}
              items={t.raw("sections.blockchainNfts.items")}
            />

            <ListSection
              title={t("sections.limitationOfLiability.title")}
              description={t("sections.limitationOfLiability.description")}
              items={t.raw("sections.limitationOfLiability.items")}
            />

            <Article
              title={t("sections.modifications.title")}
              body={t("sections.modifications.content")}
            />
            <Article
              title={t("sections.governingLaw.title")}
              body={t("sections.governingLaw.content")}
            />
            <Article
              title={t("sections.changes.title")}
              body={t("sections.changes.content")}
            />
            <Article
              title={t("sections.termination.title")}
              body={t("sections.termination.content")}
            />

            <ListSection
              title={t("sections.companyDetails.title")}
              description={t("sections.companyDetails.description")}
              items={t.raw("sections.companyDetails.items")}
            />

            <section>
              <h2 className="text-lg sm:text-xl font-semibold mb-3">
                {t("sections.contact.title")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("sections.contact.content")}{" "}
                <a
                  href="mailto:contact@metacube.games"
                  className="text-primary hover:underline"
                >
                  contact@metacube.games
                </a>
                .
              </p>
            </section>
          </div>
        </article>
      </Page>
    </main>
  );
}

function Article({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h2 className="text-lg sm:text-xl font-semibold mb-3">{title}</h2>
      <p className="text-muted-foreground leading-relaxed">{body}</p>
    </section>
  );
}

function ListSection({
  title,
  description,
  items,
  footer,
}: {
  title: string;
  description: string;
  items: string[];
  footer?: string;
}) {
  return (
    <section>
      <h2 className="text-lg sm:text-xl font-semibold mb-3">{title}</h2>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
      <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
      {footer && (
        <p className="text-muted-foreground leading-relaxed mt-2">{footer}</p>
      )}
    </section>
  );
}
