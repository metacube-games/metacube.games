const minX = 130;
const minY = 130;
const minZ = 155;

/** [minX, maxX, minY, maxY, minZ, maxZ] in world units (max ≈ 546). */
export const WORLD_BOUNDARIES: readonly [
  number,
  number,
  number,
  number,
  number,
  number,
] = [-minX, 386, -minY, 386, -minZ, 386];

export const LIN_POS_OFFSET_X: number = minX + 1;
export const LIN_POS_OFFSET_Y: number = minY + 1;
export const LIN_POS_OFFSET_Z: number = minZ + 1;
export const LIN_POS_RATIO: number = 120;
export const LIN_POS_RATIO_INV: number = 1 / LIN_POS_RATIO;

/**
 * Sentinel coordinate placed far outside the playable world to mark an
 * off-world / unset entity position (initial spawn, freshly connected
 * opponent, reset physics state). Used both to park meshes out of view and
 * as the "unset" marker that interpolation/movement code checks against.
 */
export const OFF_WORLD_COORD: number = -5000;

/**
 * Floor (minimum Y, in world units) of the opponent-spawner barrier region.
 * Shared by the spawner barrier mesh and the per-opponent spawn planes so the
 * region's lower bound stays in lockstep across both. The region's ceiling
 * (max Y) is intentionally NOT shared: the barrier mesh and the spawn planes
 * use slightly different ceiling values, so each keeps its own literal.
 */
export const SPAWNER_REGION_MIN_Y: number = 0;
