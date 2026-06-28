import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Import translations
import enTranslation from "../locales/en/translation.json";
import frTranslation from "../locales/fr/translation.json";
import esTranslation from "../locales/es/translation.json";
import deTranslation from "../locales/de/translation.json";

/** Single source of truth for the languages this app ships. */
export const SUPPORTED_LANGUAGES = ["en", "fr", "de", "es"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const isSupportedLanguage = (lng: string): lng is SupportedLanguage =>
  (SUPPORTED_LANGUAGES as readonly string[]).includes(lng);

const resources = {
  en: {
    translation: enTranslation,
  },
  fr: {
    translation: frTranslation,
  },
  es: {
    translation: esTranslation,
  },
  de: {
    translation: deTranslation,
  },
};

// Get language from localStorage or browser
const getInitialLanguage = () => {
  const saved = localStorage.getItem("i18nextLng");
  if (saved && isSupportedLanguage(saved)) {
    return saved;
  }
  const browserLang = navigator.language.split("-")[0];
  return isSupportedLanguage(browserLang) ? browserLang : "en";
};

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: "en",
  debug: false,
  interpolation: {
    escapeValue: false,
  },
});

// Save language changes to localStorage
i18n.on("languageChanged", (lng) => {
  localStorage.setItem("i18nextLng", lng);
});

// Exposed so non-React modules (game-loop/model code) can translate via i18n.t().
export default i18n;
