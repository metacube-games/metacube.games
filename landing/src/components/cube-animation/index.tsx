"use client";

import Image from "next/image";
import { Compass } from "lucide-react";
import { useTranslations } from "next-intl";

import { NftMarquee } from "@/components/nft-marquee";
import { PlayButton } from "@/components/library/play-button";
import { Button } from "@/components/ui/button";

export function CubeAnimation() {
  const t = useTranslations("metadata");

  return (
    <section className="relative flex w-full flex-col items-center gap-6 pt-24 pb-12">
      <Image
        src="/logo.svg"
        alt=""
        width={240}
        height={240}
        priority
        className="h-36 w-36 sm:h-48 sm:w-48 md:h-60 md:w-60 [filter:drop-shadow(0_0_12px_#0ec630)]"
      />
      <h1 className="text-center text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold uppercase tracking-widest [filter:drop-shadow(0_0_2px_whitesmoke)]">
        {t("title")}
      </h1>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <PlayButton
          href="https://play.metacube.games"
          target="_blank"
          rel="noopener noreferrer"
          secondary=""
        >
          Play Now
        </PlayButton>
        <Button variant="outline" asChild>
          <a
            href="https://market.metacube.games/collection/allstars"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Compass aria-hidden />
            Discover Collection
          </a>
        </Button>
      </div>
      <div className="mt-16 w-full">
        <NftMarquee />
      </div>
    </section>
  );
}
