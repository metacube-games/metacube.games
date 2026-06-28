import React, { useCallback, useEffect, useState } from "react";
import { create } from "zustand";
import { GoogleLogin } from "@react-oauth/google";
import { useTranslation } from "react-i18next";
import { KeyRound, Loader2, LogIn, User, Wallet } from "lucide-react";
import { CIAlertMng } from "../AlertDialog";
import { getGuestId, postConnectGuest } from "../../../API/backendAPI";
import { getGuestIdFromStorage, saveGuestId } from "../../utils/guestUtils";
import { setGameCoInit } from "../../InterfacePresenter";
import { useConnectWallet } from "../../../hooks/useConnectWallet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { cn } from "../../../lib/utils";

interface ConnexionModalState {
  open: boolean;
  handleOpen: () => void;
  handleClose: () => void;
}

export const useOpenConnexionModal = create<ConnexionModalState>((set) => ({
  open: false,
  handleOpen: () => set({ open: true }),
  handleClose: () => set({ open: false }),
}));

interface TransitionsModalProps {
  onAuthSuccess: () => void;
  onAuthRequest: (
    method: "google" | "guest",
    credential?: string,
    guestId?: string,
  ) => Promise<void>;
}

const TransitionsModal: React.FC<TransitionsModalProps> = ({
  onAuthSuccess,
  onAuthRequest,
}) => {
  const { t } = useTranslation();
  const { open, handleOpen, handleClose } = useOpenConnexionModal();
  const { openPicker, finalizeAuth } = useConnectWallet();
  const [showGuestIdInput, setShowGuestIdInput] = useState(false);
  const [guestIdInput, setGuestIdInput] = useState("");
  const [guestIdError, setGuestIdError] = useState("");
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (!open) {
      setShowGuestIdInput(false);
      setGuestIdInput("");
      setGuestIdError("");
      setSigning(false);
    }
  }, [open]);

  const handleGoogleLogin = useCallback(
    async (credential: string) => {
      try {
        await onAuthRequest("google", credential);
        onAuthSuccess();
      } catch (error) {
        console.error("Google login failed:", error);
      } finally {
        handleClose();
      }
    },
    [onAuthRequest, onAuthSuccess, handleClose],
  );

  const handleWalletConnect = useCallback(async () => {
    // Hide login dialog while starknetkit picker is up — stacked modals dropped the first click.
    handleClose();
    const connector = await openPicker();
    if (!connector) {
      handleOpen();
      return;
    }
    setSigning(true);
    handleOpen();
    try {
      const authData = await finalizeAuth(connector);
      if (authData) {
        setGameCoInit(authData);
        onAuthSuccess();
        setSigning(false);
        handleClose();
        return;
      }
    } catch (error) {
      console.error("Wallet auth failed:", error);
      // 404 = wallet not yet deployed — hand off to dedicated deploy alert.
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 404) {
        setSigning(false);
        handleClose();
        if (connector.id === "controller") {
          CIAlertMng.dialogs.walletCNotDeployed.emit();
        } else {
          CIAlertMng.dialogs.walletNotDeployed.emit();
        }
        return;
      }
    }
    setSigning(false);
  }, [openPicker, finalizeAuth, onAuthSuccess, handleClose, handleOpen]);

  const handleGuestLogin = useCallback(async () => {
    try {
      let guestId = getGuestIdFromStorage();
      if (!guestId) {
        const guestIdResponse = await getGuestId();
        guestId = guestIdResponse.guestId;
      }
      if (!guestId) return;
      saveGuestId(guestId);
      await onAuthRequest("guest", undefined, guestId);
      onAuthSuccess();
    } catch (error) {
      console.error("Guest login failed:", error);
      CIAlertMng.dialogs.unExpectedError.emit();
    } finally {
      handleClose();
    }
  }, [onAuthRequest, onAuthSuccess, handleClose]);

  const handleExistingGuestLogin = useCallback(async () => {
    const trimmedGuestId = guestIdInput.trim();
    if (!trimmedGuestId) {
      setGuestIdError(t("auth.enterValidGuestId"));
      return;
    }
    try {
      const authData = await postConnectGuest(trimmedGuestId);
      saveGuestId(trimmedGuestId);
      if (authData) setGameCoInit(authData);
      onAuthSuccess();
      setGuestIdError("");
      handleClose();
    } catch (error) {
      console.error("Existing guest login failed:", error);
      setGuestIdError(t("auth.invalidGuestId"));
    }
  }, [guestIdInput, onAuthSuccess, handleClose, t]);

  const openGuestIdInput = () => {
    setShowGuestIdInput(true);
    setGuestIdError("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !signing) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-sm" hideClose={signing}>
        <DialogHeader>
          <DialogTitle>{t("auth.login")}</DialogTitle>
        </DialogHeader>

        {signing ? (
          <div className="flex flex-col items-center justify-center gap-3 py-6">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {t("auth.waitingForSignature")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={(response) => {
                  if (response.credential) {
                    handleGoogleLogin(response.credential);
                  }
                }}
                onError={() => {
                  CIAlertMng.dialogs.loginFailed.emit();
                }}
                theme="filled_black"
              />
            </div>

            <Button variant="outline" onClick={handleWalletConnect}>
              <Wallet />
              {t("auth.digitalWallet")}
            </Button>

            <Button variant="outline" onClick={handleGuestLogin}>
              <User />
              {t("auth.playAsGuest")}
            </Button>

            {showGuestIdInput ? (
              <div className="flex flex-col gap-2">
                <Input
                  placeholder={t("auth.enterGuestId")}
                  value={guestIdInput}
                  onChange={(e) => setGuestIdInput(e.target.value)}
                  aria-invalid={!!guestIdError || undefined}
                  className={cn(
                    guestIdError && "border-red-500 focus-visible:ring-red-500",
                  )}
                />
                {guestIdError && (
                  <p className="text-xs text-red-500">{guestIdError}</p>
                )}
                <Button variant="outline" onClick={handleExistingGuestLogin}>
                  <LogIn />
                  {t("auth.connectWithId")}
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={openGuestIdInput}>
                <KeyRound />
                {t("auth.haveGuestId")}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TransitionsModal;
