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
  const t = await getTranslations({ locale, namespace: "privacy" });

  return {
    title: tf("privacy"),
    description: t("sections.introduction.content"),
    alternates: {
      canonical: `https://metacube.games/${locale}/privacy`,
    },
  };
}

export default function PrivacyPolicy() {
  const t = useTranslations("privacy");

  return (
    <main id="main-content">
      <Page hasFooter>
        <article className="max-w-3xl mx-auto">
          <ResponsiveHeaderText>{t("title")}</ResponsiveHeaderText>

          <div className="space-y-8">
            <section>
              <p className="text-muted-foreground leading-relaxed">
                {t("sections.introduction.content")}
              </p>
            </section>

            <ListSection
              title={t("sections.informationCollection.title")}
              description={t("sections.informationCollection.description")}
              items={t.raw("sections.informationCollection.items")}
            />

            <ListSection
              title={t("sections.informationUse.title")}
              description={t("sections.informationUse.description")}
              items={t.raw("sections.informationUse.items")}
            />

            <Article
              title={t("sections.dataStorage.title")}
              body={t("sections.dataStorage.content")}
            />
            <Article
              title={t("sections.blockchainTransactions.title")}
              body={t("sections.blockchainTransactions.content")}
            />
            <Article
              title={t("sections.googleLogin.title")}
              body={t("sections.googleLogin.content")}
            />
            <Article
              title={t("sections.dataRetention.title")}
              body={t("sections.dataRetention.content")}
            />

            <ListSection
              title={t("sections.userRights.title")}
              description={t("sections.userRights.description")}
              items={t.raw("sections.userRights.items")}
              footer={t("sections.userRights.footer")}
            />

            <Article
              title={t("sections.childrens.title")}
              body={t("sections.childrens.content")}
            />
            <Article
              title={t("sections.changes.title")}
              body={t("sections.changes.content")}
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
