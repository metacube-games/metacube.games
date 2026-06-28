"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { disconnect as disconnectWallet } from "starknetkit";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Link2,
  LogIn,
  Wallet,
} from "lucide-react";

import {
  LoginButton,
  setInitialStates,
} from "@/components/navigation-bar/LoginButton";
import {
  getRewardAddress,
  setRewardAddressBAPI,
  postConnectGuest,
} from "@/services/backendAPI";
import { useAuthStore } from "@/store/authStore";
import { connectToStarknet } from "@/utils/walletUtils";
import { reportError } from "@/lib/reportError";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FormField } from "@/components/library/form-field";
import { Spinner } from "@/components/library/spinner";
import { StepIndicator } from "@/components/library/step-indicator";
import { ErrorMessage } from "@/components/library/error-message";

const GUEST_ID_KEY = "starkgame_guest_id";

function getGuestIdFromStorage(): string | null {
  try {
    return localStorage.getItem(GUEST_ID_KEY);
  } catch {
    return null;
  }
}

export function LinkWallet() {
  const t = useTranslations();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [googleRewardAddress, setGoogleRewardAddress] = useState("");
  const [guestRewardAddress, setGuestRewardAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const googleID = useAuthStore((state) => state.googleId);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const googleUsername = useAuthStore((state) => state.googleUsername);
  const guestUsername = useAuthStore((state) => state.guestUsername);
  const accessToken = useAuthStore((state) => state.accessToken);
  const resetAuth = useAuthStore((state) => state.reset);

  const initialLoginMethod = (() => {
    try {
      return localStorage.getItem(GUEST_ID_KEY) ? "guest" : "google";
    } catch {
      return "google";
    }
  })();

  const [loginMethod, setLoginMethod] = useState<"google" | "guest">(
    initialLoginMethod,
  );
  const [guestId, setGuestId] = useState<string | null>(null);
  const [guestIdInput, setGuestIdInput] = useState("");
  const [guestIdError, setGuestIdError] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedGuestId = getGuestIdFromStorage();
    if (storedGuestId) {
      setGuestId(storedGuestId);
      setLoginMethod("guest");
      postConnectGuest(storedGuestId)
        .then((data) => {
          if (data) setInitialStates(data);
        })
        .catch((err) =>
          reportError("LinkWallet:restoreGuestSession", err),
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally fire-once on mount to restore a pre-existing guest session from localStorage
  }, []);

  const handleExistingGuestLogin = async () => {
    if (!guestIdInput.trim()) {
      setGuestIdError(t("errors.enterValidGuestId"));
      return;
    }
    setIsLoading(true);
    setGuestIdError("");
    try {
      const data = await postConnectGuest(guestIdInput);
      if (data) setInitialStates(data);
      setGuestId(guestIdInput);
    } catch (err) {
      reportError("LinkWallet:handleExistingGuestLogin", err);
      setGuestIdError(t("errors.failedConnectGuestId"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const userIdentified =
      loginMethod === "google"
        ? googleID?.length > 5
        : !!guestId && guestId.length > 5;
    if (walletAddress && userIdentified && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [walletAddress, googleID, guestId, loginMethod]);

  const connectWallet = async () => {
    setError(null);
    if (walletAddress) {
      setIsLoading(true);
      try {
        await disconnectWallet();
        setWalletAddress(null);
      } catch (err) {
        reportError("LinkWallet:disconnectWallet", err);
        setError(t("errors.connectWalletFailed"));
      } finally {
        setIsLoading(false);
      }
      return;
    }
    setIsLoading(true);
    try {
      const result = await connectToStarknet();
      if (result?.connector && !result?.connectorData?.account) {
        setError(t("errors.connectWalletFailed"));
      } else if (result?.connectorData?.account) {
        setWalletAddress(result.connectorData.account);
      }
    } catch (err) {
      reportError("LinkWallet:connectToStarknet", err);
      setError(t("errors.connectWalletFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const rewardAsync = useCallback(
    async (token: string) => {
      if (!token || token.length < 5) return;
      const userIdentified =
        loginMethod === "google"
          ? googleID?.length > 5
          : !!guestId && guestId.length > 5;
      if (userIdentified) {
        const rewardAddressF = await getRewardAddress();
        if (!rewardAddressF.address) return;
        const fRewardAddress = `0x${rewardAddressF.address}`;
        if (loginMethod === "google") setGoogleRewardAddress(fRewardAddress);
        else setGuestRewardAddress(fRewardAddress);
      }
    },
    [googleID, guestId, loginMethod],
  );

  useEffect(() => {
    rewardAsync(accessToken);
  }, [rewardAsync, accessToken]);

  const backToLogin = () => {
    try {
      localStorage.removeItem(GUEST_ID_KEY);
    } catch (err) {
      // Safari private mode / storage quota — non-fatal but worth logging.
      reportError("LinkWallet:removeGuestId", err);
    }
    setGuestId(null);
    setGuestIdInput("");
    setGuestIdError("");
    setGoogleRewardAddress("");
    setGuestRewardAddress("");
    resetAuth();
  };

  const confirmLinking = () => {
    setError(null);
    setIsLoading(true);
    setRewardAddressBAPI(walletAddress as string)
      .catch((err) => {
        reportError("LinkWallet:setRewardAddress", err);
        setError(t("errors.linkWalletFailed"));
      })
      .finally(() => {
        rewardAsync(accessToken);
        setIsLoading(false);
      });
  };

  const currentRewardAddress =
    loginMethod === "google" ? googleRewardAddress : guestRewardAddress;
  const isAuthenticated =
    loginMethod === "google" ? googleID?.length > 5 : guestId !== null;
  const isLinked = currentRewardAddress?.length > 5;
  const hasWallet = !!walletAddress && walletAddress.length > 5;

  const currentStep = isLinked ? 3 : hasWallet ? 2 : isAuthenticated ? 1 : 0;

  const steps = [
    t("linkWallet.step1"),
    t("linkWallet.step2"),
    t("linkWallet.step3"),
  ];

  return (
    <div className="space-y-6">
      <StepIndicator steps={steps} current={Math.min(currentStep, 2)} />

      {/* Kept mounted so <GoogleLogin> never unmounts (avoids GSI initialize-multiple-times warnings). */}
      <div hidden={currentStep !== 0}>
        <Tabs
          value={loginMethod}
          onValueChange={(v) => setLoginMethod(v as "google" | "guest")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="google">
              {t("linkWallet.googleLogin")}
            </TabsTrigger>
            <TabsTrigger value="guest">{t("linkWallet.guestId")}</TabsTrigger>
          </TabsList>

          <TabsContent
            value="google"
            className="flex min-h-24 flex-col items-center justify-start gap-3 pt-4"
          >
            <LoginButton />
          </TabsContent>

          <TabsContent
            value="guest"
            className="flex min-h-24 flex-col items-center justify-start gap-3 pt-4"
          >
            <div className="w-full space-y-2">
              <FormField
                label={t("linkWallet.enterGuestId")}
                htmlFor="guest-id"
                error={guestIdError}
              >
                <div className="flex items-center gap-2">
                  <Input
                    id="guest-id"
                    type="text"
                    value={guestIdInput}
                    onChange={(e) => setGuestIdInput(e.target.value)}
                    placeholder={t("linkWallet.enterGuestId")}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExistingGuestLogin}
                    disabled={isLoading || !guestIdInput.trim()}
                  >
                    {isLoading ? <Spinner size={14} /> : <LogIn />}
                    {t("linkWallet.connect")}
                  </Button>
                </div>
              </FormField>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {currentStep === 1 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={backToLogin}
            disabled={isLoading}
          >
            <ArrowLeft />
            {t("linkWallet.back")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={connectWallet}
            disabled={isLoading}
            aria-label={t("linkWallet.connectWallet")}
          >
            {isLoading && <Spinner size={14} />}
            <Wallet />
            {t("linkWallet.connectWallet")}
          </Button>
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-4">
          <Alert variant="warning">
            <AlertTriangle />
            <AlertDescription>{t("linkWallet.verifyAddress")}</AlertDescription>
          </Alert>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={connectWallet}
              disabled={isLoading}
            >
              <ArrowLeft />
              {t("linkWallet.back")}
            </Button>
            <Button
              type="button"
              variant="outline"
              ref={confirmButtonRef}
              onClick={confirmLinking}
              disabled={!hasWallet || !isAuthenticated || isLoading}
              aria-live="polite"
            >
              {isLoading ? <Spinner size={14} /> : <Link2 />}
              {t("linkWallet.confirmWalletLinking")}
            </Button>
          </div>
        </div>
      )}

      {currentStep === 3 && (
        <Alert variant="success" role="status" aria-live="polite">
          <CheckCircle2 />
          <AlertDescription>
            {t("linkWallet.successfullyLinked", {
              address: `${currentRewardAddress.slice(0, 6)}…${currentRewardAddress.slice(-4)}`,
              username:
                (loginMethod === "google" ? googleUsername : guestUsername) ||
                "",
            })}
          </AlertDescription>
        </Alert>
      )}

      {error && <ErrorMessage>{error}</ErrorMessage>}
    </div>
  );
}
