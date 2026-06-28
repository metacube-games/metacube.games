"use client";

import { Header as SharedHeader } from "@/components/library/header";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useTranslations } from "next-intl";

export function Header() {
  const t = useTranslations("navigation");
  return (
    <SharedHeader
      localeSwitcher={<LocaleSwitcher />}
      playLabel={t("play")}
      playSecondary={t("playMetacube")}
      playAriaLabel={`${t("play")} ${t("playMetacube")}`}
    />
  );
};
