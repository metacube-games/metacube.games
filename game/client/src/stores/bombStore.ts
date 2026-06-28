/**
 * Bomb Progression Store
 *
 * Manages bomb unlock state, selected bomb type, and achievement-based progression.
 * Uses Zustand with persist middleware to maintain state across sessions.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  BombType,
  BOMB_CONFIG,
  BOMB_ORDER,
  UNLOCK_THRESHOLDS,
} from "../constants/bombTypes";

// Clear old localStorage format (one-time migration). Guard against
// environments where storage is entirely absent (SSR, tests, sandboxed
// frames) and never let the cleanup itself throw uncaught.
if (
  typeof window !== "undefined" &&
  typeof window.localStorage !== "undefined"
) {
  try {
    const oldData = localStorage.getItem("bomb-storage");
    if (oldData) {
      const parsed = JSON.parse(oldData);
      // Check if it's the old format (no _version or version < 1)
      if (!parsed._version || parsed._version < 1) {
        console.warn("[BombStore] Clearing old localStorage format");
        localStorage.removeItem("bomb-storage");
      }
    }
  } catch (e) {
    // Most likely corrupt JSON — drop the entry so the store starts clean.
    console.error("[BombStore] Error clearing old storage:", e);
    try {
      localStorage.removeItem("bomb-storage");
    } catch {
      /* storage unavailable — nothing to clear */
    }
  }
}

/**
 * Bomb store state interface
 */
interface BombState {
  // State
  unlockedBombs: Set<BombType>;
  selectedBomb: BombType;
  totalAchievements: number;
  currentPlayer: string; // Track which player this data belongs to

  // Actions
  unlockBomb: (bombType: BombType) => void;
  selectBomb: (bombType: BombType) => void;
  setTotalAchievements: (count: number) => void;
  checkUnlocks: () => void;
  isBombUnlocked: (bombType: BombType) => boolean;
  getFirstUnlockedBomb: () => BombType;
  getNextUnlockThreshold: () => number | null;
  reset: () => void;
  setCurrentPlayer: (playerKey: string) => void;
}

/**
 * Initial state (no bombs unlocked, nothing selected)
 */
const initialState = {
  unlockedBombs: new Set<BombType>(),
  selectedBomb: BombType.NONE,
  totalAchievements: 0,
  currentPlayer: "",
};

/**
 * Bomb unlock store
 *
 * Automatically unlocks bombs when achievement thresholds are reached.
 * Persists state to localStorage for session continuity.
 */
export const useBombStore = create<BombState>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * Unlock a specific bomb type
       */
      unlockBomb: (bombType: BombType) => {
        // Validate bomb type is not NONE
        if (bombType === BombType.NONE) return;

        set((state) => {
          // Safeguard: Ensure unlockedBombs is a Set
          let currentBombs = state.unlockedBombs;
          if (Array.isArray(currentBombs)) {
            currentBombs = new Set(currentBombs as BombType[]);
          }

          const newUnlockedBombs = new Set(currentBombs);
          newUnlockedBombs.add(bombType);
          return { unlockedBombs: newUnlockedBombs };
        });
      },

      /**
       * Select a bomb type for placement
       * Only allows selection if bomb is unlocked
       */
      selectBomb: (bombType: BombType) => {
        const state = get();

        // Allow selecting NONE (deselect)
        if (bombType === BombType.NONE) {
          set({ selectedBomb: BombType.NONE });
          return;
        }

        // Only select if unlocked
        if (state.isBombUnlocked(bombType)) {
          set({ selectedBomb: bombType });
        }
      },

      /**
       * Update total achievement count and check for new unlocks
       */
      setTotalAchievements: (count: number) => {
        set({ totalAchievements: count });
        get().checkUnlocks();
      },

      /**
       * Check and unlock/lock bombs based on achievement count
       * Automatically unlocks bombs at thresholds: 5, 10, 15, 20, 25
       * Locks bombs that are no longer eligible when switching accounts
       */
      checkUnlocks: () => {
        const { totalAchievements } = get();

        // Rebuild the unlocked bombs Set from scratch based on current achievement count
        const newUnlockedBombs = new Set<BombType>();

        // Check each bomb type against its unlock threshold
        Object.entries(BOMB_CONFIG).forEach(([typeStr, config]) => {
          const bombType = parseInt(typeStr) as BombType;

          // Skip NONE type
          if (bombType === BombType.NONE) return;

          // Add to set if threshold met
          if (totalAchievements >= config.unlockAchievements) {
            newUnlockedBombs.add(bombType);
          }
        });

        set({ unlockedBombs: newUnlockedBombs });
      },

      /**
       * Check if a bomb type is unlocked
       */
      isBombUnlocked: (bombType: BombType): boolean => {
        // NONE is always "available" but not really a bomb
        if (bombType === BombType.NONE) return false;

        const state = get();
        const unlockedBombs = state.unlockedBombs;

        // Safeguard: If unlockedBombs is an Array (from corrupted localStorage), convert to Set
        if (Array.isArray(unlockedBombs)) {
          set({ unlockedBombs: new Set(unlockedBombs as BombType[]) });
          return (unlockedBombs as BombType[]).includes(bombType);
        }

        return unlockedBombs.has(bombType);
      },

      /**
       * Get the first unlocked bomb (lowest tier)
       * Returns NONE if no bombs are unlocked
       */
      getFirstUnlockedBomb: (): BombType => {
        const state = get();
        const unlockedBombs = state.unlockedBombs;

        // Safeguard: If unlockedBombs is an Array, convert to Set
        if (Array.isArray(unlockedBombs)) {
          const bombSet = new Set(unlockedBombs as BombType[]);
          set({ unlockedBombs: bombSet });
        }

        for (const bomb of BOMB_ORDER) {
          if (state.isBombUnlocked(bomb)) {
            return bomb;
          }
        }
        return BombType.NONE; // No bombs unlocked
      },

      /**
       * Get the next achievement threshold for bomb unlock
       * Returns null if all bombs are unlocked
       */
      getNextUnlockThreshold: (): number | null => {
        const { totalAchievements } = get();

        // Find the next unlock threshold
        const thresholds = UNLOCK_THRESHOLDS.filter(
          (threshold) => threshold > totalAchievements,
        );

        return thresholds.length > 0 ? thresholds[0] : null;
      },

      /**
       * Reset bomb store to initial state
       * Useful for testing or logout
       */
      reset: () => set(initialState),

      /**
       * Set current player and reset if player changed
       * @param playerKey - Unique identifier for the player (e.g., wallet address)
       */
      setCurrentPlayer: (playerKey: string) => {
        const currentPlayer = get().currentPlayer;

        // If player changed, reset bomb state
        if (currentPlayer && currentPlayer !== playerKey) {
          set({
            ...initialState,
            currentPlayer: playerKey,
          });
        } else {
          set({ currentPlayer: playerKey });
        }
      },
    }),
    {
      name: "bomb-storage", // localStorage key
      version: 1, // Increment this to force a reset

      // Set<BombType> isn't JSON-serializable; convert via replacer/reviver.
      storage: createJSONStorage(() => localStorage, {
        replacer: (_key, value) =>
          value instanceof Set ? Array.from(value) : value,
        reviver: (key, value) =>
          key === "unlockedBombs" && Array.isArray(value)
            ? new Set<BombType>(value as BombType[])
            : value,
      }),

      /**
       * Partial state persistence
       * Only persist critical state, skip derived values
       */
      partialize: (state) => ({
        unlockedBombs: state.unlockedBombs,
        selectedBomb: state.selectedBomb,
        totalAchievements: state.totalAchievements,
        currentPlayer: state.currentPlayer,
      }),

      /**
       * After store rehydrates from localStorage, recalculate unlocks
       * This ensures bombs are unlocked based on current achievement count
       * Handles case where achievements increased while bomb store was persisted
       */
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // CRITICAL: Ensure unlockedBombs is a Set, not an Array
        if (Array.isArray(state.unlockedBombs)) {
          state.unlockedBombs = new Set(state.unlockedBombs as BombType[]);
        }

        if (state.totalAchievements > 0) {
          // Recalculate unlocks based on current achievement count
          state.checkUnlocks();
        }
      },
    },
  ),
);
