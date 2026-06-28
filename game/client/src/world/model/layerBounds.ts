import { type T3DP } from "../../Types/T3DP";
import { getNextRandom } from "../../helpers/computedRandom";

/**
 * Per-layer metacube bounds in world coordinates:
 * [minX, maxX, minY, maxY, minZ, maxZ].
 *
 * The index is the active layer. Index 0 is a sentinel for "no layer barrier"
 * (the full, uncut cube): its inverted min/max make the in-bounds test in the
 * collision finder always evaluate false. The layer planes render each side at
 * these exact world positions, so player/world space and these values coincide.
 *
 * Single source of truth shared by the collision finder, the layer planes, and
 * the spawn logic.
 */
export const LAYER_BOUNDS: readonly [
  number,
  number,
  number,
  number,
  number,
  number,
][] = [
  [256, 0, 256, 0, 256, 0], // 0 — sentinel (full cube)
  [112, 144, 0, 32, 112, 144], // 1
  [80, 176, 0, 160, 80, 176], // 2
  [48, 208, 0, 192, 48, 208], // 3
  [32, 224, 0, 224, 32, 224], // 4
  [16, 240, 0, 240, 16, 240], // 5
];

// World grid is 0..256 on each axis; the cube is centred at 128.
const WORLD_CENTER = 128;

// How far in front of the current solid surface to drop the player, in world
// units (so the player lands just outside the cube, not inside it).
const SPAWN_GAP_MIN = 2;
const SPAWN_GAP_RANGE = 8; // -> 2..10 units outside the surface

/**
 * -Z surface of the *remaining solid* cube for the active layer.
 *
 * The metacube is mined from the outside in. At the starting layer the cube is
 * still full, so its -Z face sits at 0; finishing a layer's shell recedes the
 * surface inward to that layer's bound — which is exactly the -Z bound of the
 * next-larger layer. So the live surface for a layer is `LAYER_BOUNDS[layer+1]`'s
 * minZ, and the full/starting cube (layer >= 5 or the sentinel) sits at 0.
 *
 * NB: this is intentionally NOT `LAYER_BOUNDS[layer].minZ` — that value is the
 * inner mining *barrier*, which is still buried inside the solid cube.
 */
const solidSurfaceMinZ = (layer: number): number =>
  layer >= 1 && layer <= 4 ? LAYER_BOUNDS[layer + 1][4] : 0;

/**
 * Z just outside the current solid -Z surface, so the player spawns in the open
 * (or already-mined) space in front of the cube and follows the surface inward
 * as the cube shrinks. Used for the initial spawn (server provides x/y).
 */
export const spawnZForLayer = (layer: number): number =>
  solidSurfaceMinZ(layer) - (SPAWN_GAP_MIN + getNextRandom() * SPAWN_GAP_RANGE);

/**
 * Full spawn position centred on the current -Z face and a few units in front of
 * it. Used for respawns (no server-provided position to honour).
 */
export const spawnPositionForLayer = (layer: number): T3DP => {
  const surface = solidSurfaceMinZ(layer);
  // The face spans [surface, 256 - surface]; spread across its central 60%.
  const halfWidth = WORLD_CENTER - surface;
  const x = WORLD_CENTER + (getNextRandom() - 0.5) * halfWidth * 1.2;
  const z = surface - (SPAWN_GAP_MIN + getNextRandom() * SPAWN_GAP_RANGE);
  return [x, 2, z];
};
