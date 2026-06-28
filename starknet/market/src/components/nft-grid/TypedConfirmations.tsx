"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { NFTData } from "@/interface";
import {
  ActionButton,
  NFTDetails,
} from "./confirmationPopover/ConfirmationComponents";
import { useAccount, useContract, useReadContract } from "@starknet-react/core";
import { NFT_ABI, ERC20_ABI, MARKETPLACE_ABI } from "@/abis/ABI";
import { Button } from "@/components/ui/button";
import { useConnectWallet } from "@/hooks/useConnectWallet";
import { CONTRACT_ADDRESSES, ROYALTY_PERCENTAGE } from "@/data/contracts";
import {
  useApproveAndBuy,
  useListNFT,
  useDelistNFT,
  useNFTListingStatus,
} from "./confirmationPopover/ContractInteractions";
import { uint256, type Uint256 } from "starknet";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, RefreshCw, Tag, Wallet, X } from "lucide-react";
import {
  formatStrkAmount,
  priceToWei,
  weiToPrice,
  WEI_PER_STRK,
} from "@/utils/blockchain";
import { StrkIcon } from "@/components/StrkIcon";
import { ErrorMessage } from "@/components/library/error-message";
const MARKETPLACE_FEE_RECIPIENT = CONTRACT_ADDRESSES.FEE_DISTRIBUTOR || "0x0";
interface TypedConfirmationProps {
  nftAddress?: string;
  nftData: NFTData;
  mode?: "Details" | "DetailsSell";
  onSuccess?: () => void;
}
const PASSCARD_ADDRESS = CONTRACT_ADDRESSES.PASSCARD;
const GENESIS_ADDRESS = CONTRACT_ADDRESSES.GENESIS;
const PassMapping = {
  Genesis: GENESIS_ADDRESS,
  Passcard: PASSCARD_ADDRESS,
};
const MARKETPLACE_ADDRESS = CONTRACT_ADDRESSES.MARKETPLACE || "0x0";
export function ClaimConfirmation({
  nftAddress,
  nftData,
  onSuccess,
}: TypedConfirmationProps) {
  const t = useTranslations("nftGrid");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [nftOwned, setNftOwned] = useState<number>(0);
  const [claimableNftsState, setClaimableNftsState] = useState<number[]>([]);
  const { address, status, account } = useAccount();
  const connectWallet = useConnectWallet();
  const isConnected = status === "connected";
  const { contract: nftContract } = useContract({
    abi: NFT_ABI,
    address: nftAddress as `0x${string}`,
  });
  const ownershipContractAddress =
    PassMapping[nftData.type as keyof typeof PassMapping] ??
    nftData.contractAddress;
  const checkClaimable = useCallback(
    async (ids: number[]): Promise<number[]> => {
      if (!nftContract || !nftAddress) return [];
      const tokenIds = ids.map((id) => uint256.bnToUint256(id));
      try {
        const claimStatus = await nftContract.call("get_claimed", [tokenIds]);
        return ids?.filter((_id, index) => !claimStatus[index]);
      } catch (callError) {
        const errorStr = String(callError);
        if (errorStr.includes("ERC721: invalid token ID")) {
          setError(t("claim.invalidTokenId", { ids: ids.join(", ") }));
          return [];
        }
        throw callError;
      }
    },
    [nftContract, nftAddress],
  );
  const getOwnedNftIds = useCallback(async () => {
    if (!address || !ownershipContractAddress) return;
    setIsLoading(true);
    setError(null);
    try {
      const indexerUrl = `https://indexer.felts.xyz/owned/${ownershipContractAddress}/${address}`;
      const response = await fetch(indexerUrl);
      if (!response.ok) {
        throw new Error(`Indexer API error: ${response.status}`);
      }
      const data = (await response.json()) as number[];
      const ownedIds = data;
      setNftOwned(ownedIds?.length ?? 0);
      const claimableNfts = await checkClaimable(ownedIds);
      setClaimableNftsState(claimableNfts);
    } catch {
      setError(t("claim.fetchOwnedNftsError", { type: nftData.type }));
    } finally {
      setIsLoading(false);
    }
  }, [address, ownershipContractAddress, checkClaimable, nftData.type, t]);
  useEffect(() => {
    if (isConnected) getOwnedNftIds();
  }, [isConnected, getOwnedNftIds]);
  const handleClick = useCallback(async () => {
    if (!isConnected) {
      connectWallet();
      return;
    }
    if (!account) return;
    setIsLoading(true);
    setError(null);
    const calls = claimableNftsState.map((id) => {
      return {
        contractAddress: nftAddress as string,
        entrypoint: "claim",
        calldata: [id.toString(), "0"],
      };
    });
    try {
      await account.execute(calls);
      getOwnedNftIds();
      onSuccess?.();
    } catch {
      setError(t("claim.transactionFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [
    account,
    connectWallet,
    claimableNftsState,
    nftAddress,
    isConnected,
    getOwnedNftIds,
    t,
    onSuccess,
  ]);
  useEffect(() => {
    if (nftContract && account) nftContract.providerOrAccount = account;
  }, [nftContract, account]);
  const noClaimableNftsFound = !isLoading && !(claimableNftsState?.length > 0);
  const hasClaimed =
    !isLoading && nftOwned && nftOwned > claimableNftsState?.length;
  const isError = !!error;
  const claimingNotAvailable = isConnected && (noClaimableNftsFound || isError);
  const hasNftOwned = nftOwned > 0;
  return (
    <>
      <NFTDetails
        nftData={nftData}
        mode={"Claim"}
        conditionValid={hasNftOwned}
      />
      {claimingNotAvailable || !hasNftOwned || hasClaimed || isError ? (
        <div className="p-4 bg-background border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => connectWallet()}
            disabled={isConnected}
          >
            {!isConnected && <Wallet />}
            {!isConnected
              ? t("common.connectWallet")
              : isError
                ? t("claim.transactionFailed")
                : hasClaimed
                  ? t("claim.claimed")
                  : t("claim.nothingToClaim")}
          </Button>
        </div>
      ) : (
        <ActionButton
          mode="Claim"
          additionalText={
            isLoading
              ? undefined
              : t("claim.nftsToClaimCount", {
                  count: claimableNftsState.length,
                })
          }
          isLoading={isLoading}
          handleClick={handleClick}
          loadingElement={
            <>
              <Loader2 className="animate-spin" />
              <span>{t("common.processing")}</span>
            </>
          }
        />
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </>
  );
}
export function BuyConfirmation({
  nftAddress,
  nftData,
  onSuccess,
}: TypedConfirmationProps) {
  const t = useTranslations("nftGrid");
  const { status } = useAccount();
  const isConnected = status === "connected";
  const connectWallet = useConnectWallet();
  const [balanceNormalized, setBalanceNormalized] = useState<string>("0");
  const {
    isProcessing,
    needsApproval,
    approveAndBuy,
    error: buyError,
    isSoldOut,
  } = useApproveAndBuy({
    nftAddress: nftAddress || "",
    nftData,
  });
  const { address: userAddress } = useAccount();
  const [balanceEnough, setBalanceEnough] = useState<boolean>(false);
  const [balanceChecked, setBalanceChecked] = useState<boolean>(false);
  const { data: balanceData, isLoading: isBalanceLoading } = useReadContract({
    functionName: "balance_of",
    args: userAddress ? [userAddress] : undefined,
    abi: ERC20_ABI,
    address: CONTRACT_ADDRESSES.STRK_TOKEN as `0x${string}`,
    watch: true,
    enabled: !!userAddress,
  });
  useEffect(() => {
    if (!userAddress) {
      setBalanceEnough(false);
      setBalanceChecked(false);
      return;
    }
    if (isBalanceLoading) {
      setBalanceChecked(false);
      return;
    }
    if (balanceData !== undefined) {
      try {
        const formattedBalance = uint256
          .uint256ToBN(balanceData as Uint256)
          .toString();
        const strkBalance = Number(formattedBalance) / WEI_PER_STRK;
        setBalanceNormalized(strkBalance.toFixed(4));
        const price = nftData?.price ?? 0;
        if (strkBalance >= price) {
          setBalanceEnough(true);
        } else {
          setBalanceEnough(false);
        }
        setBalanceChecked(true);
      } catch {
        setBalanceEnough(false);
        setBalanceChecked(true);
      }
    } else {
      setBalanceEnough(false);
      setBalanceChecked(false);
    }
  }, [balanceData, nftData, userAddress, isBalanceLoading]);
  const [error, setError] = useState<string | null>(null);
  const handleClick = useCallback(async () => {
    if (status !== "connected") {
      connectWallet();
      return;
    }
    if (isProcessing) return;
    setError(null);
    try {
      const result = await approveAndBuy();
      if (result.success) {
        onSuccess?.();
      } else {
        setError(buyError || t("buy.transactionFailed"));
      }
    } catch {
      setError(buyError || t("buy.transactionFailed"));
    }
  }, [
    status,
    connectWallet,
    isProcessing,
    approveAndBuy,
    buyError,
    t,
    onSuccess,
  ]);
  const balanceColorClass =
    balanceChecked && balanceEnough ? "text-primary" : "";
  return (
    <>
      {isSoldOut && (
        <div className="absolute inset-0 z-50 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-24 bg-destructive/90 flex items-center justify-center rotate-[-25deg] shadow-lg">
            <span className="text-destructive-foreground font-semibold text-4xl tracking-widest">
              {t("buy.soldOut")}
            </span>
          </div>
        </div>
      )}
      <NFTDetails nftData={nftData} mode={"Buy"} />
      <div className="p-4 lg:p-6 border-t space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("buy.yourBalance")}</span>
          <span
            className={`flex items-center gap-1 font-semibold ${balanceColorClass}`}
          >
            {formatStrkAmount(balanceNormalized)}
            <StrkIcon width={14} height={14} />
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("buy.listedPrice")}</span>
          <span
            className={`flex items-center gap-1 font-semibold ${balanceColorClass}`}
          >
            {formatStrkAmount(nftData.price?.toString() ?? "0")}
            <StrkIcon width={14} height={14} />
          </span>
        </div>
      </div>
      {isConnected && !balanceChecked && (
        <div className="p-4 text-center bg-background border-t animate-fadeIn flex items-center justify-center">
          <span className="text-muted-foreground text-sm">
            {t("buy.checkingBalance")}
          </span>
        </div>
      )}
      {!isConnected ? (
        <div className="p-4 bg-background border-t">
          <Button variant="outline" className="w-full" onClick={() => connectWallet()}>
            <Wallet />
            {t("common.connectWallet")}
          </Button>
        </div>
      ) : (
        <ActionButton
          mode={"buy"}
          isLoading={isProcessing}
          isApproving={needsApproval && isProcessing}
          handleClick={handleClick}
          disabled={isSoldOut || !balanceEnough || !balanceChecked}
        />
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </>
  );
}
export function MarketplaceBuyConfirmation({
  nftData,
  onSuccess,
}: TypedConfirmationProps) {
  const t = useTranslations("nftGrid");
  const connectWallet = useConnectWallet();
  const { account, status, address } = useAccount();
  const isConnected = status === "connected";
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [balanceNormalized, setBalanceNormalized] = useState<string>("0");
  const [balanceEnough, setBalanceEnough] = useState<boolean>(false);
  const [balanceChecked, setBalanceChecked] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isOwner = useMemo(() => {
    if (!address || !nftData.owner) return false;
    const testAddress1 = address.toLowerCase();
    const testAddress2 = `0x${testAddress1.slice(3)}`;
    return (
      nftData.owner.toLowerCase() === testAddress2.toLowerCase() ||
      nftData.owner.toLowerCase() === testAddress1.toLowerCase()
    );
  }, [address, nftData.owner]);
  const { contract: marketplaceContract } = useContract({
    abi: MARKETPLACE_ABI,
    address: MARKETPLACE_ADDRESS as `0x${string}`,
  });
  const { contract: strkContract } = useContract({
    abi: ERC20_ABI,
    address: CONTRACT_ADDRESSES.STRK_TOKEN as `0x${string}`,
  });
  useEffect(() => {
    if (account) {
      if (marketplaceContract) marketplaceContract.providerOrAccount = account;
      if (strkContract) strkContract.providerOrAccount = account;
    }
  }, [account, marketplaceContract, strkContract]);
  const basePrice = nftData.listingPrice
    ? Number(nftData.listingPrice) / WEI_PER_STRK
    : (nftData.price ?? 0);
  const royaltyAmount = basePrice * (ROYALTY_PERCENTAGE / 100);
  const totalPrice = basePrice + royaltyAmount;
  const basePriceBigInt = nftData.listingPrice
    ? BigInt(nftData.listingPrice)
    : BigInt(priceToWei(nftData.price?.toString() ?? "0"));
  const royaltyAmountBigInt =
    (basePriceBigInt * BigInt(ROYALTY_PERCENTAGE)) / BigInt(100);
  const totalPriceBigInt = basePriceBigInt + royaltyAmountBigInt;
  const { address: userAddress } = useAccount();
  const { data: balanceData, isLoading: isBalanceLoading } = useReadContract({
    functionName: "balance_of",
    args: userAddress ? [userAddress] : undefined,
    abi: ERC20_ABI,
    address: CONTRACT_ADDRESSES.STRK_TOKEN as `0x${string}`,
    watch: true,
    enabled: !!userAddress,
  });
  useEffect(() => {
    if (!userAddress) {
      setBalanceEnough(false);
      setBalanceChecked(false);
      return;
    }
    if (isBalanceLoading) {
      setBalanceChecked(false);
      return;
    }
    if (balanceData !== undefined) {
      try {
        const formattedBalance = uint256
          .uint256ToBN(balanceData as Uint256)
          .toString();
        const strkBalance = Number(formattedBalance) / WEI_PER_STRK;
        setBalanceNormalized(strkBalance.toFixed(4));
        const strkBalanceBigInt = Number(priceToWei(strkBalance.toString()));
        if (strkBalanceBigInt >= totalPriceBigInt) {
          setBalanceEnough(true);
        } else {
          setBalanceEnough(false);
        }
        setBalanceChecked(true);
      } catch {
        setBalanceEnough(false);
        setBalanceChecked(true);
      }
    } else {
      setBalanceEnough(false);
      setBalanceChecked(false);
    }
  }, [
    balanceData,
    totalPrice,
    userAddress,
    isBalanceLoading,
    totalPriceBigInt,
  ]);
  const handleBuyNFT = async () => {
    if (!isConnected) {
      connectWallet();
      return;
    }
    if (!account || !nftData.contractAddress || nftData.tokenId === undefined) {
      setError(t("marketplace.missingNftDetails"));
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const tokenIdU256 = uint256.bnToUint256(nftData.tokenId);
      const basePrice =
        nftData.listingPrice ||
        (nftData.price ? priceToWei(nftData.price.toString()) : "0");
      const calls = [
        {
          contractAddress: CONTRACT_ADDRESSES.STRK_TOKEN,
          entrypoint: "approve",
          calldata: [MARKETPLACE_ADDRESS, basePrice, "0"],
        },
        {
          contractAddress: MARKETPLACE_ADDRESS,
          entrypoint: "buy",
          calldata: [
            nftData.contractAddress,
            tokenIdU256.low,
            tokenIdU256.high,
          ],
        },
        {
          contractAddress: CONTRACT_ADDRESSES.STRK_TOKEN,
          entrypoint: "transfer",
          calldata: [
            MARKETPLACE_FEE_RECIPIENT,
            royaltyAmountBigInt.toString(),
            "0",
          ],
        },
      ];
      await account.execute(calls);
      onSuccess?.();
      return true;
    } catch {
      setError(t("buy.transactionFailed"));
      return false;
    } finally {
      setIsProcessing(false);
    }
  };
  const handleCancelListing = async () => {
    if (
      !isConnected ||
      !account ||
      !nftData.contractAddress ||
      nftData.tokenId === undefined ||
      !marketplaceContract
    ) {
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      await marketplaceContract.invoke("delist_order", [
        nftData.contractAddress,
        nftData.tokenId,
      ]);
      return true;
    } catch {
      setError(t("details.removeFailed"));
      return false;
    } finally {
      setIsProcessing(false);
    }
  };
  const balanceColorClass =
    balanceChecked && balanceEnough ? "text-primary" : "";
  return (
    <>
      <NFTDetails nftData={nftData} mode={"Buy"} />
      <div className="p-4 lg:p-6 border-t space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("buy.yourBalance")}</span>
          <span
            className={`flex items-center gap-1 font-semibold ${balanceColorClass}`}
          >
            {formatStrkAmount(balanceNormalized)}
            <StrkIcon width={14} height={14} />
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("buy.listedPrice")}</span>
          <span
            className={`flex items-center gap-1 font-semibold ${
              isOwner ? "" : balanceColorClass
            }`}
          >
            {formatStrkAmount(basePrice)}
            <StrkIcon width={14} height={14} />
          </span>
        </div>
        {!isOwner && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {t("marketplace.marketplaceFee", {
                  percentage: ROYALTY_PERCENTAGE,
                })}
              </span>
              <span className="flex items-center gap-1 font-semibold">
                {formatStrkAmount(royaltyAmount)}
                <StrkIcon width={14} height={14} />
              </span>
            </div>
            <div
              className={`flex items-center justify-between border-t pt-2 font-semibold ${balanceColorClass}`}
            >
              <span>{t("marketplace.total")}</span>
              <span className="flex items-center gap-1">
                {formatStrkAmount(totalPrice)}
                <StrkIcon width={14} height={14} />
              </span>
            </div>
          </>
        )}
        {nftData.owner && (
          <div className="flex items-center justify-between gap-2 text-muted-foreground">
            <span className="shrink-0">{t("marketplace.owner")}</span>
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate font-mono">{nftData.owner}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => {
                  if (nftData.owner) {
                    navigator.clipboard.writeText(nftData.owner);
                  }
                }}
              >
                <Copy />
              </Button>
            </span>
          </div>
        )}
      </div>
      {isOwner ? (
        <div className="p-4 lg:p-6 border-t space-y-4">
          {!isConnected ? (
            <Button variant="outline" className="w-full" onClick={() => connectWallet()}>
              <Wallet />
              {t("common.connectWallet")}
            </Button>
          ) : (
            <Button
              className="w-full"
              variant="destructive"
              onClick={handleCancelListing}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" />
                  <span>{t("common.processing")}</span>
                </>
              ) : (
                <>
                  <X />
                  {t("marketplace.cancelListing")}
                </>
              )}
            </Button>
          )}
        </div>
      ) : (
        <>
          {isConnected && !balanceChecked && (
            <div className="p-4 text-center bg-background border-t animate-fadeIn flex items-center justify-center">
              <span className="text-muted-foreground text-sm">
                {t("buy.checkingBalance")}
              </span>
            </div>
          )}
          {!isConnected ? (
            <div className="p-4 bg-background border-t">
              <Button variant="outline" className="w-full" onClick={() => connectWallet()}>
                <Wallet />
                {t("common.connectWallet")}
              </Button>
            </div>
          ) : (
            <ActionButton
              mode="Buy"
              isLoading={isProcessing}
              handleClick={handleBuyNFT}
              disabled={isProcessing || !balanceEnough || !balanceChecked}
              needPadding={true}
            />
          )}
        </>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </>
  );
}
export function SellConfirmation({ nftData }: TypedConfirmationProps) {
  const t = useTranslations("nftGrid");
  const { status } = useAccount();
  const isConnected = status === "connected";
  const connectWallet = useConnectWallet();
  return (
    <>
      <NFTDetails nftData={nftData} mode={"Sell"} />
      <div className="p-4 lg:p-6 border-t">
        {!isConnected ? (
          <Button variant="outline" className="w-full" onClick={() => connectWallet()}>
            <Wallet />
            {t("common.connectWallet")}
          </Button>
        ) : (
          <ActionButton
            mode="Sell"
            isLoading={false}
            handleClick={() => {}}
            needPadding={false}
          />
        )}
      </div>
    </>
  );
}
export function DetailsConfirmation({
  nftData,
  nftAddress = "",
  mode = "Details",
}: TypedConfirmationProps) {
  const t = useTranslations("nftGrid");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { status } = useAccount();
  const isConnected = status === "connected";
  const connectWallet = useConnectWallet();
  const stringTokenId = nftData?.tokenId;
  const showSellSection = mode === "DetailsSell";
  const {
    isListing,
    listNFT,
  } = useListNFT({
    marketplaceAddress: MARKETPLACE_ADDRESS,
    collectionAddress: nftData.contractAddress || nftAddress,
    tokenId: stringTokenId,
  });
  const {
    isDelisting,
    delistNFT,
  } = useDelistNFT({
    marketplaceAddress: MARKETPLACE_ADDRESS,
    collectionAddress: nftData.contractAddress || nftAddress,
    tokenId: stringTokenId,
  });
  const {
    listing,
    checkListingStatus,
    setListing,
  } = useNFTListingStatus({
    marketplaceAddress: MARKETPLACE_ADDRESS,
    collectionAddress: nftData.contractAddress || nftAddress,
    tokenId: stringTokenId,
  });
  const isPriceValid = Number(price) > 0;
  const handleListNFT = async () => {
    if (!isConnected) {
      connectWallet();
      return;
    }
    if (!isPriceValid) {
      return;
    }
    setError(null);
    const priceInWei = priceToWei(price);
    try {
      const success = await listNFT(priceInWei, CONTRACT_ADDRESSES.STRK_TOKEN);
      if (success) {
        setListing({
          isListed: true,
          price: priceInWei,
          paymentTokenAddress: CONTRACT_ADDRESSES.STRK_TOKEN,
          expirationTimestamp: "0xffffffffffffffff",
        });
      } else {
        setError(t("details.listingFailed"));
      }
    } catch {
      setError(t("details.listingFailed"));
    }
  };
  const handleDelistNFT = async () => {
    if (!isConnected) {
      connectWallet();
      return;
    }
    setError(null);
    try {
      const success = await delistNFT();
      if (success) {
        setListing(null);
      } else {
        setError(t("details.removeFailed"));
      }
    } catch {
      setError(t("details.removeFailed"));
    }
  };
  useEffect(() => {
    if (showSellSection) {
      checkListingStatus();
    }
  }, [checkListingStatus, showSellSection]);
  return (
    <>
      <NFTDetails nftData={nftData} mode={"Details"} />
      {showSellSection && (
        <div className="p-4 lg:p-6 border-t space-y-4">
          {!isConnected ? (
            <Button variant="outline" className="w-full" onClick={() => connectWallet()}>
              <Wallet />
              {t("common.connectWallet")}
            </Button>
          ) : listing && listing.isListed ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">{t("details.listedAt")}</span>
                <span className="flex items-center gap-1 text-sm font-semibold">
                  {formatStrkAmount(weiToPrice(listing.price))}
                  <StrkIcon width={14} height={14} />
                </span>
              </div>
              <div className="relative">
                <Input
                  id="newPrice"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={t("details.enterNewPrice")}
                  type="number"
                  min="0"
                  step="0.01"
                  className="pr-10"
                />
                <StrkIcon
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  width={16}
                  height={16}
                />
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  if (!isPriceValid) return;
                  setError(null);
                  const priceInWei = priceToWei(price);
                  try {
                    const listSuccess = await listNFT(
                      priceInWei,
                      CONTRACT_ADDRESSES.STRK_TOKEN,
                    );
                    if (listSuccess) {
                      setListing({
                        isListed: true,
                        price: priceInWei,
                        paymentTokenAddress: CONTRACT_ADDRESSES.STRK_TOKEN,
                        expirationTimestamp: "0xffffffffffffffff",
                      });
                    } else {
                      setError(t("details.relistFailed"));
                      checkListingStatus();
                    }
                  } catch {
                    setError(t("details.relistFailed"));
                    checkListingStatus();
                  }
                }}
                className="w-full"
                disabled={!isPriceValid || isListing || isDelisting}
              >
                {isListing || isDelisting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    {t("common.processing")}
                  </>
                ) : (
                  <>
                    <RefreshCw />
                    {t("details.updatePriceButton")}
                  </>
                )}
              </Button>
              <Button
                onClick={handleDelistNFT}
                className="w-full"
                variant="destructive"
                disabled={isDelisting}
              >
                {isDelisting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    {t("common.processing")}
                  </>
                ) : (
                  <>
                    <X />
                    {t("marketplace.cancelListing")}
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Input
                  id="price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={t("details.enterPrice")}
                  type="number"
                  min="0"
                  step="0.01"
                  className="pr-10"
                />
                <StrkIcon
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  width={16}
                  height={16}
                />
              </div>
              <Button
                variant="outline"
                onClick={handleListNFT}
                className="w-full"
                disabled={!isPriceValid || isListing}
              >
                {isListing ? (
                  <>
                    <Loader2 className="animate-spin" />
                    {t("common.processing")}
                  </>
                ) : (
                  <>
                    <Tag />
                    {t("details.listForSale")}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
      {showSellSection && error && <ErrorMessage>{error}</ErrorMessage>}
    </>
  );
}
