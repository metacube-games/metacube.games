import { describe, it, expect } from "vitest";

import { descKey as getAchievementDescriptionKey } from "./Achievements";

describe("Achievement Utilities", () => {
  describe("getAchievementDescriptionKey", () => {
    it("should generate correct translation key format", () => {
      const result = getAchievementDescriptionKey("cubes", "bronze");
      expect(result).toBe("achievements.descriptions.cubes.bronze");
    });

    it("should handle all achievement categories", () => {
      const categories = [
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
      ];

      categories.forEach((category) => {
        const result = getAchievementDescriptionKey(category, "test");
        expect(result).toBe(`achievements.descriptions.${category}.test`);
        expect(result).toMatch(/^achievements\.descriptions\./);
      });
    });

    it("should handle different achievement keys", () => {
      expect(getAchievementDescriptionKey("cubes", "bronze")).toBe(
        "achievements.descriptions.cubes.bronze",
      );
      expect(getAchievementDescriptionKey("cubes", "silver")).toBe(
        "achievements.descriptions.cubes.silver",
      );
      expect(getAchievementDescriptionKey("cubes", "gold")).toBe(
        "achievements.descriptions.cubes.gold",
      );
      expect(getAchievementDescriptionKey("attacks", "first")).toBe(
        "achievements.descriptions.attacks.first",
      );
      expect(getAchievementDescriptionKey("deaths", "unlucky")).toBe(
        "achievements.descriptions.deaths.unlucky",
      );
    });

    it("should maintain consistent format", () => {
      const results = [
        getAchievementDescriptionKey("cubes", "bronze"),
        getAchievementDescriptionKey("attacks", "killer"),
        getAchievementDescriptionKey("layers", "explorer"),
      ];

      results.forEach((result) => {
        expect(result).toMatch(/^achievements\.descriptions\.\w+\.\w+$/);
        expect(result.split(".")).toHaveLength(4);
        expect(result.split(".")[0]).toBe("achievements");
        expect(result.split(".")[1]).toBe("descriptions");
      });
    });

    it("should handle empty strings gracefully", () => {
      expect(getAchievementDescriptionKey("", "")).toBe(
        "achievements.descriptions..",
      );
    });

    it("should handle special characters in keys", () => {
      expect(getAchievementDescriptionKey("cubes", "first-blood")).toBe(
        "achievements.descriptions.cubes.first-blood",
      );
      expect(getAchievementDescriptionKey("layers", "layer_1")).toBe(
        "achievements.descriptions.layers.layer_1",
      );
    });
  });

  describe("Achievement Categories", () => {
    const AchievementCategories = [
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

    it("should have 10 achievement categories", () => {
      expect(AchievementCategories).toHaveLength(10);
    });

    it("should contain expected categories", () => {
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

    it("should generate valid translation keys for all categories", () => {
      AchievementCategories.forEach((category) => {
        const key = getAchievementDescriptionKey(category, "test");
        expect(key).toMatch(/^achievements\.descriptions\./);
        expect(key).toContain(category);
      });
    });
  });
});
