import { type T3DP } from "../../Types/T3DP";

/** Physical sub-cell size used by the particle managers (voxel fraction). */
export const PHYSIC_SIZE = 1 / 8;

const P_COL_SIZE = PHYSIC_SIZE / 2;

/** Collision-cell extent for a single particle, in each axis. */
export const PARTICLES_COL: T3DP = [P_COL_SIZE, P_COL_SIZE, P_COL_SIZE];
