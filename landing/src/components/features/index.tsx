"use client";

import { useTranslations } from "next-intl";
import { Code2, Globe, Rocket, Users } from "lucide-react";

import { FeatureCard, FeatureGrid } from "@/components/library/feature-card";

export default function Features() {
  const t = useTranslations("home.features");

  const items = [
    {
      icon: <Rocket />,
      title: t("items.poweredByStarknet.title"),
      description: t("items.poweredByStarknet.description"),
      href: "https://www.starknet.io/",
    },
    {
      icon: <Globe />,
      title: t("items.freeToPlay.title"),
      description: t("items.freeToPlay.description"),
    },
    {
      icon: <Users />,
      title: t("items.massiveEvent.title"),
      description: t("items.massiveEvent.description"),
    },
    {
      icon: <Code2 />,
      title: t("items.openSource.title"),
      description: t("items.openSource.description"),
      href: "https://github.com/metacube-games/metacube.games",
    },
  ];

  return (
    <section
      className="flex flex-col items-center mb-24"
      aria-labelledby="features-heading"
    >
      <h2
        id="features-heading"
        className="text-center text-2xl sm:text-3xl md:text-4xl font-semibold mb-4 sm:mb-6 md:mb-8"
      >
        {t("title")}
      </h2>
      <FeatureGrid className="w-full">
        {items.map((it) => (
          <FeatureCard key={it.title} {...it} />
        ))}
      </FeatureGrid>
    </section>
  );
}
