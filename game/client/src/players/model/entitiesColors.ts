import { type T3DP } from "../../Types/T3DP";

export type TEntityColor = {
  fisc: T3DP[];
  opponents: T3DP[];
};
class CEntityColors {
  // voxel type data
  public entitiesColors: TEntityColor = {
    fisc: [
      [0.9375, 0.75, 0.9375],
      [0.05, 0.05, 0.05],
      [0.75, 0.75, 0.79],
      [0.6, 0.6, 0.05],
    ],
    opponents: [
      [0.05, 0.05, 0.05],
      [0.6, 0.05, 0.05],
    ],
  };

  getColors(key: keyof TEntityColor) {
    return this.entitiesColors[key];
  }
}

export const CIEntityColors = new CEntityColors();
