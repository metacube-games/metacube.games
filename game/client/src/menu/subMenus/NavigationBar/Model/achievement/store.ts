import { create } from "zustand";
import { useBombStore } from "../../../../../stores/bombStore";
import {
  ACHIEVEMENT_GROUP_THRESHOLDS,
  ACHIEVEMENT_GROUP_TYPES,
} from "./achievementGroups";

export const AchievementCategories = [
  "cubes",
  "attacks",
  "ally",
  "deaths",
  "upgrades",
  "streaks",
  "links",
  "skins",
  "layers",
  "blocks",
] as const;

export type AchievementCategory = (typeof AchievementCategories)[number];

// Order is protocol-significant: the binary `type` index maps 0 -> "types",
// 1 -> "thresholds" in NotificationsRoot's `AchievementTypes[type]` lookup.
export const AchievementTypes = [
  ACHIEVEMENT_GROUP_TYPES,
  ACHIEVEMENT_GROUP_THRESHOLDS,
];

const initialAchievements = AchievementCategories.reduce(
  (acc, category) => {
    acc[category] = {};
    return acc;
  },
  {} as { [key: string]: { [key: string]: boolean } },
);

export const calculateTotalAchievements = (achievements: {
  [key: string]: { [key: string]: boolean };
}): number => {
  let total = 0;
  Object.values(achievements).forEach((category) => {
    total += Object.values(category).filter(Boolean).length;
  });
  return total;
};

interface AchievementsStore {
  currentPlayer: string;
  achievements: { [key: string]: { [key: string]: boolean } };
  notifEntries: [number, number, number];
  totalAchievementsCount: number;
  unlockAchievement: (cat: string, key: string) => void;
  unlockAchievements: (achievements: { [cat: string]: string[] }) => void;
  notify: (cat: number, type: number, key: number) => void;
  resetAchievements: () => void;
  setCurrentPlayer: (player: string) => void;
}

export const useAchievementsStore = create<AchievementsStore>((set) => ({
  currentPlayer: "",
  achievements: initialAchievements,
  notifEntries: [-1, -1, -1],
  totalAchievementsCount: 0,
  unlockAchievement: (cat: string, key: string) =>
    set((state) => {
      if (state.achievements[cat]?.[key]) {
        return state;
      }

      const updatedAchievements = {
        ...state.achievements,
        [cat]: {
          ...state.achievements[cat],
          [key]: true,
        },
      };

      const totalAchievements = calculateTotalAchievements(updatedAchievements);
      useBombStore.getState().setTotalAchievements(totalAchievements);

      return {
        achievements: updatedAchievements,
        totalAchievementsCount: totalAchievements,
      };
    }),
  unlockAchievements: (achievements: { [cat: string]: string[] }) =>
    set((state) => {
      const updatedAchievements = { ...state.achievements };

      Object.entries(achievements).forEach(([category, keys]) => {
        // Clone the nested category before writing so the previous state is not
        // mutated in place and the category reference changes (matches unlockAchievement).
        updatedAchievements[category] = {
          ...(updatedAchievements[category] ?? {}),
        };

        keys.forEach((key) => {
          if (!updatedAchievements[category][key]) {
            updatedAchievements[category][key] = true;
          }
        });
      });

      const totalAchievements = calculateTotalAchievements(updatedAchievements);
      useBombStore.getState().setTotalAchievements(totalAchievements);

      return {
        achievements: updatedAchievements,
        totalAchievementsCount: totalAchievements,
      };
    }),
  notify: (cat: number, type: number, key: number) =>
    set(() => ({
      notifEntries: [cat, type, key],
    })),
  resetAchievements: () => {
    set({
      currentPlayer: "",
      achievements: AchievementCategories.reduce(
        (acc, category) => {
          acc[category] = {};
          return acc;
        },
        {} as { [key: string]: { [key: string]: boolean } },
      ),
      totalAchievementsCount: 0,
    });
    useBombStore.getState().setTotalAchievements(0);
    useBombStore.getState().reset();
  },
  setCurrentPlayer: (player: string) => {
    set({ currentPlayer: player });
    useBombStore.getState().setCurrentPlayer(player);
  },
}));

// Multiple delayed retries to handle varying persist hydration timing.
if (typeof window !== "undefined") {
  const immediateSync = () => {
    try {
      const state = useAchievementsStore.getState();
      const totalAchievements = calculateTotalAchievements(state.achievements);

      if (totalAchievements !== state.totalAchievementsCount) {
        useAchievementsStore.setState({
          totalAchievementsCount: totalAchievements,
        });
      }

      const bombState = useBombStore.getState();
      if (
        totalAchievements !== bombState.totalAchievements ||
        totalAchievements > 0
      ) {
        useBombStore.getState().setTotalAchievements(totalAchievements);
      }
    } catch (error) {
      console.error("[AchievementStore] Sync failed:", error);
    }
  };

  immediateSync();

  setTimeout(immediateSync, 50);
  setTimeout(immediateSync, 200);
  setTimeout(immediateSync, 500);
}

export const SAisAchievementUnlocked = (
  cat: (typeof AchievementCategories)[number],
  key: string,
) => {
  return useAchievementsStore?.getState()?.achievements[cat][key];
};

export const SAgetCurrentPlayer = () => {
  return useAchievementsStore?.getState()?.currentPlayer;
};
export const SAsetCurrentPlayer = (player: string) => {
  useAchievementsStore?.getState()?.setCurrentPlayer(player);
};

export const SAresetAchievementsAction = () => {
  useAchievementsStore?.getState()?.resetAchievements();
};

export const SAnotifyAction = (cat: number, type: number, key: number) => {
  useAchievementsStore?.getState()?.notify(cat, type, key);
};

export const SAunlockAction = (cat: AchievementCategory, key: string) => {
  useAchievementsStore?.getState()?.unlockAchievement(cat, key);
};

export const SAunlockAchievementsAction = (achievements: {
  [cat: string]: string[];
}) => {
  useAchievementsStore?.getState()?.unlockAchievements(achievements);
};

export type IAchievement = {
  key: string;
  id: number;
  name: string;
  description: string;
  reward: number;
  type: number;
};
