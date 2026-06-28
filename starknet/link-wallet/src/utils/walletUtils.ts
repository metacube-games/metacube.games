import { connect, type ConnectOptions, type ModalResult } from "starknetkit";

/** Workaround for starknetkit@3.2: its `connect()` Promise never settles on modal dismiss, so race it against a DOM watchdog. */
export async function connectToStarknet(): Promise<ModalResult> {
  const options: ConnectOptions = {
    modalMode: "alwaysAsk",
    modalTheme: "dark",
    argentMobileOptions: {
      dappName: "Metacube Games",
      url: "https://link.metacube.games",
      chainId: "SN_MAIN",
      icons: [],
    },
    webWalletUrl: "https://web.argent.xyz",
    dappName: "Metacube Games",
  };

  if (typeof window === "undefined") {
    return connect(options);
  }

  const cancelled: ModalResult = {
    connector: null,
    connectorData: null,
    wallet: null,
  };

  let settled = false;
  const connectPromise = connect(options).then(
    (result) => {
      settled = true;
      return result;
    },
    (err) => {
      settled = true;
      throw err;
    },
  );

  const dismissPromise = new Promise<ModalResult>((resolve) => {
    let bodyObserver: MutationObserver | null = null;
    let shadowObserver: MutationObserver | null = null;
    let modalWasOpen = false;

    const cleanup = () => {
      bodyObserver?.disconnect();
      shadowObserver?.disconnect();
    };

    const watchShadow = (shadow: ShadowRoot) => {
      const check = () => {
        if (settled) {
          cleanup();
          return;
        }
        const open = shadow.children.length > 1;
        if (open) {
          modalWasOpen = true;
          return;
        }
        if (modalWasOpen) {
          cleanup();
          setTimeout(() => {
            if (!settled) resolve(cancelled);
          }, 0);
        }
      };
      shadowObserver = new MutationObserver(check);
      shadowObserver.observe(shadow, { childList: true });
      check();
    };

    const tryAttach = () => {
      const container = document.getElementById("starknetkit-modal-container");
      if (container?.shadowRoot) {
        bodyObserver?.disconnect();
        watchShadow(container.shadowRoot);
        return true;
      }
      return false;
    };

    if (!tryAttach()) {
      bodyObserver = new MutationObserver(() => {
        if (settled || tryAttach()) bodyObserver?.disconnect();
      });
      bodyObserver.observe(document.body, { childList: true });
    }
  });

  return Promise.race([connectPromise, dismissPromise]);
}
