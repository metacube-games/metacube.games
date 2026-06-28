import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

interface GState {
  menuDisplay: boolean;
  isConnected: boolean;
  isConnectionLoading: boolean;
  isInGame: boolean;
  isInGameQueue: boolean;
  gameQueuePos?: number;
  address: string;
  walletAddress: string;
  googleId: string;
  googleEmail: string;
  guestId: string;
  username: string;
  definedUsername: boolean;
  chatFocus: boolean;
  readyToRender: boolean;
  readyToRender2: boolean;
  readyToRender3: boolean;
  chatToken: string;
  isWalletLoading: boolean;
  isAuthLoading: boolean;
  isStarknetID: boolean;
  isThirdPerson: boolean;
  referral: string;
  referralLink: string;
}

const userStates = {
  isInGame: false,
  isInGameQueue: false,
  gameQueuePos: undefined,
  isConnected: false,
  isConnectionLoading: false,
  menuDisplay: true,
  address: "",
  walletAddress: "",
  googleId: "",
  googleEmail: "",
  guestId: "",
  username: "",
  definedUsername: false,
  chatToken: "",
  isStarknetID: false,
  referral: "",
  referralLink: "",
};

const initialState: GState = {
  chatFocus: false,
  readyToRender: false,
  readyToRender2: false,
  readyToRender3: false,
  isWalletLoading: false,
  isAuthLoading: false,
  isThirdPerson: false,

  ...userStates,
};

type SetterActions = {
  [K in keyof GState as `set${Capitalize<string & K>}`]: (
    value: GState[K],
  ) => void;
};

interface AdditionalActions {
  decreaseGameQueuePos: () => void;
  setIsInGameQueue: (value: boolean, pos?: number) => void;
  resetAllUserStatesToInitialValues: () => void;
}

type GStore = GState & SetterActions & AdditionalActions;

export const useGStore = create<GStore>()((set) => {
  const store: Partial<GStore> = {
    ...initialState,
    setIsInGameQueue: (value: boolean, pos?: number) =>
      set({ isInGameQueue: value, gameQueuePos: pos }),
    decreaseGameQueuePos: () =>
      set((state) => ({
        gameQueuePos:
          state.isInGameQueue && typeof state.gameQueuePos === "number"
            ? state.gameQueuePos - 1
            : state.gameQueuePos,
      })),

    resetAllUserStatesToInitialValues: () => {
      set({
        ...userStates,
      });
    },
  };

  Object.keys(initialState).forEach((key) => {
    const setterName = `set${
      key.charAt(0).toUpperCase() + key.slice(1)
    }` as keyof SetterActions;
    if (!(setterName in store)) {
      store[setterName] = (value: any) => set({ [key]: value });
    }
  });

  return store as GStore;
});

const getState = useGStore.getState;
export const SGG = Object.fromEntries(
  Object.keys(initialState).map((key) => [
    `get${key.charAt(0).toUpperCase() + key.slice(1)}`,
    () => getState()[key as keyof GState],
  ]),
) as {
  [K in keyof GState as `get${Capitalize<string & K>}`]: () => GState[K];
};

export const SAG = Object.fromEntries(
  Object.keys(getState()).flatMap((key) =>
    key.startsWith("set") ||
    key === "decreaseGameQueuePos" ||
    key === "resetAllUserStatesToInitialValues"
      ? [[key, getState()[key as keyof GStore]]]
      : [],
  ),
) as unknown as SetterActions & AdditionalActions;

export const selectReadyToRender = (s: GState) =>
  s.readyToRender && s.readyToRender2;

export const useGSelectors = <K extends keyof GState>(...keys: K[]) => {
  return useGStore(
    useShallow(
      (state) =>
        Object.fromEntries(
          keys.map((key) => [key, state[key]]),
        ) as unknown as Pick<GState, K>,
    ),
  );
};
