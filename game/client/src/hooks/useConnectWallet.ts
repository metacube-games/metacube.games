import { useCallback } from "react";
import {
  type Connector,
  useAccount,
  useConnect,
  useDisconnect,
  useProvider,
} from "@starknet-react/core";
import { useStarknetkitConnectModal } from "starknetkit";
import { getNonce, postConnect } from "../API/backendAPI";
import { signMessage } from "../API/starknet";

/** Two-stage so callers can render a "waiting for signature" state between picker and sign. */
export function useConnectWallet() {
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { isConnected } = useAccount();
  const { provider } = useProvider();
  const { starknetkitConnectModal } = useStarknetkitConnectModal({
    connectors: connectors as never,
    modalTheme: "dark",
    dappName: "Metacube Games",
  });

  const openPicker = useCallback(async (): Promise<Connector | null> => {
    // starknetkit + @starknet-react each persist last-used wallet — wipe both to force the grid.
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("starknetLastConnectedWallet");
        window.localStorage.removeItem("lastUsedConnector");
      } catch {
        // localStorage unavailable — ignore.
      }
    }
    if (isConnected) {
      try {
        await disconnectAsync();
      } catch {
        // Best-effort cleanup.
      }
    }
    try {
      const { connector } = await starknetkitConnectModal();
      return (connector as unknown as Connector) ?? null;
    } catch {
      return null;
    }
  }, [starknetkitConnectModal, disconnectAsync, isConnected]);

  const finalizeAuth = useCallback(
    async (connector: Connector) => {
      await connectAsync({ connector });
      const account = await connector.account(provider);
      if (!account?.address) return null;

      let walletAddress = account.address.startsWith("0x")
        ? account.address.substring(2)
        : account.address;
      while (walletAddress.length < 64) {
        walletAddress = "0" + walletAddress;
      }

      const nonceData = await getNonce(walletAddress);
      const signature = await signMessage(account, nonceData.nonce);
      return await postConnect(walletAddress, signature);
    },
    [connectAsync, provider],
  );

  return { openPicker, finalizeAuth };
}
