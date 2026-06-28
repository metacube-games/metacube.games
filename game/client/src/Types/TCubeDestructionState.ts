import { type T3DP } from "./T3DP";
import { type TCoinIndex } from "./TCoinIndex";

export type TCubeDestructionState = {
  ready: number;
  type: number;
  pos: T3DP;
  coinsIndexes: TCoinIndex[];
  newHP: number;
  fiscController: number;
  nftID: number;
};
