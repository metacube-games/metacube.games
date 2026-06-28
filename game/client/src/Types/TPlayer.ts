import { type T3DP } from "./T3DP";

export type TPlayer = {
  newPos: number[];
  oldPos: number[];
  posDiff: number[];
  newPackageTime: number;
  oldPackageTime: number;
  invTimeDiff: number;
  recompute: boolean;
  username: string;
  textID: number | null;
  hammerRot: number;
  hammerTrans: number;
  hammerOffset: number;
  placedPos?: T3DP;
  skinId: number;
  interpolatedPos?: number[];
};
