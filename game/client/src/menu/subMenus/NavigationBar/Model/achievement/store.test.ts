import { describe, it, expect, beforeEach } from "vitest";
import {
  useAchievementsStore,
  AchievementCategories,
  SAisAchievementUnlocked,
  SAgetCurrentPlayer,
  SAsetCurrentPlayer,
  SAresetAchievementsAction,
  SAnotifyAction,
  SAunlockAction,
  SAunlockAchievementsAction,
} from "./store";

describe("useAchievementsStore", () => {
  beforeEach(() => {
    useAchievementsStore.getState().resetAchievements();
  });

  describe("Initial State", () => {
    it("should have empty currentPlayer", () => {
      const state = useAchievementsStore.getState();
      expect(state.currentPlayer).toBe("");
    });

    it("should have empty achievements for all categories", () => {
      const state = useAchievementsStore.getState();

      AchievementCategories.forEach((category) => {
        expect(state.achievements[category]).toEqual({});
      });
    });

    it("should have default notifEntries", () => {
      const state = useAchievementsStore.getState();
      expect(state.notifEntries).toEqual([-1, -1, -1]);
    });

    it("should have all 10 achievement categories", () => {
      expect(AchievementCategories).toHaveLength(10);
      expect(AchievementCategories).toContain("cubes");
      expect(AchievementCategories).toContain("attacks");
      expect(AchievementCategories).toContain("ally");
      expect(AchievementCategories).toContain("deaths");
      expect(AchievementCategories).toContain("upgrades");
      expect(AchievementCategories).toContain("streaks");
      expect(AchievementCategories).toContain("links");
      expect(AchievementCategories).toContain("skins");
      expect(AchievementCategories).toContain("layers");
      expect(AchievementCategories).toContain("blocks");
    });
  });

  describe("unlockAchievement", () => {
    it("should unlock a single achievement", () => {
      const state = useAchievementsStore.getState();

      state.unlockAchievement("cubes", "bronze");

      const newState = useAchievementsStore.getState();
      expect(newState.achievements.cubes.bronze).toBe(true);
    });

    it("should unlock multiple achievements in same category", () => {
      const state = useAchievementsStore.getState();

      state.unlockAchievement("cubes", "bronze");
      state.unlockAchievement("cubes", "silver");
      state.unlockAchievement("cubes", "gold");

      const newState = useAchievementsStore.getState();
      expect(newState.achievements.cubes.bronze).toBe(true);
      expect(newState.achievements.cubes.silver).toBe(true);
      expect(newState.achievements.cubes.gold).toBe(true);
    });

    it("should unlock achievements in different categories", () => {
      const state = useAchievementsStore.getState();

      state.unlockAchievement("cubes", "bronze");
      state.unlockAchievement("attacks", "killer");
      state.unlockAchievement("layers", "explorer");

      const newState = useAchievementsStore.getState();
      expect(newState.achievements.cubes.bronze).toBe(true);
      expect(newState.achievements.attacks.killer).toBe(true);
      expect(newState.achievements.layers.explorer).toBe(true);
    });

    it("should not affect other achievements when unlocking", () => {
      const state = useAchievementsStore.getState();

      state.unlockAchievement("cubes", "bronze");
      state.unlockAchievement("attacks", "killer");

      const newState = useAchievementsStore.getState();
      expect(newState.achievements.cubes.bronze).toBe(true);
      expect(newState.achievements.attacks.killer).toBe(true);
      expect(newState.achievements.deaths).toEqual({});
      expect(newState.achievements.upgrades).toEqual({});
    });
  });

  describe("unlockAchievements (batch)", () => {
    it("should unlock multiple achievements at once", () => {
      const state = useAchievementsStore.getState();

      state.unlockAchievements({
        cubes: ["bronze", "silver", "gold"],
        attacks: ["first", "killer"],
      });

      const newState = useAchievementsStore.getState();
      expect(newState.achievements.cubes.bronze).toBe(true);
      expect(newState.achievements.cubes.silver).toBe(true);
      expect(newState.achievements.cubes.gold).toBe(true);
      expect(newState.achievements.attacks.first).toBe(true);
      expect(newState.achievements.attacks.killer).toBe(true);
    });

    it("should create category if it doesn't exist", () => {
      const state = useAchievementsStore.getState();

      state.unlockAchievements({
        newCategory: ["achievement1", "achievement2"],
      });

      const newState = useAchievementsStore.getState();
      expect(newState.achievements.newCategory).toBeDefined();
      expect(newState.achievements.newCategory.achievement1).toBe(true);
      expect(newState.achievements.newCategory.achievement2).toBe(true);
    });

    it("should merge with existing achievements", () => {
      const state = useAchievementsStore.getState();

      state.unlockAchievement("cubes", "bronze");

      state.unlockAchievements({
        cubes: ["silver", "gold"],
      });

      const newState = useAchievementsStore.getState();
      expect(newState.achievements.cubes.bronze).toBe(true);
      expect(newState.achievements.cubes.silver).toBe(true);
      expect(newState.achievements.cubes.gold).toBe(true);
    });
  });

  describe("notify", () => {
    it("should update notification entries", () => {
      const state = useAchievementsStore.getState();

      state.notify(1, 2, 3);

      const newState = useAchievementsStore.getState();
      expect(newState.notifEntries).toEqual([1, 2, 3]);
    });

    it("should overwrite previous notification", () => {
      const state = useAchievementsStore.getState();

      state.notify(1, 2, 3);
      state.notify(4, 5, 6);

      const newState = useAchievementsStore.getState();
      expect(newState.notifEntries).toEqual([4, 5, 6]);
    });
  });

  describe("resetAchievements", () => {
    it("should reset all achievements to empty", () => {
      const state = useAchievementsStore.getState();

      state.unlockAchievement("cubes", "bronze");
      state.unlockAchievement("attacks", "killer");
      state.setCurrentPlayer("player123");

      state.resetAchievements();

      const newState = useAchievementsStore.getState();
      expect(newState.currentPlayer).toBe("");
      expect(newState.achievements.cubes).toEqual({});
      expect(newState.achievements.attacks).toEqual({});
    });

    it("should reset all categories", () => {
      const state = useAchievementsStore.getState();

      state.unlockAchievements({
        cubes: ["bronze"],
        attacks: ["killer"],
        layers: ["explorer"],
      });

      state.resetAchievements();

      const newState = useAchievementsStore.getState();
      AchievementCategories.forEach((category) => {
        expect(newState.achievements[category]).toEqual({});
      });
    });
  });

  describe("setCurrentPlayer", () => {
    it("should set current player", () => {
      const state = useAchievementsStore.getState();

      state.setCurrentPlayer("player123");

      const newState = useAchievementsStore.getState();
      expect(newState.currentPlayer).toBe("player123");
    });

    it("should update current player", () => {
      const state = useAchievementsStore.getState();

      state.setCurrentPlayer("player1");
      state.setCurrentPlayer("player2");

      const newState = useAchievementsStore.getState();
      expect(newState.currentPlayer).toBe("player2");
    });
  });

  describe("Standalone Action Functions", () => {
    describe("SAisAchievementUnlocked", () => {
      it("should return true for unlocked achievement", () => {
        useAchievementsStore.getState().unlockAchievement("cubes", "bronze");
        expect(SAisAchievementUnlocked("cubes", "bronze")).toBe(true);
      });

      it("should return undefined for locked achievement", () => {
        expect(SAisAchievementUnlocked("cubes", "silver")).toBeUndefined();
      });

      it("should work with all categories", () => {
        useAchievementsStore.getState().unlockAchievement("attacks", "killer");
        useAchievementsStore.getState().unlockAchievement("layers", "explorer");

        expect(SAisAchievementUnlocked("attacks", "killer")).toBe(true);
        expect(SAisAchievementUnlocked("layers", "explorer")).toBe(true);
      });
    });

    describe("SAgetCurrentPlayer / SAsetCurrentPlayer", () => {
      it("should get and set current player", () => {
        SAsetCurrentPlayer("testPlayer");
        expect(SAgetCurrentPlayer()).toBe("testPlayer");
      });

      it("should return empty string initially", () => {
        SAresetAchievementsAction();
        expect(SAgetCurrentPlayer()).toBe("");
      });
    });

    describe("SAresetAchievementsAction", () => {
      it("should reset achievements via action", () => {
        useAchievementsStore.getState().unlockAchievement("cubes", "bronze");
        SAsetCurrentPlayer("player1");

        SAresetAchievementsAction();

        expect(SAgetCurrentPlayer()).toBe("");
        expect(SAisAchievementUnlocked("cubes", "bronze")).toBeUndefined();
      });
    });

    describe("SAnotifyAction", () => {
      it("should set notification entries via action", () => {
        SAnotifyAction(5, 10, 15);

        const state = useAchievementsStore.getState();
        expect(state.notifEntries).toEqual([5, 10, 15]);
      });
    });

    describe("SAunlockAction", () => {
      it("should unlock achievement via action", () => {
        SAunlockAction("cubes", "bronze");

        expect(SAisAchievementUnlocked("cubes", "bronze")).toBe(true);
      });

      it("should unlock multiple achievements", () => {
        SAunlockAction("cubes", "bronze");
        SAunlockAction("attacks", "killer");

        expect(SAisAchievementUnlocked("cubes", "bronze")).toBe(true);
        expect(SAisAchievementUnlocked("attacks", "killer")).toBe(true);
      });
    });

    describe("SAunlockAchievementsAction", () => {
      it("should batch unlock achievements via action", () => {
        SAunlockAchievementsAction({
          cubes: ["bronze", "silver"],
          attacks: ["first"],
        });

        expect(SAisAchievementUnlocked("cubes", "bronze")).toBe(true);
        expect(SAisAchievementUnlocked("cubes", "silver")).toBe(true);
        expect(SAisAchievementUnlocked("attacks", "first")).toBe(true);
      });
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle player switching", () => {
      SAsetCurrentPlayer("player1");
      SAunlockAction("cubes", "bronze");

      expect(SAgetCurrentPlayer()).toBe("player1");
      expect(SAisAchievementUnlocked("cubes", "bronze")).toBe(true);

      SAresetAchievementsAction();
      SAsetCurrentPlayer("player2");
      SAunlockAction("attacks", "killer");

      expect(SAgetCurrentPlayer()).toBe("player2");
      expect(SAisAchievementUnlocked("cubes", "bronze")).toBeUndefined();
      expect(SAisAchievementUnlocked("attacks", "killer")).toBe(true);
    });

    it("should handle achievement progression", () => {
      SAsetCurrentPlayer("player1");

      SAunlockAction("cubes", "bronze");
      expect(SAisAchievementUnlocked("cubes", "bronze")).toBe(true);

      SAunlockAction("cubes", "silver");
      expect(SAisAchievementUnlocked("cubes", "silver")).toBe(true);
      expect(SAisAchievementUnlocked("cubes", "bronze")).toBe(true);

      SAunlockAction("cubes", "gold");
      expect(SAisAchievementUnlocked("cubes", "gold")).toBe(true);
      expect(SAisAchievementUnlocked("cubes", "silver")).toBe(true);
      expect(SAisAchievementUnlocked("cubes", "bronze")).toBe(true);
    });

    it("should handle batch unlock with notification", () => {
      SAunlockAchievementsAction({
        cubes: ["bronze", "silver"],
        attacks: ["first", "killer"],
      });

      SAnotifyAction(0, 0, 1); // Notify about achievement

      const state = useAchievementsStore.getState();
      expect(state.notifEntries).toEqual([0, 0, 1]);
      expect(SAisAchievementUnlocked("cubes", "bronze")).toBe(true);
      expect(SAisAchievementUnlocked("cubes", "silver")).toBe(true);
      expect(SAisAchievementUnlocked("attacks", "first")).toBe(true);
      expect(SAisAchievementUnlocked("attacks", "killer")).toBe(true);
    });
  });
});
