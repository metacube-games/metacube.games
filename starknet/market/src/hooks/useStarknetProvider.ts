import { useMemo } from "react";
import { RpcProvider } from "starknet";

const STARKNET_NODE_URL =
  process.env.NEXT_PUBLIC_STARKNET_NODE_URL ||
  "https://starknet-rpc.publicnode.com";

let globalProvider: RpcProvider | null = null;

export function useStarknetProvider() {
  const provider = useMemo(() => {
    if (typeof window === "undefined") return undefined;

    if (!globalProvider) {
      try {
        globalProvider = new RpcProvider({ nodeUrl: STARKNET_NODE_URL });
      } catch {
        return undefined;
      }
    }

    return globalProvider;
  }, []);

  return { provider };
}
