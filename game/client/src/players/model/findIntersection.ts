import * as THREE from "three";
import i18n from "../../i18n/config";
import { distanceSqV3 } from "../../helpers/distance";
import { CIHUD } from "../../menu/HUD/hudInfo";
import { CISocketMng } from "../../API/socketMessagesManager";
import { CIVoxelsMng } from "../../world/model/voxelsDescription";
import { getWorld } from "../../world/model/VoxelWorld";
import { type T3DP } from "../../Types/T3DP";
import { CIPlayer } from "./playerPhysic";
import { CIAlertMng } from "../../menu/subMenus/AlertDialog";
import { CIMetacubeStates } from "../../world/model/MetacubeStates";
import { LAYER_BOUNDS } from "../../world/model/layerBounds";

type TIntersectObject = {
  type:
    | "fisc"
    | "player"
    | "voxel"
    | "voxelAggressive"
    | "voxelDefensive"
    | "layerBarrier"
    | "null";
  id: number;
  positionFloor: T3DP;
  position: T3DP;
};

export class CCollisionBox {
  type: "fisc" | "player";
  id: number;
  position: T3DP;
  min: T3DP;
  max: T3DP;
  rotationY: number;
  constructor(
    type: "fisc" | "player",
    id: number,
    position: T3DP,
    min: T3DP,
    max: T3DP,
    rotationY: number,
  ) {
    this.type = type;
    this.id = id;
    this.position = position;
    this.min = min;
    this.max = max;
    this.rotationY = rotationY;
  }
}

class CCollisionFinder {
  dir: THREE.Vector3;
  intersectList: CCollisionBox[];
  intersEntity: TIntersectObject;
  lastHittedPos: T3DP;
  public lastAggressive: T3DP = [-1, -1, -1];

  private tempDirection = new THREE.Vector3();
  private rayOrigin: T3DP = [0, 0, 0];
  private rayDir: T3DP = [0, 0, 0];
  private invDir: T3DP = [0, 0, 0];
  private tempPos: T3DP = [0, 0, 0];

  constructor() {
    this.dir = new THREE.Vector3();
    this.intersectList = [];
    this.intersEntity = {
      type: "null",
      id: 0,
      positionFloor: [0, 0, 0],
      position: [0, 0, 0],
    };

    this.lastHittedPos = [-1, -1, -1];
  }

  getVoxelInfo(currVoxelType: number): [number, string] {
    return CIVoxelsMng.getVoxelInfo(currVoxelType);
  }

  differentVoxelDetected() {
    // CHECK IF BARRIER ACTIVE AND Cancel ALERT
    if (
      this.intersEntity.type !== "layerBarrier" &&
      CIAlertMng.isCurrState(CIAlertMng.dialogs.barrier)
    ) {
      CIAlertMng.dialogs.nothing.emit();
    }

    if (this.intersEntity.type === "null") {
      CIHUD.eInfo = { name: "", hp: 0, maxHp: 0, opacity: "0" };
      return;
    }
    if (this.intersEntity.type === "voxel") {
      const currCubeType = this.intersEntity.id;
      if (currCubeType !== null && currCubeType > 0) {
        CISocketMng.sendSocketGetHp(this.intersEntity.positionFloor);
        const [cubeMaxHP, cubeName] = this.getVoxelInfo(currCubeType);
        CIHUD.eInfo.name = cubeName;
        CIHUD.eInfo.maxHp = cubeMaxHP;
        CIHUD.eInfo.opacity = "1";
      } else {
        CIHUD.eInfo = { name: "", hp: 0, maxHp: 0, opacity: "0" };
      }
    } else if (this.intersEntity.type === "player") {
      const currPlayerID = this.intersEntity.id;
      if (currPlayerID !== null) {
        CIHUD.eInfo.name = i18n.t("hud.entity.player");
        CIHUD.eInfo.hp = -1;
        CIHUD.eInfo.maxHp = -1;
        CIHUD.eInfo.opacity = "1";
      }
    } else if (this.intersEntity.type === "fisc") {
      const currFiscId = this.intersEntity.id;
      if (currFiscId !== null) {
        CIHUD.eInfo.name = i18n.t("hud.entity.fiscController");
        CIHUD.eInfo.hp = 1;
        CIHUD.eInfo.maxHp = 1;
        CIHUD.eInfo.opacity = "1";
      }
    } else if (this.intersEntity.type === "layerBarrier") {
      CIHUD.eInfo.name = i18n.t("hud.entity.layerBarrier");
      CIHUD.eInfo.hp = Infinity;
      CIHUD.eInfo.maxHp = Infinity;
      CIHUD.eInfo.opacity = "1";
    }
  }

  findIntersect(camera: THREE.Camera): void {
    this.rayOrigin[0] = camera.position.x;
    this.rayOrigin[1] = camera.position.y;
    this.rayOrigin[2] = camera.position.z;

    this.tempDirection.set(0, 0, -1).applyMatrix4(camera.matrixWorld);

    this.dir.set(0, 0, -1).applyEuler(camera.rotation);
    // Guard against zero direction components (e.g. ray along an axis): a 0
    // produces Infinity which usually still works through the slab test, but
    // a clamped sentinel keeps downstream math finite.
    this.invDir[0] = Math.abs(this.dir.x) < 1e-10 ? 1e10 : 1 / this.dir.x;
    this.invDir[1] = Math.abs(this.dir.y) < 1e-10 ? 1e10 : 1 / this.dir.y;
    this.invDir[2] = Math.abs(this.dir.z) < 1e-10 ? 1e10 : 1 / this.dir.z;

    let closestBox = 999;
    for (const currIntersect of this.intersectList) {
      let intersected = false;
      if (currIntersect.type === "player") {
        this.rayDir[0] = this.dir.x;
        this.rayDir[1] = this.dir.y;
        this.rayDir[2] = this.dir.z;
        intersected = this.intersectOrientedBox(
          currIntersect,
          this.rayOrigin,
          this.rayDir,
        );
      } else {
        intersected = this.intersectBox(
          currIntersect,
          this.rayOrigin,
          this.invDir,
        );
      }
      if (intersected) {
        const dist = distanceSqV3(...this.rayOrigin, ...currIntersect.position);
        if (dist < closestBox) {
          closestBox = dist;
          this.intersEntity.type = currIntersect.type;
          this.intersEntity.id = currIntersect.id;
        }
      }
    }
    this.intersectList = [];
    if (closestBox < 999) {
      return;
    }

    this.rayDir[0] = this.tempDirection.x;
    this.rayDir[1] = this.tempDirection.y;
    this.rayDir[2] = this.tempDirection.z;

    const intersection = this.intersectVoxel(this.rayOrigin, this.rayDir);

    if (intersection !== null) {
      // Step half a normal inward to resolve face-boundary floating-point ambiguity.
      this.tempPos[0] =
        intersection.position[0] + intersection.normal[0] * -0.5;
      this.tempPos[1] =
        intersection.position[1] + intersection.normal[1] * -0.5;
      this.tempPos[2] =
        intersection.position[2] + intersection.normal[2] * -0.5;

      const currLayer = LAYER_BOUNDS[CIMetacubeStates.currentLayer];

      const pf0 = Math.floor(this.tempPos[0]);
      const pf1 = Math.floor(this.tempPos[1]);
      const pf2 = Math.floor(this.tempPos[2]);
      if (
        !(
          pf0 < currLayer[0] ||
          pf0 >= currLayer[1] ||
          pf1 < currLayer[2] ||
          pf1 >= currLayer[3] ||
          pf2 < currLayer[4] ||
          pf2 >= currLayer[5]
        )
      ) {
        this.intersEntity = {
          type: "layerBarrier",
          id: 0,
          positionFloor: [0, 0, 0],
          position: [0, 0, 0],
        };
        return;
      }

      const orrDef = defineOrigin(intersection.position, intersection.normal);
      if (orrDef === null) {
        this.intersEntity = {
          type: "null",
          id: 0,
          positionFloor: [0, 0, 0],
          position: [0, 0, 0],
        };
        return;
      }
      const voxelAttackedType = CIVoxelsMng.getVoxelSpecialPixelMap(
        intersection.voxel,
        orrDef.side,
        orrDef.index,
      );
      if (voxelAttackedType === "voxelAggressive") {
        this.lastAggressive[0] = intersection.position[0];
        this.lastAggressive[1] = intersection.position[1];
        this.lastAggressive[2] = intersection.position[2];
      }
      this.intersEntity.type = voxelAttackedType;
      this.intersEntity.id = intersection.voxel;
      this.intersEntity.positionFloor[0] = Math.floor(this.tempPos[0]);
      this.intersEntity.positionFloor[1] = Math.floor(this.tempPos[1]);
      this.intersEntity.positionFloor[2] = Math.floor(this.tempPos[2]);
      this.intersEntity.position[0] = intersection.position[0];
      this.intersEntity.position[1] = intersection.position[1];
      this.intersEntity.position[2] = intersection.position[2];
      return;
    }
    this.intersEntity = {
      type: "null",
      id: 0,
      positionFloor: [0, 0, 0],
      position: [0, 0, 0],
    };
  }

  intersectOrientedBox(
    box: CCollisionBox,
    rayOrigin: T3DP,
    rayDir: T3DP,
  ): boolean {
    // 1) Half-extents of the box in local space.
    const halfSize: T3DP = [
      (box.max[0] - box.min[0]) * 0.5,
      (box.max[1] - box.min[1]) * 0.5,
      (box.max[2] - box.min[2]) * 0.5,
    ];

    // 2) Translate ray origin so the box centre is at the origin.
    const shiftedOrigin: T3DP = [
      rayOrigin[0] - box.position[0],
      rayOrigin[1] - box.position[1],
      rayOrigin[2] - box.position[2],
    ];

    // 3) Rotate ray by −rotationY so the box is axis-aligned in local space.
    const cosTheta = Math.cos(-box.rotationY);
    const sinTheta = Math.sin(-box.rotationY);

    const localOrigin: T3DP = [
      cosTheta * shiftedOrigin[0] - sinTheta * shiftedOrigin[2],
      shiftedOrigin[1],
      sinTheta * shiftedOrigin[0] + cosTheta * shiftedOrigin[2],
    ];

    const localDir: T3DP = [
      cosTheta * rayDir[0] - sinTheta * rayDir[2],
      rayDir[1],
      sinTheta * rayDir[0] + cosTheta * rayDir[2],
    ];

    // Clamp near-zero components to avoid 1/0 → Infinity (same guard as findIntersect).
    const invDir: T3DP = [
      Math.abs(localDir[0]) < 1e-10 ? 1e10 : 1.0 / localDir[0],
      Math.abs(localDir[1]) < 1e-10 ? 1e10 : 1.0 / localDir[1],
      Math.abs(localDir[2]) < 1e-10 ? 1e10 : 1.0 / localDir[2],
    ];

    // 4) Slab test against the local AABB [-halfSize, +halfSize].
    const minLocal: T3DP = [-halfSize[0], -halfSize[1], -halfSize[2]];
    const maxLocal: T3DP = [+halfSize[0], +halfSize[1], +halfSize[2]];

    let tmin = 0.0;
    let tmax = Number.POSITIVE_INFINITY;

    for (let i = 0; i < 3; i++) {
      const t1 = (minLocal[i] - localOrigin[i]) * invDir[i];
      const t2 = (maxLocal[i] - localOrigin[i]) * invDir[i];

      const tEntry = Math.min(t1, t2);
      const tExit = Math.max(t1, t2);

      if (tEntry > tmin) tmin = tEntry;
      if (tExit < tmax) tmax = tExit;

      if (tmax < tmin) return false;
    }

    return tmax >= 0.0;
  }

  intersectBox(b: CCollisionBox, origin: T3DP, invDir: T3DP): boolean {
    let tmin: number = 0.0;
    let tmax: number = Infinity;

    for (let i = 0; i < 3; i++) {
      const t1: number = (b.min[i] - origin[i]) * invDir[i];
      const t2: number = (b.max[i] - origin[i]) * invDir[i];

      tmin = Math.min(Math.max(t1, tmin), Math.max(t2, tmin));
      tmax = Math.max(Math.min(t1, tmax), Math.min(t2, tmax));
    }

    return tmin <= tmax;
  }

  intersectVoxel(
    start: T3DP,
    end: T3DP,
  ): { position: T3DP; normal: T3DP; voxel: number } | null {
    const world = getWorld();
    let dx = end[0] - start[0];
    let dy = end[1] - start[1];
    let dz = end[2] - start[2];
    const lenSq = dx * dx + dy * dy + dz * dz;
    const len = Math.sqrt(lenSq);

    dx /= len;
    dy /= len;
    dz /= len;
    let t = 0.0;
    let ix = Math.floor(start[0]);
    let iy = Math.floor(start[1]);
    let iz = Math.floor(start[2]);

    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;
    const stepZ = dz > 0 ? 1 : -1;

    const txDelta = Math.abs(1 / dx);
    const tyDelta = Math.abs(1 / dy);
    const tzDelta = Math.abs(1 / dz);

    const xDist = stepX > 0 ? ix + 1 - start[0] : start[0] - ix;
    const yDist = stepY > 0 ? iy + 1 - start[1] : start[1] - iy;
    const zDist = stepZ > 0 ? iz + 1 - start[2] : start[2] - iz;

    let txMax = txDelta < Infinity ? txDelta * xDist : Infinity;
    let tyMax = tyDelta < Infinity ? tyDelta * yDist : Infinity;
    let tzMax = tzDelta < Infinity ? tzDelta * zDist : Infinity;

    let steppedIndex = -1;

    while (t <= CIPlayer.attackRange.val) {
      const voxel = world.getVoxel(ix, iy, iz);
      if (voxel) {
        if (voxel > 0) {
          return {
            position: [start[0] + t * dx, start[1] + t * dy, start[2] + t * dz],
            normal: [
              steppedIndex === 0 ? -stepX : 0,
              steppedIndex === 1 ? -stepY : 0,
              steppedIndex === 2 ? -stepZ : 0,
            ],
            voxel,
          };
        }
        return null;
      }

      if (txMax < tyMax) {
        if (txMax < tzMax) {
          ix += stepX;
          t = txMax;
          txMax += txDelta;
          steppedIndex = 0;
        } else {
          iz += stepZ;
          t = tzMax;
          tzMax += tzDelta;
          steppedIndex = 2;
        }
      } else {
        if (tyMax < tzMax) {
          iy += stepY;
          t = tyMax;
          tyMax += tyDelta;
          steppedIndex = 1;
        } else {
          iz += stepZ;
          t = tzMax;
          tzMax += tzDelta;
          steppedIndex = 2;
        }
      }
    }
    return null;
  }
}

export const CICollisionFinder = new CCollisionFinder();

function defineOrigin(
  position: T3DP,
  normal: T3DP,
): { side: "side" | "up" | "down"; index: number } | null {
  const textureTileLength = 32;
  const textureTileLengthOff = textureTileLength - 1;
  const x = Math.floor(
    (position[0] - Math.floor(position[0])) * textureTileLength,
  );
  const y = Math.floor(
    textureTileLength -
      (position[1] - Math.floor(position[1])) * textureTileLength,
  );
  const z = Math.floor(
    (position[2] - Math.floor(position[2])) * textureTileLength,
  );

  if (normal[0] === 1) {
    const coordID = textureTileLengthOff - z + y * textureTileLength;
    return { side: "side", index: coordID };
  }
  if (normal[0] === -1) {
    const coordID = z + y * textureTileLength;
    return { side: "side", index: coordID };
  }
  if (normal[1] === 1) {
    const coordID =
      textureTileLengthOff - x + (textureTileLengthOff - z) * textureTileLength;
    return { side: "up", index: coordID };
  }
  if (normal[1] === -1) {
    const coordID = x + z * textureTileLength;
    return { side: "down", index: coordID };
  }
  if (normal[2] === 1) {
    const coordID = x + y * textureTileLength;
    return { side: "side", index: coordID };
  }
  if (normal[2] === -1) {
    const coordID = textureTileLengthOff - x + y * textureTileLength;
    return { side: "side", index: coordID };
  }
  return null;
}
