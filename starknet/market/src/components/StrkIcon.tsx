"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

interface StrkIconProps {
  className?: string;
  width?: number;
  height?: number;
}

export function StrkIcon({
  className,
  width = 20,
  height = 20,
}: StrkIconProps) {
  const t = useTranslations("ui.strk");
  return (
    <Image
      src="/images/starknet-token-strk-logo.svg"
      alt={t("alt")}
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
