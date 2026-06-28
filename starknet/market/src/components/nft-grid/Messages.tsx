"use client";

import { useTranslations } from "next-intl";
import { WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoginPromptProps {
  openLoginDialog: () => void;
}

export function LoginPrompt({ openLoginDialog }: LoginPromptProps) {
  const t = useTranslations("nftGrid.messages");
  return (
    <>
      <h3 className="text-xl font-semibold">{t("loginPromptTitle")}</h3>
      <div className="mt-4 flex justify-center">
        <Button variant="outline" onClick={openLoginDialog}>
          <WalletIcon />
          {t("connectWallet")}
        </Button>
      </div>
    </>
  );
}

interface EmptyMessageProps {
  title?: string;
  message?: string;
}

export function EmptyMessage({ title, message }: EmptyMessageProps) {
  const t = useTranslations("nftGrid.messages");
  const displayTitle = title || t("noNftsFound");
  const displayMessage = message || t("noNftsAvailable");

  return (
    <>
      <h3 className="text-xl font-semibold">{displayTitle}</h3>
      <p className="text-muted-foreground mt-2">{displayMessage}</p>
    </>
  );
}

interface ErrorMessageProps {
  error: unknown;
}

export function ErrorMessage({ error }: ErrorMessageProps) {
  const t = useTranslations("nftGrid.messages");
  return (
    <div className="text-destructive p-4 text-center">
      <h3 className="text-xl font-semibold mb-2">{t("errorLoadingNfts")}</h3>
      <p>{error instanceof Error ? error.message : t("unknownError")}</p>
    </div>
  );
}
