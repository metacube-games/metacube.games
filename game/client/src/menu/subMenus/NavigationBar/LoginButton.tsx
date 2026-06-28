import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Info,
  Link2,
  Loader2,
  LogOut,
  Wallet as WalletIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import { SGG, useGSelectors, useGStore } from "../../useGeneralStore";
import { useOpenConnexionModal } from "./ConnexionModal";
import { getReferralInvites, getRewardAddress } from "../../../API/backendAPI";
import { openInSameBrowser } from "../../../utils/browserUtils";
import { truncateAddress } from "../../../utils/addressUtils";
import { MetacubeCoinSvg } from "../../HUD/CoinSvg";
import TransitionsModal from "./ConnexionModal";

const COPY_FEEDBACK_MS = 2000;

function normalizeWalletAddress(addr: string) {
  if (!addr) return "";
  // Store strips the `0x` prefix; re-add to match canonical format.
  return addr.startsWith("0x") ? addr : `0x${addr}`;
}

export function LoginButton({
  onDisconnect,
  onAuthSuccess,
  onAuthRequest,
}: {
  onAuthRequest: (method: "google" | "guest") => Promise<void>;
  onDisconnect: (isGoogle: boolean, isGuest?: boolean) => Promise<void>;
  onAuthSuccess?: () => void;
}) {
  const { t } = useTranslation();
  const { isConnected } = useGStore(
    useShallow((state) => ({
      isConnected: state.isConnected,
    })),
  );
  const { handleOpen } = useOpenConnexionModal();
  const { isConnectionLoading } = useGSelectors("isConnectionLoading");

  if (isConnectionLoading) {
    return (
      <Button variant="outline" disabled aria-label={t("ui.buttons.login")}>
        <Loader2 className="animate-spin" />
      </Button>
    );
  }

  if (!isConnected) {
    return (
      <>
        <Button variant="outline" onClick={handleOpen}>
          <WalletIcon />
          <span>{t("ui.buttons.login")}</span>
        </Button>
        <TransitionsModal
          onAuthSuccess={onAuthSuccess ?? (() => {})}
          onAuthRequest={onAuthRequest}
        />
      </>
    );
  }

  return <BasicMenu onDisconnect={onDisconnect} />;
}

function BasicMenu({
  onDisconnect,
}: {
  onDisconnect: (isGoogle: boolean, isGuest?: boolean) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { googleId, guestId, googleEmail } = useGSelectors(
    "googleId",
    "guestId",
    "googleEmail",
  );
  const fullAddress = useGStore((state) => state.address);
  const { data: rewardAddressData } = useQuery({
    queryKey: ["rewardAddress"],
    queryFn: async () => {
      const response = await getRewardAddress();
      return response.address ?? "";
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!fullAddress,
  });

  const { data: referralStats = { total: 0, successful: 0 } } = useQuery({
    queryKey: ["referralStats"],
    queryFn: async () => {
      const res = await getReferralInvites();
      if (!res) return { total: 0, successful: 0 };
      const list: { succeeded?: boolean }[] = res.referrals ?? [];
      const selfReferral = res.selfReferral;
      const hasBeenReferred = (selfReferral?.referrer?.length ?? 0) > 2;
      return {
        total: list.length + Number(hasBeenReferred),
        successful:
          list.filter((r) => r.succeeded).length +
          Number(selfReferral?.succeeded ?? 0),
      };
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!fullAddress,
  });
  const referralRewards = referralStats.successful * 10000;

  const [open, setOpen] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  // Backend returns referral code as a number — coerce for `.slice`.
  const referralCode = SGG.getReferralLink()
    ? String(SGG.getReferralLink())
    : "";

  useEffect(() => {
    if (!open) {
      setAddressCopied(false);
      setReferralCopied(false);
      setAddressError(null);
      setReferralError(null);
    }
  }, [open]);

  const handleClose = () => setOpen(false);

  const isGoogle = googleId && googleId?.length > 5;
  const isGuest = guestId && guestId?.length > 5;
  const showWarning = (isGoogle || isGuest) && !rewardAddressData;
  const tooltipMessage = t("wallet.linkRewardsWarning");

  const triggerLabel = isGoogle
    ? (googleEmail || fullAddress).split("@")[0]
    : isGuest
      ? truncateAddress(guestId || fullAddress, 4, 4)
      : truncateAddress(normalizeWalletAddress(fullAddress));

  const handleDisconnect = async () => {
    handleClose();
    await onDisconnect(!!isGoogle, !!isGuest);
  };

  const handleCopyAddress = async () => {
    setAddressError(null);
    try {
      let toCopy = "";
      if (isGoogle) toCopy = googleEmail || fullAddress;
      else if (isGuest) toCopy = guestId || fullAddress;
      else toCopy = normalizeWalletAddress(fullAddress);

      if (!toCopy) {
        setAddressError(t("wallet.errors.noAddress"));
        return;
      }
      await navigator.clipboard.writeText(toCopy);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), COPY_FEEDBACK_MS);
    } catch (err) {
      console.error("Failed to copy address", err);
      setAddressError(t("wallet.errors.copyFailed"));
    }
  };

  const handleCopyReferral = async () => {
    setReferralError(null);
    try {
      if (!referralCode) {
        setReferralError(t("wallet.errors.noReferralLink"));
        return;
      }
      await navigator.clipboard.writeText(
        `https://play.metacube.games/?referral=${referralCode}`,
      );
      setReferralCopied(true);
      setTimeout(() => setReferralCopied(false), COPY_FEEDBACK_MS);
    } catch (err) {
      console.error("Failed to copy referral link", err);
      setReferralError(t("wallet.errors.copyFailed"));
    }
  };

  const handleLinkWallet = useCallback(() => {
    openInSameBrowser("https://link.metacube.games");
  }, []);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        title={showWarning ? tooltipMessage : undefined}
      >
        <WalletIcon />
        <span
          className={cn(
            "hidden max-w-[14ch] truncate text-sm text-muted-foreground lg:inline",
            !isGoogle && "font-mono",
          )}
        >
          {triggerLabel}
        </span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="min-w-[280px] w-max max-w-[95%] sm:min-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t("wallet.accountTitle")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3 sm:gap-10 md:gap-12 lg:gap-20">
                <DialogDescription className="font-medium">
                  {isGoogle
                    ? t("wallet.googleAccount")
                    : isGuest
                      ? t("wallet.guestId")
                      : t("wallet.walletAddress")}
                </DialogDescription>
                <div className="flex min-w-0 items-center gap-2">
                  {isGoogle ? (
                    <span
                      className="truncate text-sm text-muted-foreground"
                      title={googleEmail || fullAddress}
                    >
                      {googleEmail || fullAddress}
                    </span>
                  ) : (
                    <span className="font-mono text-sm text-muted-foreground">
                      {isGuest
                        ? truncateAddress(guestId || fullAddress, 4, 4)
                        : truncateAddress(normalizeWalletAddress(fullAddress))}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={handleCopyAddress}
                    title={t("wallet.copyAddress")}
                  >
                    {addressCopied ? (
                      <Check className="text-primary" />
                    ) : (
                      <Copy />
                    )}
                    <span className="sr-only">{t("wallet.copyAddress")}</span>
                  </Button>
                </div>
              </div>
              {addressError && (
                <p className="text-xs text-red-500">{addressError}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3 sm:gap-10 md:gap-12 lg:gap-20">
                <DialogDescription className="flex items-center gap-1.5 font-medium">
                  {t("wallet.referralLink")}
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info
                          className="size-3.5 cursor-help text-muted-foreground"
                          aria-label={t("referral.referralTooltip")}
                        />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        {t("referral.referralTooltip")}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </DialogDescription>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">
                    {referralCode
                      ? `https://...${referralCode.slice(-4)}`
                      : "—"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={handleCopyReferral}
                    title={t("wallet.copyReferral")}
                  >
                    {referralCopied ? (
                      <Check className="text-primary" />
                    ) : (
                      <Copy />
                    )}
                    <span className="sr-only">{t("wallet.copyReferral")}</span>
                  </Button>
                </div>
              </div>
              {referralError && (
                <p className="text-xs text-red-500">{referralError}</p>
              )}
            </div>

            <ReferralStatRow
              label={t("leaderboard.totalReferrals", "Total referrals:")}
              value={
                <span className="font-mono text-sm tabular-nums text-muted-foreground">
                  {referralStats.total}
                </span>
              }
            />
            <ReferralStatRow
              label={t(
                "leaderboard.successfulReferrals",
                "Successful referrals:",
              )}
              value={
                <span className="font-mono text-sm tabular-nums text-muted-foreground">
                  {referralStats.successful}
                </span>
              }
            />
            <ReferralStatRow
              label={t(
                "leaderboard.totalReferralRewardsEarned",
                "Total rewards earned:",
              )}
              value={
                <span className="flex items-center gap-1 font-mono text-sm tabular-nums text-muted-foreground">
                  {referralRewards}
                  <MetacubeCoinSvg wh="14" />
                </span>
              }
            />

            {showWarning && (
              <Button
                variant="outline"
                onClick={handleLinkWallet}
                title={tooltipMessage}
              >
                <Link2 />
                {t("wallet.linkWallet")}
              </Button>
            )}

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
    </>
  );
}

function ReferralStatRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-3 sm:gap-10 md:gap-12 lg:gap-20">
      <DialogDescription className="font-medium">{label}</DialogDescription>
      {value}
    </div>
  );
}
