import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://metacube.games"),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
