"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useContract, useReadContract, useAccount } from "@starknet-react/core";
import { NFT_ABI, ERC20_ABI, MARKETPLACE_ABI } from "@/abis/ABI";
import { uint256 } from "starknet";
import { CONTRACT_ADDRESSES } from "@/data/contracts";
import type { NFTData } from "@/interface";
import { priceToWei } from "@/utils/blockchain";

const STRK_TOKEN_ADDRESS = CONTRACT_ADDRESSES.STRK_TOKEN;

interface ApproveAndBuyProps {
  nftAddress: string;
  nftData: NFTData;
}

interface ApproveAndBuyResult {
  isProcessing: boolean;
  needsApproval: boolean;
  error: string | null;
  approveAndBuy: () => Promise<{ success: boolean; txHash?: string }>;
  isSoldOut: boolean;
  saleInfo: { soldCount: number; saleLimit: number } | null;
}

export function useApproveAndBuy({
  nftAddress,
  nftData,
}: ApproveAndBuyProps): ApproveAndBuyResult {
  const t = useTranslations("nftGrid.contract");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSoldOut, setIsSoldOut] = useState<boolean>(false);
  const [saleInfo, setSaleInfo] = useState<{
    soldCount: number;
    saleLimit: number;
  } | null>(null);
  const { address, account, status } = useAccount();
  const isConnected = status === "connected";

  const { contract: nftContract } = useContract({
    abi: NFT_ABI,
    address: nftAddress as `0x${string}`,
  });

  useEffect(() => {
    const checkSaleStatus = async () => {
      if (nftContract) {
        try {
          const soldCount = await nftContract.call("get_sold_count", []);
          const saleLimit = await nftContract.call("get_sale_limit", []);

          const soldCountNum =
            typeof soldCount === "bigint" ? Number(soldCount) : 0;
          const saleLimitNum =
            typeof saleLimit === "bigint" ? Number(saleLimit) : 0;

          setSaleInfo({
            soldCount: soldCountNum,
            saleLimit: saleLimitNum,
          });

          if (saleLimitNum > 0 && soldCountNum >= saleLimitNum) {
            setIsSoldOut(true);
          } else {
            setIsSoldOut(false);
          }
        } catch {
          // Sale-status read failed; leave isSoldOut at current value.
        }
      }
    };

    if (nftContract) checkSaleStatus();
  }, [nftContract]);

  const { data: allowance } = useReadContract({
    abi: ERC20_ABI,
    address: STRK_TOKEN_ADDRESS as `0x${string}`,
    functionName: "allowance",
    args: [address || "", nftAddress],
  });

  const needsApproval =
    !allowance || (typeof allowance === "bigint" && allowance <= BigInt(0));

  const approveAndBuy = async (): Promise<{
    success: boolean;
    txHash?: string;
  }> => {
    if (status !== "connected") {
      setError(t("accountNotConnected"));
      return { success: false };
    }

    if (!account || !isConnected || !nftAddress) {
      setError(t("accountNotConnected"));
      return { success: false };
    }

    if (isSoldOut) {
      setError(t("nftSoldOut"));
      return { success: false };
    }

    setIsProcessing(true);
    setError(null);
    try {
      const calls = [];

      if (needsApproval) {
        const priceInWei = priceToWei(nftData?.price?.toString() ?? "0");
        const approvalAmount = uint256.bnToUint256(priceInWei);
        calls.push({
          contractAddress: STRK_TOKEN_ADDRESS,
          entrypoint: "approve",
          calldata: [nftAddress, approvalAmount.low, approvalAmount.high],
        });
      }

      calls.push({
        contractAddress: nftAddress,
        entrypoint: "buy",
        calldata: [],
      });

      const response = await account.execute(calls);
      const txHash = response.transaction_hash;
      return { success: true, txHash };
    } catch (err) {
      const errorMessage = String(err);
      if (errorMessage.includes("u256_sub Overflow")) {
        setError(t("insufficientBalance"));
      } else if (errorMessage.includes("sold out")) {
        setError(t("nftSoldOut"));
      } else {
        setError(t("transactionFailed", { error: errorMessage }));
      }
      return { success: false };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    needsApproval,
    error,
    approveAndBuy,
    isSoldOut,
    saleInfo,
  };
}

interface MarketplaceHookProps {
  marketplaceAddress: string;
  collectionAddress: string;
  tokenId: number | undefined;
}

interface ListingStatus {
  isListed: boolean;
  price: string;
  paymentTokenAddress: string;
  expirationTimestamp: string;
}

export function useNFTListingStatus({
  marketplaceAddress,
  collectionAddress,
  tokenId,
}: MarketplaceHookProps) {
  const t = useTranslations("nftGrid.contract");
  const [isLoading, setIsLoading] = useState(false);
  const [listing, setListing] = useState<ListingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { contract: marketplaceContract } = useContract({
    abi: MARKETPLACE_ABI,
    address: marketplaceAddress as `0x${string}`,
  });

  const checkListingStatus = useCallback(async () => {
    if (!marketplaceContract || !collectionAddress || tokenId === undefined)
      return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await marketplaceContract.call("get_order_status", [
        collectionAddress,
        tokenId,
      ]);

      if (result && result.order_creator !== undefined) {
        const {
          payment_token_amount,
          payment_token_address,
          expiration_timestamp,
        } = result;

        const isListed = payment_token_amount > 0 && expiration_timestamp > 0;

        setListing({
          isListed,
          price: payment_token_amount.toString(),
          paymentTokenAddress: payment_token_address.toString(),
          expirationTimestamp: expiration_timestamp.toString(),
        });
      } else {
        setListing({
          isListed: false,
          price: "0",
          paymentTokenAddress: STRK_TOKEN_ADDRESS,
          expirationTimestamp: "0",
        });
      }
    } catch {
      setError(t("listingStatusCheckFailed"));
      setListing({
        isListed: false,
        price: "0",
        paymentTokenAddress: STRK_TOKEN_ADDRESS,
        expirationTimestamp: "0",
      });
    } finally {
      setIsLoading(false);
    }
  }, [marketplaceContract, collectionAddress, tokenId, t]);

  useEffect(() => {
    checkListingStatus();
  }, [checkListingStatus]);

  return {
    isLoading,
    listing,
    error,
    checkListingStatus,
    setListing,
  };
}

export function useListNFT({
  marketplaceAddress,
  collectionAddress,
  tokenId,
}: MarketplaceHookProps) {
  const t = useTranslations("nftGrid.contract");
  const [isListing, setIsListing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { account, status } = useAccount();
  const isConnected = status === "connected";

  const { contract: marketplaceContract } = useContract({
    abi: MARKETPLACE_ABI,
    address: marketplaceAddress as `0x${string}`,
  });

  const listNFT = async (
    price: string,
    paymentTokenAddress: string = STRK_TOKEN_ADDRESS,
    expirationTimestamp: string = "0xffffffffffffffff",
  ): Promise<boolean> => {
    if (!marketplaceContract || !isConnected || !account) {
      setError(t("walletContractsNotReady"));
      return false;
    }

    if (!collectionAddress || tokenId === undefined) {
      setError(t("missingNftInfo"));
      return false;
    }

    setIsListing(true);
    setError(null);
    setSuccess(false);

    try {
      const tokenIdU256 = uint256.bnToUint256(tokenId);
      const priceU256 = uint256.bnToUint256(price);

      const calls = [
        {
          contractAddress: collectionAddress,
          entrypoint: "set_approval_for_all",
          calldata: [marketplaceAddress, 1],
        },
        {
          contractAddress: marketplaceAddress,
          entrypoint: "list_order",
          calldata: [
            collectionAddress,
            tokenIdU256.low,
            tokenIdU256.high,
            priceU256.low,
            priceU256.high,
            paymentTokenAddress,
            expirationTimestamp,
          ],
        },
      ];

      await account.execute(calls);

      setSuccess(true);
      return true;
    } catch (err) {
      setError(t("listNftFailed", { error: String(err) }));
      return false;
    } finally {
      setIsListing(false);
    }
  };

  return {
    isListing,
    success,
    error,
    listNFT,
  };
}

export function useDelistNFT({
  marketplaceAddress,
  collectionAddress,
  tokenId,
}: MarketplaceHookProps) {
  const t = useTranslations("nftGrid.contract");
  const [isDelisting, setIsDelisting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { account, status } = useAccount();
  const isConnected = status === "connected";

  const delistNFT = async (): Promise<boolean> => {
    if (!isConnected || !account) {
      setError(t("walletNotConnected"));
      return false;
    }

    if (!collectionAddress || tokenId === undefined) {
      setError(t("missingNftInfo"));
      return false;
    }

    setIsDelisting(true);
    setError(null);
    setSuccess(false);

    try {
      await account.execute([
        {
          contractAddress: marketplaceAddress,
          entrypoint: "delist_order",
          calldata: [collectionAddress, tokenId],
        },
      ]);

      setSuccess(true);
      return true;
    } catch (err) {
      setError(t("delistNftFailed", { error: String(err) }));
      return false;
    } finally {
      setIsDelisting(false);
    }
  };

  return {
    isDelisting,
    success,
    error,
    delistNFT,
  };
}
