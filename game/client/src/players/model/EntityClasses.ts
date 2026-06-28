import * as THREE from "three";
import { getWorld } from "../../world/model/VoxelWorld";
import { type T3DP } from "../../Types/T3DP";
import { type TCoinIndex } from "../../Types/TCoinIndex";
import { OFF_WORLD_COORD } from "../../helpers/worldBoundaries";
import { BOMB_FUSE_MS } from "../../constants/bombTypes";

const POSITIVE_DIR_MARGIN = 0.0000001;
const NEGATIVE_DIR_MARGIN = 1 + POSITIVE_DIR_MARGIN;

class CEntity {
  constructor(
    public position: T3DP,
    public velocity: T3DP,
  ) {}
}

export class CEntityGen extends CEntity {
  public lastFloorH: T3DP = [0, 0, 0];
  public lastFloorL: T3DP = [0, 0, 0];

  private collisionResult: T3DP = [0, 0, 0];
  private _world?: ReturnType<typeof getWorld>;

  private get world() {
    if (!this._world) {
      this._world = getWorld();
    }
    return this._world;
  }

  constructor(
    public hitBoxLow: T3DP,
    public hitBoxHigh: T3DP,
  ) {
    super([OFF_WORLD_COORD, OFF_WORLD_COORD, OFF_WORLD_COORD], [0, 0, 0]);
    this.initColliders();
  }

  public initColliders(): void {
    for (let i = 0; i < 3; i++) {
      const [currBoxL, currBoxH] = this.calculateBoxExtents(i);
      const floorL = Math.floor(currBoxL);
      const floorH = Math.floor(currBoxH);
      this.lastFloorL[i] = floorL;
      this.lastFloorH[i] = floorH;
    }
  }

  private calculateBoxExtents(axis: number): [number, number] {
    return [
      this.position[axis]! - this.hitBoxLow[axis]!,
      this.position[axis]! + this.hitBoxHigh[axis]!,
    ];
  }

  public translateDir(currPos: T3DP, axis: number, distance: number): boolean {
    // Sub-step to catch collisions with thin geometry at high speed.
    const steps = Math.max(1, Math.ceil(Math.abs(distance)));
    const stepSize = distance / steps;

    let dirPos = currPos[axis]!;
    let firstIter = true;

    for (let i = 0; i < steps; i++) {
      const nextPos = dirPos + stepSize;
      const collisionVoxel = this.findCollision(nextPos, axis, firstIter);
      if (collisionVoxel) {
        currPos[axis] = this.adjustPosition(stepSize, collisionVoxel, axis);
        this.updateColliderList(currPos, axis);
        return true;
      }
      dirPos = nextPos;
      firstIter = false;
    }

    currPos[axis] = dirPos;
    return false;
  }

  private updateColliderList(currPos: T3DP, axis: number): void {
    const currBoxL = currPos[axis]! - this.hitBoxLow[axis]!;
    const currBoxH = currPos[axis]! + this.hitBoxHigh[axis]!;
    this.lastFloorL[axis] = Math.floor(currBoxL);
    this.lastFloorH[axis] = Math.floor(currBoxH);
  }

  private findCollision(
    candidatePos: number,
    axis: number,
    firstIter: boolean,
  ): T3DP | false {
    const currBoxL = candidatePos - this.hitBoxLow[axis]!;
    const currBoxH = candidatePos + this.hitBoxHigh[axis]!;
    const floorL = Math.floor(currBoxL);
    const floorH = Math.floor(currBoxH);

    if (floorL !== this.lastFloorL[axis] || floorH !== this.lastFloorH[axis]) {
      this.lastFloorL[axis] = floorL;
      this.lastFloorH[axis] = floorH;
    } else if (!firstIter) {
      // Voxel range unchanged and not the first check — skip redundant test.
      return false;
    }

    for (let x = this.lastFloorL[0]; x <= this.lastFloorH[0]; x++) {
      for (let y = this.lastFloorL[1]; y <= this.lastFloorH[1]; y++) {
        for (let z = this.lastFloorL[2]; z <= this.lastFloorH[2]; z++) {
          if (this.world.getCollision(x, y, z)) {
            this.collisionResult[0] = x;
            this.collisionResult[1] = y;
            this.collisionResult[2] = z;
            return this.collisionResult;
          }
        }
      }
    }

    return false;
  }

  private adjustPosition(
    stepSize: number,
    intersectVoxel: T3DP,
    axis: number,
  ): number {
    if (stepSize > 0)
      return intersectVoxel[axis]! - this.hitBoxHigh[axis]! - POSITIVE_DIR_MARGIN;
    return intersectVoxel[axis]! + this.hitBoxLow[axis]! + NEGATIVE_DIR_MARGIN;
  }
}

export class CParticleEntity extends CEntityGen {
  scale = 1;

  constructor(
    hitBoxLow: T3DP,
    hitBoxHigh: T3DP,
    public appearsTime: number,
    public baseColor: THREE.Color,
    position: T3DP,
    velocity: T3DP,
  ) {
    super(hitBoxLow, hitBoxHigh);
    this.position = position;
    this.velocity = velocity;
  }
}

export class CCoinEntity extends CEntity {
  sumErr: T3DP = [0, 0, 0];

  constructor(
    public cIndex: TCoinIndex,
    public value: number,
    public baseColor: THREE.Color,
    position: T3DP,
    velocity: T3DP,
    public offset: T3DP,
  ) {
    super(position, velocity);
  }
}

export class CFiscEntity extends CEntity {
  sumErr: T3DP = [0, 0, 0];
  prevVel: T3DP = [0, 0, 0];
  prevErr: T3DP = [0, 0, 0];
  oldQuaternion = new THREE.Quaternion();
  public initTime: number;

  constructor(
    public hp: number,
    public moneySteal: number,
    public baseColor: THREE.Color,
    position: T3DP,
    velocity: T3DP,
    public offset: T3DP,
  ) {
    super(position, velocity);
    this.initTime = performance.now();
  }
}

export class CBombEntity extends CEntityGen {
  spawnTime: number;
  fuseTime: number = BOMB_FUSE_MS;
  explosionRadius: number = 1.5; // 3×3×3 voxel cube; overridden per bomb type in bombManager
  ownerId: string;
  hasExploded: boolean = false;
  scale: number = 1.0;
  bombType?: number; // 1=MINI, 2=STANDARD, 3=HEAVY, 4=MEGA, 5=ULTRA

  constructor(
    hitBoxLow: T3DP,
    hitBoxHigh: T3DP,
    position: T3DP,
    velocity: T3DP,
    ownerId: string,
    bombType?: number,
  ) {
    super(hitBoxLow, hitBoxHigh);
    this.position = position;
    this.velocity = velocity;
    this.ownerId = ownerId;
    this.bombType = bombType;
    this.spawnTime = performance.now();
  }
}
