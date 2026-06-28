"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { SkinKey } from "@/components/skin-viewer";

const SkinViewer = dynamic(
  () => import("@/components/skin-viewer").then((m) => m.SkinViewer),
  { ssr: false },
);

const SKINS: { key: SkinKey; name: string; description: string }[] = [
  { key: "stove", name: "Stove", description: "The normy" },
  { key: "zombie", name: "Zombie", description: "The crackhead" },
  { key: "ogStove", name: "OG Stove", description: "The legendary" },
  { key: "brother", name: "Brother", description: "The aligned" },
  { key: "peltonFlusk", name: "Pelton Flusk", description: "The conquerer" },
  { key: "stoveMonke", name: "Stove Monke", description: "The troller" },
];

const PEOPLE = [
  {
    name: "Kamyar Taher",
    designation: "Frontend Engineer",
    image: "/ppKamyar.jpeg",
    link: "https://www.linkedin.com/in/kamyar-taher-4380b614a/",
  },
  {
    name: "Bastien Faivre",
    designation: "Backend Engineer",
    image: "/ppBastien.jpeg",
    link: "https://www.linkedin.com/in/bastienfaivre/",
  },
  {
    name: "Nils Delage",
    designation: "Smart Contract Engineer",
    image: "/ppNils.jpeg",
    link: "https://www.linkedin.com/in/nils-delage-934a67239/",
  },
];

const CARD_CLASS =
  "group flex aspect-[2/3] h-48 w-32 flex-col overflow-hidden rounded-lg border-2 bg-card transition-colors hover:border-primary sm:h-56 sm:w-40 md:h-64 md:w-44";

export default function Team() {
  const t = useTranslations("home.team");

  return (
    <section aria-labelledby="team-heading">
      <h2
        id="team-heading"
        className="text-center text-2xl sm:text-3xl md:text-4xl font-semibold mb-4 sm:mb-6 md:mb-8"
      >
        {t("title")}
      </h2>
      <div className="mx-auto flex max-w-[572px] flex-wrap items-stretch justify-center gap-4">
        {PEOPLE.map((p) => (
          <Link
            key={p.name}
            href={p.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("learnMoreAbout", {
              name: p.name,
              designation: p.designation,
            })}
            className={CARD_CLASS}
          >
            <div className="relative flex-1">
              <Image
                src={p.image}
                alt={`${p.name} - ${p.designation}`}
                fill
                sizes="(max-width: 640px) 8rem, (max-width: 768px) 10rem, 11rem"
                className="object-cover object-top"
              />
            </div>
            <div className="flex flex-col items-center justify-center border-t-2 px-2 py-1 text-center">
              <p className="w-full truncate text-xs font-semibold">{p.name}</p>
              <p className="w-full truncate text-[10px] text-muted-foreground">
                {p.designation}
              </p>
            </div>
          </Link>
        ))}
        {SKINS.map((s) => (
          <div key={s.key} className={CARD_CLASS}>
            <div className="relative flex-1">
              <SkinViewer skin={s.key} />
            </div>
            <div className="flex flex-col items-center justify-center border-t-2 px-2 py-1 text-center">
              <p className="w-full truncate text-xs font-semibold">{s.name}</p>
              <p className="w-full truncate text-[10px] text-muted-foreground">
                {s.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
