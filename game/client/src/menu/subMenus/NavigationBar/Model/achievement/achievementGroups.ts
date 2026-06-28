/**
 * Canonical names of the two achievement groups that every achievement
 * category in `achievements.json` can contain.
 *
 * These string literals are the single source of truth. Consumers compose
 * their own ordered tuples from them because the required order differs by use:
 * - `AchievementTypes` (store.tsx) maps the binary/network `type` index to a
 *   group name, so its order is protocol-significant: 0 -> "types", 1 -> "thresholds".
 * - `ACHIEVEMENT_GROUPS` (Achievements.tsx) drives the grid render/iteration
 *   order, listing thresholds before types.
 *
 * Leaf module: imports nothing, so it can be imported anywhere without cycles.
 */
export const ACHIEVEMENT_GROUP_TYPES = "types";
export const ACHIEVEMENT_GROUP_THRESHOLDS = "thresholds";
