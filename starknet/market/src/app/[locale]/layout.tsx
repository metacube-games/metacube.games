import type { Metadata, Viewport } from "next";
import React from "react";
import "../globals.css";
import { Header } from "@/components/navigation-bar/Header";
import Footer from "@/components/footer";
import QueryProvider from "@/lib/utils/queryClient";
import { StarknetProvider } from "@/lib/starknet-provider";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { locales, type Locale } from "@/i18n";
import { notFound } from "next/navigation";
import { Nova_Square, Geist_Mono } from "next/font/google";
import { OrganizationSchema, WebSiteSchema } from "@/components/StructuredData";

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
    languages[loc] = `https://market.metacube.games/${loc}`;
  });

  languages["x-default"] = "https://market.metacube.games/en";

  return {
    metadataBase: new URL("https://market.metacube.games"),
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
      url: `https://market.metacube.games/${locale}`,
      title: t("title"),
      description: t("description"),
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: t("ogImageAlt"),
          type: "image/png",
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
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
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
    alternates: {
      canonical: `https://market.metacube.games/${locale}`,
      languages,
    },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
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
      {/* suppressHydrationWarning: browser extensions inject body attrs before React hydrates. */}
      <body
        suppressHydrationWarning
        className={`${novaSquare.variable} ${geistMono.variable} antialiased font-[family-name:var(--font-geist-sans)]`}
      >
        <OrganizationSchema locale={locale} />
        <WebSiteSchema locale={locale} />
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <StarknetProvider>
              <Header />
              {children}
              <Footer />
            </StarknetProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
