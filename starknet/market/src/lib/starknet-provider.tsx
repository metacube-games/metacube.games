"use client";
import React, { useState, useEffect, useMemo } from "react";
import { sepolia, mainnet } from "@starknet-react/chains";
import {
  StarknetConfig,
  ready,
  braavos,
  useInjectedConnectors,
  voyager,
  cartridgeProvider,
} from "@starknet-react/core";
import { ControllerConnector } from "@cartridge/connector";
import { constants } from "starknet";
import { reportError } from "@/lib/reportError";

let connector: ControllerConnector;
export const StarknetProvider = React.memo(
  ({ children }: { children: React.ReactNode }) => {
    const { connectors: injectedConnectors } = useInjectedConnectors({
      recommended: [ready(), braavos()],
      includeRecommended: "always",
      order: "alphabetical",
    });

    const [cartridgeConnectorInstance, setCartridgeConnectorInstance] =
      useState<ControllerConnector | null>(connector);

    const chains = useMemo(() => [mainnet, sepolia], []);

    const provider = useMemo(() => cartridgeProvider(), []);

    useEffect(() => {
      if (typeof window === "undefined") return;

      const initializeConnector = async () => {
        try {
          if (connector) return;
          connector = new ControllerConnector({
            chains: [
              {
                rpcUrl: "https://api.cartridge.gg/x/starknet/sepolia",
              },
              {
                rpcUrl: "https://api.cartridge.gg/x/starknet/mainnet",
              },
            ],
            defaultChainId: constants.StarknetChainId.SN_MAIN,

            preset: "metacube",
          });
          setCartridgeConnectorInstance(connector);
        } catch (err) {
          // Cartridge init failed; fall back to Argent / Braavos.
          reportError("StarknetProvider:initCartridgeConnector", err);
        }
      };

      initializeConnector();
    }, []);

    const connectors = useMemo(() => {
      if (cartridgeConnectorInstance) {
        return [cartridgeConnectorInstance, ...injectedConnectors];
      }
      return injectedConnectors;
    }, [injectedConnectors, cartridgeConnectorInstance]);

    return (
      <StarknetConfig
        chains={chains}
        provider={provider}
        connectors={connectors}
        explorer={voyager}
        autoConnect={true}
      >
        {children}
      </StarknetConfig>
    );
  },
);

StarknetProvider.displayName = "StarknetProvider";
