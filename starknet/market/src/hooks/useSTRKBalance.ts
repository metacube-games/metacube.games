"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "@starknet-react/core";
import { uint256, type Uint256 } from "starknet";
import { ERC20_ABI } from "@/abis/ABI";
import { CONTRACT_ADDRESSES } from "@/data/contracts";
import { WEI_PER_STRK } from "@/utils/blockchain";

export function useSTRKBalance() {
  const { address } = useAccount();
  const [balanceNormalized, setBalanceNormalized] = useState<string>("0");

  const { data: balanceData, isLoading: isBalanceLoading } = useReadContract({
    functionName: "balance_of",
    args: address ? [address] : undefined,
    abi: ERC20_ABI,
    address: CONTRACT_ADDRESSES.STRK_TOKEN as `0x${string}`,
    watch: true,
    enabled: !!address,
  });

  useEffect(() => {
    if (!address || isBalanceLoading) return;
    if (balanceData) {
      try {
        const formattedBalance = uint256
          .uint256ToBN(balanceData as Uint256)
          .toString();
        const strkBalance = Number(formattedBalance) / WEI_PER_STRK;
        setBalanceNormalized(strkBalance.toFixed(4));
      } catch {
        setBalanceNormalized("0");
      }
    }
  }, [balanceData, address, isBalanceLoading]);

  return { balanceNormalized, isBalanceLoading };
}
