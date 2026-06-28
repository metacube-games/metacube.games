import type { Metadata, Viewport } from "next";
import React from "react";
import "../globals.css";
import "../../styles/prism-theme.css";
import { Nova_Square, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import {
  setRequestLocale,
  getMessages,
  getTranslations,
} from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/i18n";
import { LandingHeader } from "@/components/site/landing-header";
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
    languages[loc] = `https://metacube.games/${loc}`;
  });
  languages["x-default"] = "https://metacube.games/en";

  return {
    metadataBase: new URL("https://metacube.games"),
    title: {
      default: t("title"),
      template: t("titleTemplate"),
    },
    description: t("description"),
    keywords: t("keywords").split(", "),
    authors: [{ name: "Metacube Team", url: "https://metacube.games" }],
    creator: "Metacube Team",
    manifest: "/site.webmanifest",
    openGraph: {
      type: "website",
      url: `https://metacube.games/${locale}`,
      title: t("title"),
      description: t("description"),
      images: [
        {
          url: "/metadata-image.png",
          width: 1200,
          height: 630,
          alt: t("ogImageAlt"),
        },
      ],
      siteName: t("siteName"),
      locale: localeMap[locale as Locale] || "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      creator: "@MetacubeGames",
      site: "@MetacubeGames",
      images: [
        {
          url: "/metadata-image.png",
          alt: t("ogImageAlt"),
        },
      ],
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
    verification: {
      google: "c094d69005c828f0",
    },
    alternates: {
      canonical: `https://metacube.games/${locale}`,
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
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      {/* suppressHydrationWarning silences false positives from extensions (Grammarly, Dark Reader) injecting body attrs pre-hydration. */}
      <body
        suppressHydrationWarning
        className={`${novaSquare.variable} ${geistMono.variable} antialiased font-[family-name:var(--font-geist-sans)]`}
      >
        <NextIntlClientProvider messages={messages}>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Skip to main content
          </a>
          <LandingHeader />
          {children}
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
