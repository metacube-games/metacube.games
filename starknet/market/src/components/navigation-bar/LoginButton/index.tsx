"use client";

import { useCallback, useState } from "react";
import { useSTRKBalance } from "@/hooks/useSTRKBalance";
import { useConnectWallet } from "@/hooks/useConnectWallet";
import { useDisconnect, useAccount } from "@starknet-react/core";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Copy, LogOut, WalletIcon } from "lucide-react";
import { truncateAddress } from "./truncateAddress";
import { formatStrkAmount } from "@/utils/blockchain";
import { useTranslations } from "next-intl";

const COPY_FEEDBACK_MS = 2000;

export function LoginButton() {
  const t = useTranslations();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);
  const { balanceNormalized, isBalanceLoading } = useSTRKBalance();
  const handleConnectClick = useConnectWallet();

  const [isOpen, setIsOpen] = useState(false);

  const handleDisconnect = useCallback(() => {
    disconnect();
    setIsOpen(false);
  }, [disconnect]);

  const handleCopyAddress = useCallback(() => {
    if (address && typeof navigator !== "undefined") {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    }
  }, [address]);

  if (!isConnected || !address) {
    return (
      <Button variant="outline" onClick={handleConnectClick}>
        <WalletIcon />
        <span className="hidden lg:inline">{t("wallet.connect")}</span>
        <span className="inline lg:hidden">{t("wallet.login")}</span>
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <WalletIcon />
        <span className="hidden font-mono text-muted-foreground lg:inline">
          {truncateAddress(address)}
        </span>
      </Button>
      <DialogContent className="min-w-[280px] sm:min-w-[400px] w-max max-w-[95%]">
        <DialogHeader>
          <DialogTitle>{t("wallet.accountTitle")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 sm:gap-10 md:gap-12 lg:gap-20">
            <DialogDescription className="font-medium">
              {t("wallet.connectedAddress")}
            </DialogDescription>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">
                {truncateAddress(address)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopyAddress}
                title={t("wallet.copyAddress")}
              >
                {copied ? <Check className="text-primary" /> : <Copy />}
                <span className="sr-only">{t("wallet.copyAddress")}</span>
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 sm:gap-10 md:gap-12 lg:gap-20">
            <DialogDescription className="font-medium">
              {t("wallet.strkBalance")}
            </DialogDescription>
            <span className="text-sm text-muted-foreground">
              {isBalanceLoading
                ? t("common.loading")
                : `${formatStrkAmount(balanceNormalized)} STRK`}
            </span>
          </div>

          <Button
            variant="destructive"
            onClick={handleDisconnect}
            className="w-full"
          >
            <LogOut />
            {t("wallet.disconnect")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
