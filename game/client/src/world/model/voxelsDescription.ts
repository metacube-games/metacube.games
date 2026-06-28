import { type T3DP } from "../../Types/T3DP";
import voxelsDescription from "../../assets/voxelsJson/offensiveCoor.json";
import dColorArray from "../../assets/voxelsJson/colorArray.json";
import voxelData from "../../envData/voxelData.json";

type TSpecialPixelMap = {
  down: {
    aggressive: number[];
  };
  up: {
    aggressive: number[];
  };
  side: {
    aggressive: number[];
  };
};

class CVoxel {
  id: number;
  name: string;
  maxHP: number;
  particlesColors: T3DP[];
  specialPixelMap: TSpecialPixelMap;

  constructor(
    id: number,
    name: string,
    maxHP: number,
    particlesColors: T3DP[],
    specialPixelMap: TSpecialPixelMap,
  ) {
    this.id = id;
    this.name = name;
    this.maxHP = maxHP;
    this.particlesColors = particlesColors;
    this.specialPixelMap = specialPixelMap;
  }
}
class CVoxelsMng {
  voxels: CVoxel[];

  constructor() {
    this.voxels = [];
    this.init();
  }

  init() {
    this.voxels.push(
      new CVoxel(
        0, //voxel.id,
        "", //voxel.type,
        0, //voxel.maxHP,
        [] as T3DP[],
        [] as unknown as TSpecialPixelMap,
      ),
    );

    voxelsDescription.forEach((voxel, index) => {
      const currentVoxel =
        voxelData[(index + 1) as unknown as keyof typeof voxelData];
      const specialPixelMap: TSpecialPixelMap = {
        down: {
          aggressive: voxel[2],
        },
        up: {
          aggressive: voxel[1],
        },
        side: {
          aggressive: voxel[0],
        },
      };
      this.voxels.push(
        new CVoxel(
          index + 1,
          currentVoxel.name,
          currentVoxel.hp,
          dColorArray.slice(index * 4, index * 4 + 4) as T3DP[],
          specialPixelMap,
        ),
      );
    });
  }

  getVoxelInfo(id: number): [number, string] {
    return [this.voxels[id]?.maxHP ?? 0, this.voxels[id]?.name ?? ""];
  }

  getVoxelColors(id: number) {
    return this.voxels[id].particlesColors;
  }

  getVoxelSpecialPixelMap(
    id: number,
    side: "down" | "up" | "side",
    coordID: number,
  ) {
    // check if coordID exists in aggressive
    const pixelMap = this.voxels[id].specialPixelMap[side];
    if (pixelMap.aggressive.includes(coordID)) {
      return "voxelAggressive";
    }

    return "voxel";
  }
}

export const CIVoxelsMng = new CVoxelsMng();
