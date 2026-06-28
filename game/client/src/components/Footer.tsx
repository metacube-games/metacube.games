import React from "react";
import { SiteFooter } from "./library/site-footer";
import { useGStore } from "../menu/useGeneralStore";

export const Footer = React.memo(() => {
  const menuDisplay = useGStore((state) => state.menuDisplay);
  if (!menuDisplay) return null;

  return <SiteFooter version="1.1.0" />;
});

Footer.displayName = "Footer";
