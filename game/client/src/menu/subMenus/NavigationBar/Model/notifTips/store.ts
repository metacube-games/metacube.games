import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

type TTuto = "welcome" | "cubeDamage" | "fallDamage" | "upgrade" | "fisc";

interface NotifTipsState {
  saved: Record<TTuto, boolean>;
  currentNotification: null | TTuto;
  setCurrentNotification: (notification: TTuto | null) => void;
  markAsSaved: (tutorial: TTuto) => void;
}

const useStore = create<NotifTipsState>()(
  persist(
    (set) => ({
      saved: {
        welcome: false,
        cubeDamage: false,
        fallDamage: false,
        upgrade: false,
        fisc: false,
      },
      currentNotification: null,
      setCurrentNotification: (notification) =>
        set({ currentNotification: notification }),
      markAsSaved: (tutorial) =>
        set((state) => ({
          saved: { ...state.saved, [tutorial]: true },
        })),
    }),
    {
      name: "saved",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ saved: state.saved }),
    },
  ),
);

/** Supports `setDeep(key, value)` and `setDeep("nested.path", value)`. */
export const setDeep = (
  keyOrUpdates: string | Partial<NotifTipsState>,
  value?: any,
) => {
  if (typeof keyOrUpdates === "string") {
    const path = keyOrUpdates.split(".");
    if (path.length === 1) {
      useStore.setState({ [keyOrUpdates]: value } as Partial<NotifTipsState>);
    } else {
      const [parent, child] = path;
      if (parent === "saved") {
        useStore.setState((state) => ({
          saved: { ...state.saved, [child]: value },
        }));
      }
    }
  } else {
    useStore.setState(keyOrUpdates);
  }
};

export const useSelectors = (
  ...keys: (keyof NotifTipsState)[]
): NotifTipsState => {
  return useStore(
    useShallow((state) => {
      const result: any = {};
      keys.forEach((key) => {
        result[key] = state[key];
      });
      return result;
    }),
  ) as NotifTipsState;
};
