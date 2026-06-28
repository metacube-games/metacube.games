import { CIPlayer } from "../../../../players/model/playerPhysic";
import { CISocketMng } from "../../../../API/socketMessagesManager";
import emitter from "../../../../helpers/EventEmitter";
import upgradesJson from "../../../../envData/upgrades.json";
import { selectedSkinStateGL } from "../CharacterPanel";
import type { PlayerData } from "../../../../API/backendAPI";

type TPlayerData = Pick<
  PlayerData,
  | "damageLevel"
  | "healthLevel"
  | "flyLevel"
  | "attackRangeLevel"
  | "criticalHitLevel"
  | "multiplierLevel"
>;

const INITLEVEL = 1;

export const MAX_LEVEL_LABEL = "Max Level";

export class CUpgrade<T extends number | number[]> {
  currLvl: number;
  currStat!: T;
  displayName: string;
  name: string;
  description: string;
  cost: string[];

  statList!: T[];
  statsListDescr: string[];

  private eventName: string;

  constructor(
    displayName: string,
    name: string,
    description: string,
    cost: string[],
  ) {
    this.currLvl = INITLEVEL;

    this.displayName = displayName;
    this.name = name;
    this.description = description;
    this.cost = cost;
    this.statsListDescr = [];
    this.eventName = "upgrade_" + name;
  }

  setSkillStatsDescription(statList: T[], statListDescr: string[]): void {
    this.statList = statList;
    this.statsListDescr = [...statListDescr, MAX_LEVEL_LABEL];
  }

  setCurrLvlAndStat(level: number): void {
    this.currLvl = level;
    const bonusId = level - 1;
    if (Array.isArray(this.currStat)) {
      this.currStat = (this.statList as number[][]).map(
        (lvlB) => lvlB[bonusId],
      ) as T;
    } else {
      this.currStat = (this.statList as number[])[bonusId] as T;
    }
  }

  sendEvent(value: T): void {
    emitter.emit(this.eventName, value);
  }

  addListener(functionToCall: (value: T) => void) {
    return emitter.addListener(this.eventName, functionToCall);
  }
}

class CUpgradeMng {
  upgrades: {
    damage: CUpgrade<number>;
    health: CUpgrade<number>;
    fly: CUpgrade<number>;
    attackRange: CUpgrade<number>;
    criticalChance: CUpgrade<number>;
    multiplier: CUpgrade<[number]>;
  };
  constructor() {
    this.upgrades = {
      damage: new CUpgrade<number>(
        upgradesJson.damage.displayName,
        upgradesJson.damage.name,
        upgradesJson.damage.description,
        [
          ...upgradesJson.damage.levels
            .map((lvl) => lvl.cost.toString())
            .slice(1),
          MAX_LEVEL_LABEL,
        ],
      ),
      health: new CUpgrade<number>(
        upgradesJson.health.displayName,
        upgradesJson.health.name,
        upgradesJson.health.description,
        [
          ...upgradesJson.health.levels
            .map((lvl) => lvl.cost.toString())
            .slice(1),
          MAX_LEVEL_LABEL,
        ],
      ),
      fly: new CUpgrade<number>(
        upgradesJson.fly.displayName,
        upgradesJson.fly.name,
        upgradesJson.fly.description,
        [
          ...upgradesJson.fly.levels.map((lvl) => lvl.cost.toString()).slice(1),
          MAX_LEVEL_LABEL,
        ],
      ),
      attackRange: new CUpgrade<number>(
        upgradesJson.attackRange.displayName,
        upgradesJson.attackRange.name,
        upgradesJson.attackRange.description,
        [
          ...upgradesJson.attackRange.levels
            .map((lvl) => lvl.cost.toString())
            .slice(1),
          MAX_LEVEL_LABEL,
        ],
      ),
      criticalChance: new CUpgrade<number>(
        upgradesJson.criticalHit.displayName,
        upgradesJson.criticalHit.name,
        upgradesJson.criticalHit.description,
        [
          ...upgradesJson.criticalHit.levels
            .map((lvl) => lvl.cost.toString())
            .slice(1),
          MAX_LEVEL_LABEL,
        ],
      ),
      multiplier: new CUpgrade<[number]>(
        upgradesJson.multiplier.displayName,
        upgradesJson.multiplier.name,
        upgradesJson.multiplier.description,
        [
          ...upgradesJson.multiplier.levels
            .map((lvl) => lvl.cost.toString())
            .slice(1),
          MAX_LEVEL_LABEL,
        ],
      ),
    };

    this.init();
  }

  init() {
    const arrayList = [
      upgradesJson.damage.levels.map((lvl) => lvl.value),
      upgradesJson.health.levels.map((lvl) => lvl.value),
      [25, 30, 35, 40, 45, 50, 55, 60, 65],
      [2, 2.5, 3, 3.5, 4, 5, 6, 7, 8],
      upgradesJson.criticalHit.levels.map((lvl) => lvl.value),
      upgradesJson.multiplier.levels.map((lvl) => lvl.value),
    ];
    const descriptions = [
      " damage",
      " health",
      " stamina",
      " meters",
      "% critical",
      "% value",
    ];
    const fillingList = arrayList.map((array, idx) => {
      const description = descriptions[idx];
      return array.map((val) => `${val}${description}`);
    });

    Object.values(this.upgrades).forEach((upgrade, id) =>
      upgrade.setSkillStatsDescription(
        arrayList[id] as any,
        fillingList[id] as string[],
      ),
    );
  }

  skillUpgrade(name: string, level: number) {
    switch (name) {
      case "damage":
        this.updateDamage(level);
        CISocketMng.sendSocketUpgrade();
        break;
      case "health":
        this.updateHealth(level);
        CISocketMng.sendSocketUpgrade();
        break;
      case "fly":
        this.updateFly(level);
        break;
      case "attackRange":
        this.updateAttackRange(level);
        break;
      case "criticalHit":
        this.updateCriticalHit(level);
        CISocketMng.sendSocketUpgrade();
        break;
      case "multiplier":
        this.updateMultiplier(level);
        CISocketMng.sendSocketUpgrade();
        break;
      default:
        break;
    }
  }

  updateDamage(level: number) {
    this.upgrades.damage.setCurrLvlAndStat(level);
  }

  updateHealth(level: number) {
    const totalLevel = level + selectedSkinStateGL.health - 1;
    this.upgrades.health.setCurrLvlAndStat(level);
    CIPlayer.updateMaxHealth(this.upgrades.health.statList[totalLevel]);
    this.upgrades.health.sendEvent(this.upgrades.health.statList[totalLevel]);
  }

  updateFly(level: number) {
    const totalLevel = level + selectedSkinStateGL.endurance - 1;
    this.upgrades.fly.setCurrLvlAndStat(level);
    CIPlayer.updateMaxEndurance(this.upgrades.fly.statList[totalLevel]);
    this.upgrades.fly.sendEvent(this.upgrades.fly.statList[totalLevel]);
  }

  updateFlySkin(level: number) {
    const totalLevel = level + selectedSkinStateGL.endurance - 1;
    this.upgrades.fly.setCurrLvlAndStat(level);
    CIPlayer.updateMaxEnduranceOnly(this.upgrades.fly.statList[totalLevel]);
    this.upgrades.fly.sendEvent(this.upgrades.fly.statList[totalLevel]);
  }

  updateAttackRange(level: number) {
    const totalLevel = level + selectedSkinStateGL.attackRange - 1;
    this.upgrades.attackRange.setCurrLvlAndStat(level);
    CIPlayer.updateAttackRange(this.upgrades.attackRange.statList[totalLevel]);
  }

  updateCriticalHit(level: number) {
    this.upgrades.criticalChance.setCurrLvlAndStat(level);
  }

  updateMultiplier(level: number) {
    this.upgrades.multiplier.setCurrLvlAndStat(level);
  }

  setAllUpgrades(playerData: TPlayerData) {
    this.updateDamage(playerData.damageLevel);
    this.updateHealth(playerData.healthLevel);
    this.updateFly(playerData.flyLevel);
    this.updateAttackRange(playerData.attackRangeLevel);
    this.updateCriticalHit(playerData.criticalHitLevel);
    this.updateMultiplier(playerData.multiplierLevel);
  }

  setAllUpgradeOnSkinChange() {
    if (!(this.upgrades.damage.currLvl >= 0)) return;
    this.updateFlySkin(this.upgrades.fly.currLvl);
    this.updateAttackRange(this.upgrades.attackRange.currLvl);
  }

  resetAllUpgrades() {
    Object.values(this.upgrades).forEach((upgrade) => {
      upgrade.setCurrLvlAndStat(INITLEVEL);
    });
  }
}

export const CIUpgradeMng = new CUpgradeMng();
