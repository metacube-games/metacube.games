import { CBombEntity } from "../../players/model/EntityClasses";
import { type T3DP } from "../../Types/T3DP";
import { CIPlayer, CIPlayerPhys } from "../../players/model/playerPhysic";
import { CISocketMng } from "../../API/socketMessagesManager";
import { CISoundMng } from "../../sound/soundFX";
import { CICameraShake } from "../../players/components/cameraShake";
import { getWorld } from "../model/VoxelWorld";
import emitter from "../../helpers/EventEmitter";
import {
  BombType,
  getBombConfig,
  isValidBombType,
} from "../../constants/bombTypes";

class CBombManager {
  private activeBombs: Map<string, CBombEntity> = new Map();
  private nextBombId: number = 0;

  // 0.4-unit cube hitbox, bottom edge flush with the ground.
  private readonly BOMB_HITBOX_LOW: T3DP = [-0.2, 0, -0.2];
  private readonly BOMB_HITBOX_HIGH: T3DP = [0.2, 0.4, 0.2];

  private readonly GRAVITY = -9.8 * 6.3; // matches player gravity

  placeBomb(
    playerPos: T3DP,
    playerId: string,
    bombType: BombType = BombType.STANDARD,
  ): boolean {
    if (!isValidBombType(bombType)) {
      console.warn(
        `[Bomb] Invalid bomb type: ${bombType}, defaulting to STANDARD`,
      );
      bombType = BombType.STANDARD;
    }

    const bombConfig = getBombConfig(bombType);

    const existingBomb = this.getPlayerBomb(playerId);
    if (existingBomb !== null) {
      this.playFailSound();
      return false;
    }

    const enduranceCost = bombConfig.enduranceCost;
    if (CIPlayer.endurance.val.curr < enduranceCost) {
      this.playFailSound();
      return false;
    }

    CIPlayer.endurance.val.curr -= enduranceCost;
    CIPlayer.endurance.sendEvent();

    // X and Z floored and re-centred so the bomb aligns to the voxel grid.
    const bombPos: T3DP = [
      Math.floor(playerPos[0]) + 0.5,
      playerPos[1] - 0.5,
      Math.floor(playerPos[2]) + 0.5,
    ];

    const bomb = new CBombEntity(
      this.BOMB_HITBOX_LOW,
      this.BOMB_HITBOX_HIGH,
      bombPos,
      [0, 0, 0],
      playerId,
      bombType,
    );

    bomb.scale = bombConfig.scale;

    const bombId = `${playerId}_${this.nextBombId++}`;
    this.activeBombs.set(bombId, bomb);

    CISocketMng.sendPlaceBomb(bombPos, bombType);
    CISoundMng?.soundsFx.bombSpawn.updateSound(bombPos);

    return true;
  }

  placeBombRemote(
    bombPos: T3DP,
    playerId: string,
    bombType: BombType = BombType.STANDARD,
  ): boolean {
    if (!isValidBombType(bombType)) {
      console.warn(
        `[Bomb] Invalid remote bomb type: ${bombType}, defaulting to STANDARD`,
      );
      bombType = BombType.STANDARD;
    }

    const bombConfig = getBombConfig(bombType);

    const existingBomb = this.getPlayerBomb(playerId);
    if (existingBomb !== null) {
      return false;
    }

    const bomb = new CBombEntity(
      this.BOMB_HITBOX_LOW,
      this.BOMB_HITBOX_HIGH,
      bombPos,
      [0, 0, 0],
      playerId,
      bombType,
    );

    bomb.scale = bombConfig.scale;

    const bombId = `${playerId}_${this.nextBombId++}`;
    this.activeBombs.set(bombId, bomb);

    CISoundMng?.soundsFx.bombSpawn.updateSound(bombPos);

    return true;
  }

  triggerRemoteExplosion(bombPos: T3DP, playerId: string) {
    const bomb = this.getPlayerBomb(playerId);
    if (bomb) {
      bomb.hasExploded = true;

      for (const [bombId, b] of this.activeBombs) {
        if (b === bomb) {
          setTimeout(() => {
            this.activeBombs.delete(bombId);
          }, 100);
          break;
        }
      }
    }

    const bombType = bomb?.bombType ?? BombType.STANDARD;
    const bombConfig = getBombConfig(bombType);

    try {
      this.triggerExplosionEffects(bombPos, bombConfig.scale);
      this.triggerExplosionFlames(bombPos, bombType);
      const radius = bomb?.explosionRadius ?? bombConfig.explosionRadius;
      this.applyLocalKnockback(bombPos, radius);
    } catch (error) {
      console.error(`[Bomb] Error triggering remote explosion effects:`, error);
    }
  }

  update(delta: number) {
    for (const [, bomb] of this.activeBombs) {
      if (bomb.hasExploded) continue;

      bomb.velocity[1] += this.GRAVITY * delta;

      bomb.translateDir(bomb.position, 0, bomb.velocity[0] * delta);
      bomb.translateDir(bomb.position, 2, bomb.velocity[2] * delta);
      const collisionY = bomb.translateDir(
        bomb.position,
        1,
        bomb.velocity[1] * delta,
      );

      if (collisionY) {
        bomb.velocity[1] = 0;
      }
      // Fuse is tracked server-side; BOMB_EXPLODED message drives detonation.
    }
  }

  private hasLineOfSight(from: T3DP, toVoxel: T3DP): boolean {
    const CIVoxelWorld = getWorld();

    const fromVoxel: T3DP = [
      Math.floor(from[0]),
      Math.floor(from[1]),
      Math.floor(from[2]),
    ];

    if (
      fromVoxel[0] === toVoxel[0] &&
      fromVoxel[1] === toVoxel[1] &&
      fromVoxel[2] === toVoxel[2]
    ) {
      return true;
    }

    const dx = toVoxel[0] - fromVoxel[0];
    const dy = toVoxel[1] - fromVoxel[1];
    const dz = toVoxel[2] - fromVoxel[2];

    const steps = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
    if (steps <= 1) {
      return true;
    }

    for (let step = 1; step < steps; step++) {
      const ratio = step / steps;
      const checkX = Math.floor(fromVoxel[0] + dx * ratio);
      const checkY = Math.floor(fromVoxel[1] + dy * ratio);
      const checkZ = Math.floor(fromVoxel[2] + dz * ratio);

      const voxelType = CIVoxelWorld.getVoxel(checkX, checkY, checkZ);
      if (voxelType && voxelType > 0) {
        return false;
      }
    }

    return true;
  }

  private applyLocalKnockback(explosionCenter: T3DP, radius: number) {
    const playerPos = CIPlayerPhys.position;

    const dx = playerPos[0] - explosionCenter[0];
    const dy = playerPos[1] - explosionCenter[1];
    const dz = playerPos[2] - explosionCenter[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance > radius * 2) return; // knockback radius is 2× explosion radius

    const knockback = this.calculateKnockback(
      explosionCenter,
      playerPos,
      radius,
    );

    CIPlayerPhys.damageRebound(knockback, 0);
  }

  private calculateKnockback(
    explosionCenter: T3DP,
    targetPos: T3DP,
    radius: number,
  ): [number, number, number] {
    const dx = targetPos[0] - explosionCenter[0];
    const dy = targetPos[1] - explosionCenter[1];
    const dz = targetPos[2] - explosionCenter[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance < 0.1) {
      return [0, 90, 0]; // directly on bomb: launch straight up
    }

    const dirX = dx / distance;
    const dirY = dy / distance;
    const dirZ = dz / distance;

    const strength = Math.max(0, 1 - distance / (radius * 2)) * 150;

    return [
      dirX * strength * 1.7,
      dirY * strength * 0.8,
      dirZ * strength * 1.7,
    ];
  }

  private triggerExplosionEffects(pos: T3DP, scale: number = 1.0) {
    try {
      if (CISoundMng?.soundsFx?.bombExplode) {
        CISoundMng.soundsFx.bombExplode.updateSound(pos);
      }

      if (CIPlayerPhys?.position && CICameraShake) {
        const playerPos = CIPlayerPhys.position;
        const dx = playerPos[0] - pos[0];
        const dy = playerPos[1] - pos[1];
        const dz = playerPos[2] - pos[2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        const maxShakeDistance = 15 * scale;
        if (distance < maxShakeDistance) {
          const baseIntensity = 0.5 * scale;
          const intensity = (1 - distance / maxShakeDistance) * baseIntensity;
          CICameraShake.addTrauma(intensity);
        }
      }
    } catch (error) {
      console.error("[Bomb] Error in triggerExplosionEffects:", error);
    }
  }

  private triggerExplosionFlames(
    center: T3DP,
    bombType: BombType = BombType.STANDARD,
  ) {
    const flamePositions: T3DP[] = [];
    const centerVoxel: T3DP = [
      Math.floor(center[0]),
      Math.floor(center[1]),
      Math.floor(center[2]),
    ];

    const bombConfig = getBombConfig(bombType);
    const [minX, maxX] = bombConfig.rangeX;
    const [minY, maxY] = bombConfig.rangeY;
    const [minZ, maxZ] = bombConfig.rangeZ;

    for (let dx = minX; dx <= maxX; dx++) {
      for (let dy = minY; dy <= maxY; dy++) {
        for (let dz = minZ; dz <= maxZ; dz++) {
          const voxelPos: T3DP = [
            centerVoxel[0] + dx,
            centerVoxel[1] + dy,
            centerVoxel[2] + dz,
          ];

          if (!this.hasLineOfSight(centerVoxel, voxelPos)) {
            continue;
          }

          flamePositions.push(voxelPos);
        }
      }
    }

    emitter.emit("explosionFlames", flamePositions);
  }

  private playFailSound() {
    CISoundMng?.soundsFx.upgradeOFM.updateSound();
  }

  private getPlayerBomb(playerId: string): CBombEntity | null {
    for (const bomb of this.activeBombs.values()) {
      if (bomb.ownerId === playerId) {
        return bomb;
      }
    }
    return null;
  }

  hasActiveBomb(playerId: string): boolean {
    return this.getPlayerBomb(playerId) !== null;
  }

  removePlayerBombs(playerId: string) {
    const toRemove: string[] = [];

    for (const [bombId, bomb] of this.activeBombs) {
      if (bomb.ownerId === playerId) {
        toRemove.push(bombId);
      }
    }

    toRemove.forEach((id) => this.activeBombs.delete(id));
  }

  getActiveBombs(): CBombEntity[] {
    return Array.from(this.activeBombs.values());
  }
}

export const CIBombManager = new CBombManager();
