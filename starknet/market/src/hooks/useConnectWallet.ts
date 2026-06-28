"use client";

import { useCallback } from "react";
import { useConnect } from "@starknet-react/core";
import { useStarknetkitConnectModal } from "starknetkit";
import { reportError } from "@/lib/reportError";

/** Opens the wallet picker and persists the chosen connector. */
export function useConnectWallet() {
  const { connect, connectors } = useConnect();
  const { starknetkitConnectModal } = useStarknetkitConnectModal({
    connectors: connectors as never,
    modalTheme: "dark",
    // Pin dappName so wallet signing prompts don't show the page title.
    dappName: "Metacube Games",
  });

  return useCallback(async () => {
    try {
      const { connector } = await starknetkitConnectModal();
      if (!connector) return;
      await connect({ connector });
    } catch (err) {
      reportError("useConnectWallet", err);
    }
  }, [starknetkitConnectModal, connect]);
}
