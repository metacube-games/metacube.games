"use client";

import { useLocale, useTranslations } from "next-intl";
import { Footer as SharedFooter } from "@/components/library/footer";

export default function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale();
  return (
    <SharedFooter
      copyrightHolder={t("copyrightHolder", { year: new Date().getFullYear() })}
      allRightsReserved={t("allRightsReserved")}
      termsLabel={t("terms")}
      privacyLabel={t("privacy")}
      termsHref={`https://metacube.games/${locale}/terms`}
      privacyHref={`https://metacube.games/${locale}/privacy`}
    />
  );
}
