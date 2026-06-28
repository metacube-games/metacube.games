import { useTranslation } from "react-i18next";
import { LocaleSwitcher as SharedLocaleSwitcher } from "./library/locale-switcher";

export function LocaleSwitcher() {
  const { i18n } = useTranslation();
  // `i18n.language` can be region-tagged (e.g. "en-US") with LanguageDetector — normalize to base code.
  const locale = i18n.language.split("-")[0];

  return (
    <SharedLocaleSwitcher
      locale={locale}
      onLocaleChange={(code) => {
        if (code !== locale) i18n.changeLanguage(code);
      }}
    />
  );
}
