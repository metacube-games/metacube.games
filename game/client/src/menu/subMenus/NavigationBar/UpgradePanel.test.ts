import { describe, it, expect } from "vitest";

const UPGRADE_NAME_MAP: Record<string, { name: string; desc: string }> = {
  "Mining rig": { name: "upgrades.miningRig", desc: "upgrades.miningRigDesc" },
  Staking: { name: "upgrades.staking", desc: "upgrades.stakingDesc" },
  Wallet: { name: "upgrades.wallet", desc: "upgrades.walletDesc" },
  Network: { name: "upgrades.network", desc: "upgrades.networkDesc" },
  Caffeine: { name: "upgrades.caffeine", desc: "upgrades.caffeineDesc" },
  "Proof-of-luck": {
    name: "upgrades.proofOfLuck",
    desc: "upgrades.proofOfLuckDesc",
  },
};

const getUpgradeTranslationKey = (
  displayName: string,
  type: "name" | "desc" = "name",
): string => {
  const mapping = UPGRADE_NAME_MAP[displayName];
  if (!mapping) return displayName;
  return type === "name" ? mapping.name : mapping.desc;
};

describe("UpgradePanel Utilities", () => {
  describe("UPGRADE_NAME_MAP", () => {
    it("should contain all 6 upgrade mappings", () => {
      expect(Object.keys(UPGRADE_NAME_MAP)).toHaveLength(6);
    });

    it("should have correct structure for each upgrade", () => {
      Object.entries(UPGRADE_NAME_MAP).forEach(([, value]) => {
        expect(value).toHaveProperty("name");
        expect(value).toHaveProperty("desc");
        expect(typeof value.name).toBe("string");
        expect(typeof value.desc).toBe("string");
        expect(value.name).toMatch(/^upgrades\./);
        expect(value.desc).toMatch(/^upgrades\./);
      });
    });

    it("should map Mining rig correctly", () => {
      expect(UPGRADE_NAME_MAP["Mining rig"]).toEqual({
        name: "upgrades.miningRig",
        desc: "upgrades.miningRigDesc",
      });
    });

    it("should map Staking correctly", () => {
      expect(UPGRADE_NAME_MAP["Staking"]).toEqual({
        name: "upgrades.staking",
        desc: "upgrades.stakingDesc",
      });
    });

    it("should map Wallet correctly", () => {
      expect(UPGRADE_NAME_MAP["Wallet"]).toEqual({
        name: "upgrades.wallet",
        desc: "upgrades.walletDesc",
      });
    });

    it("should map Network correctly", () => {
      expect(UPGRADE_NAME_MAP["Network"]).toEqual({
        name: "upgrades.network",
        desc: "upgrades.networkDesc",
      });
    });

    it("should map Caffeine correctly", () => {
      expect(UPGRADE_NAME_MAP["Caffeine"]).toEqual({
        name: "upgrades.caffeine",
        desc: "upgrades.caffeineDesc",
      });
    });

    it("should map Proof-of-luck correctly", () => {
      expect(UPGRADE_NAME_MAP["Proof-of-luck"]).toEqual({
        name: "upgrades.proofOfLuck",
        desc: "upgrades.proofOfLuckDesc",
      });
    });
  });

  describe("getUpgradeTranslationKey", () => {
    it("should return name translation key by default", () => {
      expect(getUpgradeTranslationKey("Mining rig")).toBe("upgrades.miningRig");
    });

    it("should return name translation key when type='name'", () => {
      expect(getUpgradeTranslationKey("Staking", "name")).toBe(
        "upgrades.staking",
      );
    });

    it("should return description translation key when type='desc'", () => {
      expect(getUpgradeTranslationKey("Wallet", "desc")).toBe(
        "upgrades.walletDesc",
      );
    });

    it("should return original displayName when not found in map", () => {
      expect(getUpgradeTranslationKey("Unknown Upgrade")).toBe(
        "Unknown Upgrade",
      );
    });

    it("should handle all upgrades correctly for name type", () => {
      expect(getUpgradeTranslationKey("Mining rig", "name")).toBe(
        "upgrades.miningRig",
      );
      expect(getUpgradeTranslationKey("Staking", "name")).toBe(
        "upgrades.staking",
      );
      expect(getUpgradeTranslationKey("Wallet", "name")).toBe(
        "upgrades.wallet",
      );
      expect(getUpgradeTranslationKey("Network", "name")).toBe(
        "upgrades.network",
      );
      expect(getUpgradeTranslationKey("Caffeine", "name")).toBe(
        "upgrades.caffeine",
      );
      expect(getUpgradeTranslationKey("Proof-of-luck", "name")).toBe(
        "upgrades.proofOfLuck",
      );
    });

    it("should handle all upgrades correctly for desc type", () => {
      expect(getUpgradeTranslationKey("Mining rig", "desc")).toBe(
        "upgrades.miningRigDesc",
      );
      expect(getUpgradeTranslationKey("Staking", "desc")).toBe(
        "upgrades.stakingDesc",
      );
      expect(getUpgradeTranslationKey("Wallet", "desc")).toBe(
        "upgrades.walletDesc",
      );
      expect(getUpgradeTranslationKey("Network", "desc")).toBe(
        "upgrades.networkDesc",
      );
      expect(getUpgradeTranslationKey("Caffeine", "desc")).toBe(
        "upgrades.caffeineDesc",
      );
      expect(getUpgradeTranslationKey("Proof-of-luck", "desc")).toBe(
        "upgrades.proofOfLuckDesc",
      );
    });
  });
});
