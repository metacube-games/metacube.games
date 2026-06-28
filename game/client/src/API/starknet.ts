import type { AccountInterface } from "starknet";

let publicKey = "";

export function setPublicKeyFromCookies(publicKeyCookies: string) {
  publicKey = publicKeyCookies;
}

export async function signMessage(
  account: AccountInterface,
  message: string,
): Promise<string[]> {
  if (!account) {
    throw new Error("Unable to sign message: account is not initialized.");
  }

  const messageStructure = {
    domain: {
      name: "Metacube",
      chainId: "SN_MAIN",
      version: "0.0.1",
      revision: "1",
    },
    types: {
      StarknetDomain: [
        { name: "name", type: "shortstring" },
        { name: "chainId", type: "shortstring" },
        { name: "version", type: "shortstring" },
        { name: "revision", type: "shortstring" },
      ],
      Message: [{ name: "message", type: "felt" }],
    },
    primaryType: "Message",
    message: {
      message: "timestamp: " + message,
    },
  };

  try {
    // starknet.js's `signMessage` returns `Signature` (union of string[] or
    // a Weierstrass tuple); the wallet adapters we use always resolve to
    // a flat `string[]` so we cast to keep the backend `postConnect`
    // signature type stable.
    return (await account.signMessage(messageStructure)) as string[];
  } catch (error) {
    console.error("Error signing the message:", error);
    throw error;
  }
}

export function getPublicKey() {
  return publicKey;
}
