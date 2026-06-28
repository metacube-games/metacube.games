import { type T3DP } from "../../Types/T3DP";
import * as THREE from "three";
import { type RefObject } from "react";
import { CICollisionGenerator } from "./collisionsGenerator";
import { type TRenderingData } from "../../Types/TRenderingData";

export class CVoxelWorld {
  private readonly maxVal = 18;
  private readonly minVal = 3;
  sizes: number[];
  nbSideCells: number;
  cellSize: number;
  cellSliceSize: number;
  cellSize3: number;
  sizeCellX: number;
  sizeCellXY: number;
  sizeX: number;
  sizeXY: number;

  cellsCenter: T3DP[];
  static faces: {
    uvRow: number;
    dir: number[];
    corners: { pos: number[]; uv: number[] }[];
  }[];

  voxels: Int8Array | number[];
  syncVoxels: Uint8Array | number[];
  cells: Int8Array | number[];
  renderingData: TRenderingData[];
  light: Int8Array | number[];

  private readonly tempColor: THREE.Color;

  constructor(sizes: T3DP, cellSize: number, nbSideCells: T3DP) {
    this.sizes = sizes;
    this.sizeX = sizes[0];
    this.sizeXY = sizes[0] * sizes[1];
    this.nbSideCells = nbSideCells[0] * nbSideCells[1] * nbSideCells[2];
    this.cells = [];
    this.cellSize = cellSize;
    this.cellSliceSize = cellSize * cellSize;
    this.cellSize3 = cellSize * this.cellSliceSize;
    this.sizeCellX = sizes[0] / cellSize;
    this.sizeCellXY = (sizes[0] * sizes[1]) / this.cellSliceSize;
    this.voxels = [];
    this.light = [];
    this.syncVoxels = [];
    this.renderingData = [];
    this.cellsCenter = [];

    this.tempColor = new THREE.Color();
  }

  computeCellId(x: number, y: number, z: number) {
    if (
      !(
        x >= 0 &&
        x < this.sizes[0] &&
        y >= 0 &&
        y < this.sizes[1] &&
        z >= 0 &&
        z < this.sizes[2]
      )
    ) {
      return null;
    }
    const { cellSize } = this;
    const cellX = Math.floor(x / cellSize);
    const cellY = Math.floor(y / cellSize);
    const cellZ = Math.floor(z / cellSize);
    return cellX + cellY * this.sizeCellX + cellZ * this.sizeCellXY;
  }

  computeCellFromCellId(cellId: number) {
    const cellZ = Math.floor(cellId / this.sizeCellXY);
    const cellY = Math.floor(
      (cellId - cellZ * this.sizeCellXY) / this.sizeCellX,
    );
    const cellX = cellId - cellZ * this.sizeCellXY - cellY * this.sizeCellX;

    return [cellX, cellY, cellZ];
  }

  computeCellsCenter(cells: Int8Array) {
    this.cells = cells;
    for (let cellId = 0; cellId < cells.length; cellId++) {
      const [cellX, cellY, cellZ] = this.computeCellFromCellId(cellId);
      this.cellsCenter[cellId] = [
        (cellX + 0.5) * this.cellSize,
        (cellY + 0.5) * this.cellSize,
        (cellZ + 0.5) * this.cellSize,
      ];
    }
  }

  computeVoxelOffset(x: number, y: number, z: number) {
    return x + y * this.sizeX + z * this.sizeXY;
  }

  getVoxel(x: number, y: number, z: number) {
    return x < 0 ||
      x >= this.sizes[0] ||
      y < 0 ||
      y >= this.sizes[1] ||
      z < 0 ||
      z >= this.sizes[2]
      ? null
      : this.voxels[this.computeVoxelOffset(x, y, z)];
  }

  getSyncVoxel(x: number, y: number, z: number) {
    const voxelOffset = this.computeVoxelOffset(x, y, z);
    const byteOffset = Math.floor(voxelOffset / 8);
    const bitOffset = voxelOffset % 8;
    return (this.syncVoxels[byteOffset] >> bitOffset) & 1;
  }

  getCollision(x: number, y: number, z: number) {
    return (
      this.getVoxel(x, y, z) ??
      CICollisionGenerator.getCollisionsContainer(x, y, z)
    );
  }

  setVoxel(x: number, y: number, z: number, value: number) {
    const voxelOffset = this.computeVoxelOffset(x, y, z);
    this.voxels[voxelOffset] = value;
  }

  setSyncVoxel(x: number, y: number, z: number, value: number) {
    const voxelOffset = this.computeVoxelOffset(x, y, z);
    const byteOffset = Math.floor(voxelOffset / 8);
    const bitOffset = voxelOffset % 8;

    let byte = this.syncVoxels[byteOffset];
    if (value === 0) {
      byte &= ~(1 << bitOffset);
    } else {
      byte |= 1 << bitOffset;
    }
    this.syncVoxels[byteOffset] = byte;
  }

  updateVoxelGeometry(initCellId: number, x: number, y: number, z: number) {
    const updatedCellIds = [];
    const cellIdSet = new Set<number>();

    updatedCellIds.push(initCellId);
    cellIdSet.add(initCellId);

    const facesLength = CVoxelWorld.faces.length;
    for (let i = 0; i < facesLength; i++) {
      const offset = CVoxelWorld.faces[i].dir;
      const ox = x + offset[0];
      const oy = y + offset[1];
      const oz = z + offset[2];
      const cellId = this.computeCellId(ox, oy, oz);
      if (cellId !== null && !cellIdSet.has(cellId)) {
        updatedCellIds.push(cellId);
        cellIdSet.add(cellId);
      }
    }

    return updatedCellIds;
  }

  setRenderingData(currCellData: TRenderingData, cellID: number) {
    this.renderingData[cellID] = currCellData;
  }

  setLightData(lightData: Float32Array, cellID: number) {
    const currCellData = this.renderingData[cellID];
    if (!currCellData) {
      this.renderingData[cellID] = {
        colors: lightData,
        indices: new Uint32Array(),
        positions: new Int8Array(),
        normals: new Int8Array(),
        uvs: new Float32Array(),
      };
    } else {
      this.renderingData[cellID].colors = lightData;
    }
  }

  getRenderingData(): TRenderingData[] {
    return this.renderingData;
  }

  setAllCells(
    voxels: Int8Array,
    lights: Int8Array,
    syncVoxels: Uint8Array,
  ): void {
    this.voxels = voxels;
    this.light = lights;
    this.syncVoxels = syncVoxels;
  }

  getLight(x: number, y: number, z: number): T3DP {
    x = Math.floor(x);
    y = Math.floor(y);
    z = Math.floor(z);
    if (
      !(
        x >= 0 &&
        x < this.sizes[0] &&
        y >= 0 &&
        y < this.sizes[1] &&
        z >= 0 &&
        z < this.sizes[2]
      )
    ) {
      return [1, 1, 1];
    }
    const vGlobal = this.computeVoxelOffset(x, y, z) * 4;
    const vOffR = vGlobal + 1;
    const vOffG = vGlobal + 2;
    const vOffB = vGlobal + 3;
    return [
      this.getLightAtIndex(vOffR, vGlobal),
      this.getLightAtIndex(vOffG, vGlobal),
      this.getLightAtIndex(vOffB, vGlobal),
    ];
  }

  private getLightAtIndex(voxCur: number, vGlobal: number): number {
    return this.light[voxCur] > this.light[vGlobal]
      ? (this.light[voxCur] + this.minVal) / this.maxVal
      : (this.light[vGlobal] + this.minVal) / this.maxVal;
  }
  setLightAtVoxelOffset(
    voxelOffset: number,
    gl: number,
    r: number,
    g: number,
    b: number,
  ) {
    if (this.light[voxelOffset] < gl) {
      this.light[voxelOffset] = gl;
    }
    this.light[voxelOffset + 1] = r;
    this.light[voxelOffset + 2] = g;
    this.light[voxelOffset + 3] = b;
  }

  setLightToMaterial(ref: RefObject<any>, x: number, y: number, z: number) {
    const currLight = this.getLight(x, y, z);
    this.tempColor.setRGB(
      0.1 + 0.9 * currLight[0],
      0.1 + 0.9 * currLight[1],
      0.1 + 0.9 * currLight[2],
    );
    ref.current.material.color.copy(this.tempColor);
  }
  findVoxelsNear(
    x: number,
    y: number,
    z: number,
    nearX: number,
    nearY: number,
    nearZ: number,
    offYDown: number = 1,
    offYUp: number = 0,
  ): [T3DP[], T3DP[]] {
    x = Math.round(x);
    y = Math.round(y);
    z = Math.round(z);
    const boxMin: T3DP[] = [];
    const boxMax: T3DP[] = [];

    for (let xi = x - nearX; xi <= x + nearX; ++xi) {
      for (let yi = y - nearY - offYDown; yi <= y + nearY + offYUp; ++yi) {
        for (let zi = z - nearZ; zi <= z + nearZ; ++zi) {
          if (this.getCollision(xi, yi, zi)) {
            boxMin.push([xi, yi, zi]);
            boxMax.push([xi + 1, yi + 1, zi + 1]);
          }
        }
      }
    }

    return [boxMin, boxMax];
  }
}

CVoxelWorld.faces = [
  {
    // left
    uvRow: 0,
    dir: [-1, 0, 0],
    corners: [
      { pos: [0, 1, 0], uv: [0, 1] },
      { pos: [0, 0, 0], uv: [0, 0] },
      { pos: [0, 1, 1], uv: [1, 1] },
      { pos: [0, 0, 1], uv: [1, 0] },
    ],
  },
  {
    // right
    uvRow: 0,
    dir: [1, 0, 0],
    corners: [
      { pos: [1, 1, 1], uv: [0, 1] },
      { pos: [1, 0, 1], uv: [0, 0] },
      { pos: [1, 1, 0], uv: [1, 1] },
      { pos: [1, 0, 0], uv: [1, 0] },
    ],
  },
  {
    // bottom
    uvRow: 1,
    dir: [0, -1, 0],
    corners: [
      { pos: [1, 0, 1], uv: [1, 0] },
      { pos: [0, 0, 1], uv: [0, 0] },
      { pos: [1, 0, 0], uv: [1, 1] },
      { pos: [0, 0, 0], uv: [0, 1] },
    ],
  },
  {
    // top
    uvRow: 2,
    dir: [0, 1, 0],
    corners: [
      { pos: [0, 1, 1], uv: [1, 1] },
      { pos: [1, 1, 1], uv: [0, 1] },
      { pos: [0, 1, 0], uv: [1, 0] },
      { pos: [1, 1, 0], uv: [0, 0] },
    ],
  },
  {
    // back
    uvRow: 0,
    dir: [0, 0, -1],
    corners: [
      { pos: [1, 0, 0], uv: [0, 0] },
      { pos: [0, 0, 0], uv: [1, 0] },
      { pos: [1, 1, 0], uv: [0, 1] },
      { pos: [0, 1, 0], uv: [1, 1] },
    ],
  },
  {
    // front
    uvRow: 0,
    dir: [0, 0, 1],
    corners: [
      { pos: [0, 0, 1], uv: [0, 0] },
      { pos: [1, 0, 1], uv: [1, 0] },
      { pos: [0, 1, 1], uv: [0, 1] },
      { pos: [1, 1, 1], uv: [1, 1] },
    ],
  },
];

let CIWorld: CVoxelWorld;

export function getWorld(): CVoxelWorld {
  return CIWorld;
}

export function initTheWorld(
  sizes: T3DP,
  cellSize: number,
  nbSideCells: T3DP,
): void {
  CIWorld = new CVoxelWorld(sizes, cellSize, nbSideCells);
}
