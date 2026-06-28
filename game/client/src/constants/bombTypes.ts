/**
 * Bomb Progression System - Type Definitions and Configuration
 *
 * Players unlock bomb types through achievement progression.
 * Each bomb type has unique explosion patterns, endurance costs, and visual scaling.
 *
 * Unlock Progression: Every 5 achievements (5, 10, 15, 20, 25)
 * Endurance Costs: 5, 10, 15, 20, 25
 * Explosion Patterns: 2×2×2, 3×3×3, 4×4×4, 5×5×5, 6×6×6 cubes
 */

/** Corresponds to message protocol values (0–5). */
export enum BombType {
  NONE = 0,
  MINI = 1,
  STANDARD = 2,
  HEAVY = 3,
  MEGA = 4,
  ULTRA = 5,
}

export const BOMB_FUSE_MS = 2500; // ms

export interface BombConfig {
  name: string;
  unlockAchievements: number;
  enduranceCost: number;
  explosionRadius: number; // Visual reference (not used for calculations)
  scale: number; // Visual mesh scale multiplier
  rangeX: [number, number]; // [min, max] for explosion cube
  rangeY: [number, number];
  rangeZ: [number, number];
}

/**
 * Explosion ranges define cubic patterns centered on the bomb:
 * MINI 2×2×2 | STANDARD 3×3×3 | HEAVY 4×4×4 | MEGA 5×5×5 | ULTRA 6×6×6
 */
export const BOMB_CONFIG: Record<BombType, BombConfig> = {
  [BombType.NONE]: {
    name: "No Bomb",
    unlockAchievements: 0,
    enduranceCost: 0,
    explosionRadius: 0,
    scale: 1.0,
    rangeX: [0, 0],
    rangeY: [0, 0],
    rangeZ: [0, 0],
  },
  [BombType.MINI]: {
    name: "Mini Bomb",
    unlockAchievements: 5,
    enduranceCost: 5,
    explosionRadius: 1,
    scale: 0.7,
    rangeX: [-1, 0],
    rangeY: [-1, 0],
    rangeZ: [-1, 0],
  },
  [BombType.STANDARD]: {
    name: "Standard Bomb",
    unlockAchievements: 10,
    enduranceCost: 10,
    explosionRadius: 1.5,
    scale: 1.0,
    rangeX: [-1, 1],
    rangeY: [-1, 1],
    rangeZ: [-1, 1],
  },
  [BombType.HEAVY]: {
    name: "Heavy Bomb",
    unlockAchievements: 15,
    enduranceCost: 15,
    explosionRadius: 2,
    scale: 1.3,
    rangeX: [-2, 1],
    rangeY: [-2, 1],
    rangeZ: [-2, 1],
  },
  [BombType.MEGA]: {
    name: "Mega Bomb",
    unlockAchievements: 20,
    enduranceCost: 20,
    explosionRadius: 2.5,
    scale: 1.6,
    rangeX: [-2, 2],
    rangeY: [-2, 2],
    rangeZ: [-2, 2],
  },
  [BombType.ULTRA]: {
    name: "Ultra Bomb",
    unlockAchievements: 25,
    enduranceCost: 25,
    explosionRadius: 3,
    scale: 2.0,
    rangeX: [-3, 2],
    rangeY: [-3, 2],
    rangeZ: [-3, 2],
  },
};

/** Canonical display/iteration order of unlockable bombs. */
export const BOMB_ORDER: BombType[] = [
  BombType.MINI,
  BombType.STANDARD,
  BombType.HEAVY,
  BombType.MEGA,
  BombType.ULTRA,
];

/**
 * Achievement counts at which each unlockable bomb becomes available,
 * in ascending order. Derived from BOMB_CONFIG/BOMB_ORDER so it stays in
 * sync with the per-bomb unlockAchievements values: [5, 10, 15, 20, 25].
 */
export const UNLOCK_THRESHOLDS: number[] = BOMB_ORDER.map(
  (bombType) => BOMB_CONFIG[bombType].unlockAchievements,
);

export function getBombConfig(bombType: BombType): BombConfig {
  return BOMB_CONFIG[bombType] ?? BOMB_CONFIG[BombType.STANDARD];
}

export function isValidBombType(bombType: number): bombType is BombType {
  return bombType >= BombType.MINI && bombType <= BombType.ULTRA;
}
