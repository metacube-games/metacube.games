import type { Metadata, Viewport } from "next";
import React from "react";
import "../globals.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import {
  setRequestLocale,
  getMessages,
  getTranslations,
} from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/i18n";
import { Nova_Square, Geist_Mono } from "next/font/google";
import { Header } from "@/components/navigation-bar/Header";
import Footer from "@/components/footer";

const novaSquare = Nova_Square({
  variable: "--font-geist-sans",
  weight: "400",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  const localeMap: Record<string, string> = {
    en: "en_US",
    fr: "fr_FR",
    de: "de_DE",
    es: "es_ES",
  };

  const languages: Record<string, string> = {};
  locales.forEach((loc) => {
    languages[loc] = `https://link.metacube.games/${loc}`;
  });
  languages["x-default"] = "https://link.metacube.games/en";

  return {
    metadataBase: new URL("https://link.metacube.games"),
    title: {
      default: t("title"),
      template: t("titleTemplate"),
    },
    description: t("description"),
    keywords: t("keywords").split(", "),
    authors: [{ name: "Metacube Team", url: "https://metacube.games" }],
    creator: "Metacube Team",
    openGraph: {
      type: "website",
      url: `https://link.metacube.games/${locale}`,
      title: t("title"),
      description: t("description"),
      siteName: t("siteName"),
      locale: localeMap[locale as Locale] || "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      creator: "@MetacubeGames",
    },
    appleWebApp: {
      title: t("appTitle"),
      statusBarStyle: "black-translucent",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: `https://link.metacube.games/${locale}`,
      languages,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
  colorScheme: "dark",
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      {/* suppressHydrationWarning defangs false positives from browser extensions (Grammarly, Dark Reader…) injecting attributes pre-hydration. */}
      <body
        suppressHydrationWarning
        className={`${novaSquare.variable} ${geistMono.variable} antialiased font-[family-name:var(--font-geist-sans)]`}
      >
        <GoogleOAuthProvider
          clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""}
        >
          <NextIntlClientProvider messages={messages}>
            <Header />
            {children}
            <Footer />
          </NextIntlClientProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
