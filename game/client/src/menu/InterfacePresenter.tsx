import React, { useEffect, useCallback, startTransition, useRef } from "react";
import { MiddleBar } from "./subMenus/MiddleBar/MiddleBar";
import { LogoDynamicBar } from "./subMenus/MetacubeLogo";
import { Header } from "../components/Header";
import { TopMenuModal } from "./subMenus/NavigationBar/TopMenuModal";
import { setPublicKeyFromCookies, signMessage } from "../API/starknet";
import {
  deleteQueue,
  getDisconnect,
  getNonce,
  getPlace,
  getReferralCode,
  getRefresh,
  postConnect,
  postConnectGoogle,
  setAccessToken,
  postConnectGuest,
} from "../API/backendAPI";
import { CISocketMng } from "../API/socketMessagesManager";
import { CIUpgradeMng } from "./subMenus/NavigationBar/Model/CUpgradeManager";
import { AlertDialog, CIAlertMng } from "./subMenus/AlertDialog";
import { CIPlayer } from "../players/model/playerPhysic";
import { CISoundMng } from "../sound/soundFX";
import { useGStore, SAG, useGSelectors } from "./useGeneralStore";
import { useDisconnect as useStarknetDisconnect } from "@starknet-react/core";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SAresetAchievementsAction } from "./subMenus/NavigationBar/Model/achievement/store";
import { clearGuestSession, getGuestIdFromStorage } from "./utils/guestUtils";
import { useConnectWallet } from "../hooks/useConnectWallet";
import i18n from "../i18n/config";
const REFRESH_INTERVAL = 200000;

export const InterfacePresenter = React.memo(() => {
  const { menuDisplay, isInGameQueue, isInGame, isConnected, readyToRender3 } =
    useGSelectors(
      "menuDisplay",
      "isInGameQueue",
      "isInGame",
      "isConnected",
      "readyToRender3",
    );

  useMenuDisplay();

  useEffect(() => {
    if (isConnected) {
      getReferralCode().then((referralCode) => {
        if (referralCode?.code) SAG.setReferralLink(String(referralCode.code));
      });
    }
  }, [isConnected]);

  useRefreshData(isConnected);

  const onAuthRequest = useAuthRequest();
  const handleDisconnect = useDisconnect();
  const leftButtonClickedACB = useLeftButtonAction(isInGame, isInGameQueue);
  const rightButtonClickedACB = useRightButtonAction(isInGame);

  return (
    <div
      className={menuDisplay ? "gameMenu" : "hidden"}
      style={{
        background: readyToRender3
          ? "#121212aa"
          : "linear-gradient(to right bottom, rgb(5, 5, 5), rgb(45, 45, 45)) ",
      }}
    >
      <Header onAuthRequest={onAuthRequest} onDisconnect={handleDisconnect} />
      <TopMenuModal />
      <AlertDialog />
      {/* `pointer-events-none` on the wrapper + `auto` on the menu lets clicks fall through to the canvas. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center gap-6 pt-24 pb-12">
        <LogoDynamicBar />
        <div className="pointer-events-auto">
          <MiddleBar
            leftButtonClicked={leftButtonClickedACB}
            rightButtonClicked={rightButtonClickedACB}
          />
        </div>
      </div>
    </div>
  );
});

function useMenuDisplay() {
  const menuDisplay = useGStore((state) => state.menuDisplay);
  useEffect(() => {
    if (menuDisplay) {
      CISoundMng?.soundsFx.enteringMenu.updateSound();
      if (CIAlertMng.isCurrState(CIAlertMng.dialogs.barrier)) {
        CIAlertMng.dialogs.nothing.emit();
      }
      document.exitPointerLock?.();
    }
  }, [menuDisplay]);
}

const isConnectedTimer = Date.now();
function useRefreshData(isConnected: boolean) {
  const syncFirstTimeRef = useRef(true);
  const { data, isSuccess, isLoading } = useQuery({
    queryKey: ["refreshData", isConnected],
    queryFn: async () => {
      if (syncFirstTimeRef.current) {
        SAG.setIsConnectionLoading(true);
        const res = await getRefresh(true);
        SAG.setIsConnectionLoading(false);
        return res;
      } else {
        if (!isConnected || isConnectedTimer + 10000 > Date.now()) return false;
        return getRefresh(false);
      }
    },
    refetchInterval: REFRESH_INTERVAL,
    retry: isConnected ? 1 : 0,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (isLoading) return;
    SAG.setIsConnectionLoading(false);
    if (!isSuccess || !data) return;
    if (syncFirstTimeRef.current) {
      syncFirstTimeRef.current = false;
      setGameCoInit(data);
      SAG.setIsConnectionLoading(false);
    } else {
      setPublicKeyFromCookies(data.playerData.publicKey);
      setAccessToken(data.accessToken);
    }
  }, [data, isSuccess, isLoading]);
}

function useAuthRequest() {
  const { openPicker, finalizeAuth } = useConnectWallet();
  const authRequest = useMutation<
    void,
    Error,
    {
      method: "google" | "guest";
      credential?: string;
      guestId?: string;
    }
  >({
    mutationFn: async ({
      method,
      credential,
      guestId,
    }: {
      method: "google" | "guest";
      credential?: string;
      guestId?: string;
    }) => {
      SAG.setIsConnectionLoading(true);
      if (method === "google") {
        const authData = await postConnectGoogle(credential as string);
        if (authData) setGameCoInit(authData);
      } else if (method === "guest") {
        const authData = await postConnectGuest(guestId as string);
        if (authData) setGameCoInit(authData);
      }
      SAG.setIsConnectionLoading(false);
    },
    onError: (
      err: any,
      {
        method,
      }: {
        method: "google" | "guest";
        credential?: string;
        guestId?: string;
      },
    ) => {
      handleAuthenticationError(err, method);
    },
  }).mutateAsync;

  useEffect(() => {
    const handleWalletAuthenticated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        method: string;
        connection: any;
      }>;
      const method = customEvent.detail.method;
      const connection = customEvent.detail.connection;

      if (method !== "wallet" && method !== "cartridge") return;
      SAG.setIsConnectionLoading(true);

      const propagationError = (err: { message?: string }) =>
        !!err.message &&
        (err.message.includes("Contract not found") ||
          err.message.includes("Invalid contract address") ||
          err.message.includes("Transaction rejected") ||
          err.message.includes("not deployed") ||
          err.message.includes("verify signature"));

      if (method === "wallet" && connection && connection.account) {
        authenticateWithExistingWallet(connection)
          .then((authData) => {
            if (authData) {
              CIAlertMng.dialogs.nothing.emit();
              setGameCoInit(authData);
              SAG.setIsConnectionLoading(false);
            }
          })
          .catch(() => {
            const errorEvent = new CustomEvent("walletAuthenticationFailed", {
              detail: {
                error: i18n.t("errors.walletStillPropagating"),
              },
            });
            document.dispatchEvent(errorEvent);
            SAG.setIsConnectionLoading(false);
          });
        return;
      }

      openPicker()
        .then(async (connector) => {
          if (!connector) {
            SAG.setIsConnectionLoading(false);
            return;
          }
          const authData = await finalizeAuth(connector);
          if (authData) {
            CIAlertMng.dialogs.nothing.emit();
            setGameCoInit(authData);
          }
          SAG.setIsConnectionLoading(false);
        })
        .catch((err) => {
          if (!propagationError(err)) {
            handleAuthenticationError(err, method);
          }
          SAG.setIsConnectionLoading(false);
        });
    };

    document.addEventListener("walletAuthenticated", handleWalletAuthenticated);

    return () => {
      document.removeEventListener(
        "walletAuthenticated",
        handleWalletAuthenticated,
      );
    };
  }, [openPicker, finalizeAuth]);

  return useCallback(
    async (
      method: "google" | "guest",
      credential?: string,
      guestId?: string,
    ) => {
      await authRequest({ method, credential, guestId });
    },
    [authRequest],
  );
}

function useDisconnect() {
  const { disconnectAsync } = useStarknetDisconnect();
  return useCallback(
    async (isGoogle: boolean, isGuest?: boolean) => {
      if (!isGoogle && !isGuest) {
        try {
          await disconnectAsync();
        } catch {
          // Already disconnected — ignore.
        }
      }

      startTransition(() => {
        SAG.resetAllUserStatesToInitialValues();
        CIPlayer.resetAllStatsAsInitial();
        CIUpgradeMng.resetAllUpgrades();
        SAresetAchievementsAction();

        if (useGStore.getState().isInGame) {
          CISocketMng.quitGame(CIAlertMng.dialogs.nothing);
        } else if (useGStore.getState().isInGameQueue) {
          CISocketMng.sendSocketLeaveQueue();
          SAG.setIsInGameQueue(false, undefined);
        }

        if (isGuest) {
          clearGuestSession();
        }

        setAccessToken("");
      });

      try {
        await getDisconnect();
      } catch (err) {
        console.error("Error during disconnect:", err);
      }
    },
    [disconnectAsync],
  );
}

function useLeftButtonAction(isInGame: boolean, isInGameQueue: boolean) {
  return useCallback(() => {
    if (isInGame) {
      SAG.setMenuDisplay(false);
    } else if (isInGameQueue) {
      CISocketMng.sendSocketLeaveQueue();
      SAG.setIsInGameQueue(false, undefined);
      deleteQueue().catch((err) => console.error(err));
    } else {
      CISocketMng.enteringGame();

      getPlace()
        .then((data) => {
          CISocketMng.enterGame(data?.serverId);
          CIPlayer.resetStats(
            data?.playerData?.hp,
            Number(data?.playerData?.coins),
          );
        })
        .catch((err) => {
          if (err.response?.status === 202) {
            SAG.setIsInGameQueue(true, err.response.data.position);
            CISocketMng.sendSocketConnect();
          } else if (err.response?.status === 403) {
            CIAlertMng.dialogs.banned.emit();
            document.exitPointerLock?.();
          } else {
            CISocketMng.quitGame(CIAlertMng.dialogs.connectionLost);
          }
          console.error(err);
        });
    }
  }, [isInGame, isInGameQueue]);
}

function useRightButtonAction(isInGame: boolean) {
  return useCallback(() => {
    if (isInGame) {
      CISocketMng.quitGame(CIAlertMng.dialogs.nothing);
    } else {
      SAG.setMenuDisplay(false);
    }
  }, [isInGame]);
}

export function setGameCoInit(data: any) {
  setPublicKeyFromCookies(data.playerData.publicKey);
  SAG.setIsConnected(true);
  SAG.setIsStarknetID(data.playerData?.username.includes(".stark"));
  const pb = data.playerData.publicKey;
  if (pb.startsWith("google")) {
    SAG.setGoogleId(pb);
    SAG.setGoogleEmail(data.playerData?.email ?? "");
    SAG.setWalletAddress("");
    SAG.setGuestId("");
  } else if (pb.startsWith("guest")) {
    const guestId = getGuestIdFromStorage() as string;
    SAG.setGuestId(guestId);
    SAG.setGoogleId("");
    SAG.setGoogleEmail("");
    SAG.setWalletAddress("");
  } else {
    SAG.setWalletAddress(pb);
    SAG.setGoogleId("");
    SAG.setGoogleEmail("");
    SAG.setGuestId("");
  }

  SAG.setAddress(pb);
  SAG.setUsername(data.playerData?.username);
  SAG.setChatToken(data.chatToken);
  CIUpgradeMng.setAllUpgrades(data.playerData);
  CIPlayer.resetStats(data.playerData.hp, Number(data.playerData.coins));
  setAccessToken(data.accessToken);
  CISocketMng.sendSocketConnect();
  CIAlertMng.dialogs.nothing.emit();
}

function handleAuthenticationError(err: any, method: string = "") {
  SAG.setIsConnectionLoading(false);
  if (err.response?.status === 403) {
    CIAlertMng.dialogs.banned.emit();
    document.exitPointerLock?.();
  } else if (err.response?.status === 404) {
    if (method === "wallet") {
      CIAlertMng.dialogs.walletNotDeployed.emit();
    } else if (method === "cartridge") {
      CIAlertMng.dialogs.walletCNotDeployed.emit();
    }
    console.error("Wallet not yet deployed");
  } else if (err.response?.status === 401) {
    CIAlertMng.dialogs.issueVerifyingSignature.emit();
  } else {
    CIAlertMng.dialogs.unExpectedError.emit();
    console.error("Unexpected error:", err);
  }
}

async function authenticateWithExistingWallet(connection: any) {
  try {
    let walletAddress = connection.account.address.startsWith("0x")
      ? connection.account.address.substring(2)
      : connection.account.address;
    while (walletAddress.length < 64) {
      walletAddress = "0" + walletAddress;
    }

    const nonceData = await getNonce(walletAddress);
    const signature = await signMessage(connection.account, nonceData.nonce);
    const data = await postConnect(walletAddress, signature);

    return data;
  } catch (error) {
    console.error("Error authenticating with existing wallet:", error);
    throw error;
  }
}
