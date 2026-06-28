import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useProvider } from "@starknet-react/core";
import { useTranslation } from "react-i18next";
import { AlertCircle, Check, Loader2 } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { cn } from "../../lib/utils";
import { getClaim } from "../../API/backendAPI";
import { truncateAddress } from "../../utils/addressUtils";

const MIN_STRK_BALANCE = "0.001";
const STRK_TOKEN_ADDRESS =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const MAX_VERIFICATION_ATTEMPTS = 5;
const VERIFICATION_INTERVAL_MS = 2000;

const DeployWalletComponent = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState("");
  const [stepErrors, setStepErrors] = useState<Record<number, string>>({});
  const queryClient = useQueryClient();

  const { account, address, isConnected, connector } = useAccount();
  const { provider } = useProvider();
  const isConnecting = !isConnected;
  const method = connector?.id === "controller" ? "cartridge" : "wallet";
  const walletConnection = useMemo(() => {
    if (!isConnected || !account || !address) return null;
    return { account, provider, id: connector?.id ?? "unknown" };
  }, [account, address, isConnected, provider, connector]);

  const { data: strkBalance = "0", isLoading: isCheckingBalance } = useQuery({
    queryKey: ["strkBalance", walletConnection?.account?.address],
    queryFn: async () => {
      if (!walletConnection?.account?.address) return "0";
      try {
        const readBalanceFrom = (response: unknown): string | null => {
          if (!Array.isArray(response) || response.length === 0) return null;
          const balanceHex = response[0];
          if (balanceHex == null) return null;
          const balanceInWei = BigInt(balanceHex);
          const balanceInStrk = Number(balanceInWei) / Number(10n ** 18n);
          return balanceInStrk.toFixed(6);
        };
        try {
          const response = await walletConnection.account.callContract({
            contractAddress: STRK_TOKEN_ADDRESS,
            entrypoint: "balanceOf",
            calldata: [walletConnection.account.address],
          });
          const fromAccount = readBalanceFrom(response);
          if (fromAccount !== null) return fromAccount;
        } catch (callError) {
          console.error("Error calling contract:", callError);
          if (walletConnection.provider) {
            const result = await walletConnection.provider.callContract({
              contractAddress: STRK_TOKEN_ADDRESS,
              entrypoint: "balanceOf",
              calldata: [walletConnection.account.address],
            });
            const fromProvider = readBalanceFrom(result);
            if (fromProvider !== null) return fromProvider;
          }
        }
        return "0";
      } catch (error) {
        console.error("Error checking STRK balance:", error);
        return "0";
      }
    },
    enabled: !!walletConnection?.account?.address,
    refetchInterval: 5000,
  });

  const [hasClaimed, setHasClaimed] = useState(false);
  const [waitingForTokens, setWaitingForTokens] = useState(false);
  const [isVerifyingDeployment, setIsVerifyingDeployment] = useState(false);
  const [deploymentVerified, setDeploymentVerified] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [propagationComplete, setPropagationComplete] = useState(false);

  const hasEnoughBalance =
    parseFloat(strkBalance) >= parseFloat(MIN_STRK_BALANCE);

  const { data: isDeployed = false } = useQuery({
    queryKey: ["walletDeployment", walletConnection?.account?.address],
    queryFn: async () => {
      if (!walletConnection?.account?.address) return false;
      try {
        if (walletConnection.provider) {
          try {
            const classHashResponse =
              await walletConnection.provider.getClassHashAt(
                walletConnection.account.address,
              );
            return !!classHashResponse && classHashResponse !== "0x0";
          } catch (providerError) {
            if (
              providerError &&
              typeof providerError === "object" &&
              "message" in providerError &&
              typeof providerError.message === "string" &&
              (providerError.message.includes("Contract not found") ||
                providerError.message.includes("No contract class at") ||
                providerError.message.includes("Invalid contract address"))
            ) {
              return false;
            }
          }
        }
        // Heuristic: claimed + balance now below minimum implies the deploy tx consumed it.
        if (
          parseFloat(strkBalance) < parseFloat(MIN_STRK_BALANCE) &&
          hasClaimed
        ) {
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error checking wallet deployment:", error);
        return false;
      }
    },
    enabled: !!walletConnection?.account?.address,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (hasEnoughBalance && !isDeployed) {
      setStatus(t("walletDeploy.strkTokensReceived"));
      setHasClaimed(true);
      setWaitingForTokens(false);
    }
  }, [hasEnoughBalance, isDeployed, t]);

  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!walletConnection?.account?.address)
        throw new Error("No wallet connected");
      return getClaim(walletConnection.account.address);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strkBalance"] });
      setStepErrors({});
      setHasClaimed(true);
      setWaitingForTokens(true);
      setStatus(t("walletDeploy.strkTokensClaimed"));
    },
    onError: (error: Error) => {
      const errorMessage = error.message.includes("401")
        ? t("walletDeploy.alreadyClaimed")
        : error.message;
      setStepErrors({ 1: errorMessage });
      if (error.message.includes("401")) {
        setHasClaimed(true);
        setWaitingForTokens(true);
      }
    },
  });

  const verifyWalletDeployment = useCallback(async () => {
    if (!walletConnection?.account?.address || !isDeployed) return false;

    setIsVerifyingDeployment(true);
    setStatus(t("walletDeploy.verifyingDeployment"));

    const verifyPropagation = async () => {
      try {
        await walletConnection.provider.getNonceForAddress(
          walletConnection.account.address,
        );
        return true;
      } catch (error) {
        console.error("Propagation verification failed:", error);
        return false;
      }
    };

    const checkDeploymentStatus = async () => {
      try {
        if (walletConnection.provider) {
          try {
            const classHashResponse =
              await walletConnection.provider.getClassHashAt(
                walletConnection.account.address,
              );
            if (classHashResponse && classHashResponse !== "0x0") return true;
          } catch (error) {
            if (String(error).includes("Contract not found")) return false;
          }
        }
        return false;
      } catch (error) {
        console.error("Error in deployment verification:", error);
        return false;
      }
    };

    let attempts = 0;
    let verified = false;
    while (attempts < MAX_VERIFICATION_ATTEMPTS && !verified) {
      verified = await checkDeploymentStatus();
      if (verified) {
        setStatus(t("walletDeploy.deploymentVerified"));
        setDeploymentVerified(true);
        break;
      }
      setStatus(
        t("walletDeploy.verifyingAttempts", {
          attempts: MAX_VERIFICATION_ATTEMPTS - attempts,
        }),
      );
      await new Promise((r) => setTimeout(r, VERIFICATION_INTERVAL_MS));
      attempts++;
    }

    if (!verified) {
      setStatus(t("walletDeploy.couldNotVerify"));
      setIsVerifyingDeployment(false);
      return false;
    }

    setStatus(t("walletDeploy.checkingPropagation"));
    attempts = 0;
    verified = false;
    while (attempts < MAX_VERIFICATION_ATTEMPTS && !verified) {
      verified = await verifyPropagation();
      if (verified) {
        setStatus(t("walletDeploy.fullyPropagated"));
        setPropagationComplete(true);
        break;
      }
      setStatus(
        t("walletDeploy.waitingPropagationAttempts", {
          attempts: MAX_VERIFICATION_ATTEMPTS - attempts,
        }),
      );
      await new Promise((r) => setTimeout(r, VERIFICATION_INTERVAL_MS));
      attempts++;
    }

    if (!verified) setStatus(t("walletDeploy.walletDeployedNotPropagated"));
    setIsVerifyingDeployment(false);
    return verified;
  }, [walletConnection, isDeployed, t]);

  useEffect(() => {
    if (isDeployed && !deploymentVerified && !isVerifyingDeployment) {
      verifyWalletDeployment();
    }
  }, [
    isDeployed,
    deploymentVerified,
    isVerifyingDeployment,
    verifyWalletDeployment,
  ]);

  useEffect(() => {
    const handleAuthFailure = (event: Event) => {
      const customEvent = event as CustomEvent<{ error: string }>;
      setStepErrors({ 3: customEvent.detail.error });
      setStatus(t("walletDeploy.authFailed"));
      authMutation.reset();
    };
    document.addEventListener("walletAuthenticationFailed", handleAuthFailure);
    return () => {
      document.removeEventListener(
        "walletAuthenticationFailed",
        handleAuthFailure,
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const authMutation = useMutation({
    mutationFn: async () => {
      if (!walletConnection?.account?.address)
        throw new Error("No wallet connected");
      if (!propagationComplete) {
        setStatus(t("walletDeploy.waitingPropagation"));
        await new Promise((r) => setTimeout(r, 5000));
        try {
          await walletConnection.provider.getNonceForAddress(
            walletConnection.account.address,
          );
        } catch {
          throw new Error(t("walletDeploy.walletNotPropagated"));
        }
      }
      setStatus(t("walletDeploy.walletDeployedAuthenticating"));
      return { method, connection: walletConnection };
    },
    onSuccess: (result) => {
      setStepErrors({});
      setStatus(t("walletDeploy.authSuccessful"));
      const authEvent = new CustomEvent("walletAuthenticated", {
        detail: { method: result.method, connection: result.connection },
      });
      document.dispatchEvent(authEvent);
    },
    onError: (error: Error) => {
      setStepErrors({
        3: t("walletDeploy.authFailedError", { error: error.message }),
      });
      setStatus(t("walletDeploy.authFailed"));
    },
  });

  const getCurrentStep = () => {
    if (isDeployed) return 3;
    if (hasEnoughBalance && !isDeployed) return 2;
    if (walletConnection?.account?.address) return 1;
    return 0;
  };
  const currentStep = getCurrentStep();

  const claimButtonState = (() => {
    if (hasEnoughBalance)
      return { disabled: true, text: t("walletDeploy.tokensClaimed") };
    if (waitingForTokens)
      return {
        disabled: true,
        text: t("walletDeploy.waitingForTokens"),
        loading: true,
      };
    if (claimMutation.isPending)
      return {
        disabled: true,
        text: t("walletDeploy.claiming"),
        loading: true,
      };
    if (hasClaimed && !waitingForTokens)
      return { disabled: true, text: t("walletDeploy.alreadyClaimed") };
    if (isCheckingBalance && !hasEnoughBalance && !hasClaimed)
      return {
        disabled: true,
        text: t("walletDeploy.checking"),
        loading: true,
      };
    return { disabled: false, text: t("walletDeploy.claimStrk") };
  })();

  const handleDeploy = async () => {
    try {
      setIsDeploying(true);
      setStatus(t("walletDeploy.deploying"));
      setStepErrors({});
      try {
        const resp = await walletConnection!.account.execute({
          contractAddress: STRK_TOKEN_ADDRESS,
          entrypoint: "transfer",
          calldata: [walletConnection!.account.address, "1", "0"],
        });
        if (resp?.transaction_hash) {
          await walletConnection!.provider.waitForTransaction(
            resp.transaction_hash,
          );
        }
        setStatus(t("walletDeploy.deploymentInitiated"));
        queryClient.invalidateQueries({ queryKey: ["walletDeployment"] });
        setPropagationComplete(true);
        setDeploymentVerified(true);
      } catch (error) {
        console.error("Deployment through transfer failed:", error);
        if (String(error).includes("Account is not deployed")) {
          setStepErrors({ 2: t("walletDeploy.accountDeploymentRequired") });
        } else {
          setStepErrors({
            2: t("walletDeploy.deploymentFailed", {
              error: error instanceof Error ? error.message : String(error),
            }),
          });
        }
      }
    } catch (error) {
      console.error("Deployment error:", error);
      setStepErrors({
        2: t("walletDeploy.deploymentFailed", {
          error: error instanceof Error ? error.message : String(error),
        }),
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const stepLabels = [
    t("walletDeploy.connectWallet"),
    t("walletDeploy.getStrkTokens"),
    t("walletDeploy.deployWallet"),
    t("walletDeploy.authenticatePlay"),
  ];

  return (
    <div className="flex w-full flex-col gap-4">
      <StepIndicator steps={stepLabels} current={currentStep} />
      <Card className="flex flex-col gap-3 p-4">
        {currentStep === 0 && (
          <StepContent
            title={t("walletDeploy.connectWallet")}
            description={
              isConnecting
                ? t("walletDeploy.connecting")
                : walletConnection?.account?.address
                  ? `${t("walletDeploy.connected")}: ${truncateAddress(walletConnection.account.address)}`
                  : t("walletDeploy.pleaseConnect")
            }
            error={stepErrors[0]}
          />
        )}

        {currentStep === 1 && (
          <StepContent
            title={t("walletDeploy.getStrkTokens")}
            description={
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {t("walletDeploy.balance")}:
                </span>
                <span className="font-mono">
                  {Number(strkBalance).toFixed(4)} STRK
                </span>
                {hasEnoughBalance ? (
                  <Check className="size-4 text-primary" />
                ) : (
                  <AlertCircle className="size-4 text-[rgb(230,48,48)]" />
                )}
              </span>
            }
            error={stepErrors[1]}
          >
            <Button
              size="sm"
              variant="outline"
              onClick={() => claimMutation.mutate()}
              disabled={claimButtonState.disabled || isConnecting}
            >
              {claimButtonState.loading && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {claimButtonState.text}
            </Button>
          </StepContent>
        )}

        {currentStep === 2 && (
          <StepContent
            title={t("walletDeploy.deployWallet")}
            description={status || t("walletDeploy.clickToDeployAbove")}
            error={stepErrors[2]}
          >
            <Button
              size="sm"
              variant="outline"
              onClick={handleDeploy}
              disabled={
                !walletConnection ||
                isDeploying ||
                isVerifyingDeployment ||
                propagationComplete
              }
            >
              {(isDeploying || isVerifyingDeployment) && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {isDeploying || isVerifyingDeployment
                ? t("walletDeploy.deploying")
                : t("walletDeploy.deployWallet")}
            </Button>
          </StepContent>
        )}

        {currentStep === 3 && (
          <StepContent
            title={t("walletDeploy.authenticatePlay")}
            description={
              <span className="flex flex-col gap-1">
                <span>{t("walletDeploy.readyToPlay")}</span>
                <span className="text-xs italic text-muted-foreground">
                  {t("walletDeploy.authNote")}
                </span>
              </span>
            }
            error={stepErrors[3]}
          >
            <Button
              size="sm"
              onClick={() => authMutation.mutate()}
              disabled={
                !isDeployed ||
                authMutation.isPending ||
                isVerifyingDeployment ||
                (!propagationComplete && isDeployed)
              }
            >
              {(authMutation.isPending ||
                isVerifyingDeployment ||
                (isDeployed && !propagationComplete)) && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {authMutation.isPending
                ? t("walletDeploy.authenticating")
                : isVerifyingDeployment
                  ? t("walletDeploy.verifying")
                  : isDeployed && !propagationComplete
                    ? t("walletDeploy.waitingPropagation")
                    : t("walletDeploy.authenticatePlay")}
            </Button>
          </StepContent>
        )}
      </Card>
    </div>
  );
};

function StepContent({
  title,
  description,
  error,
  children,
}: {
  title: string;
  description: React.ReactNode;
  error?: string;
  children?: React.ReactNode;
}) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-semibold">{title}</h4>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      {children && <div className="flex">{children}</div>}
      {error && (
        <div className="flex items-start gap-2 text-xs text-[rgb(230,48,48)]">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </>
  );
}

function StepIndicator({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <ol className="flex w-full items-center gap-2">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                done && "border-primary bg-primary text-black",
                active && "border-primary text-primary ring-2 ring-primary/40",
                !done && !active && "border-border text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </div>
            <span
              className={cn(
                "hidden truncate text-xs sm:inline",
                active
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1 transition-colors",
                  done ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export const WalletDeploy = () => <DeployWalletComponent />;
