import React, { type RefObject, useEffect } from "react";
import * as THREE from "three";
import { CParticleEntity } from "../../../players/model/EntityClasses";
import { getWorld } from "../../../world/model/VoxelWorld";
import { type T3DP } from "../../../Types/T3DP";
import { type TINSTANCEDMESH } from "../../../Types/TINSTANCEDMESH";
import { CIVoxelsMng } from "../../../world/model/voxelsDescription";
import {
  CIEntityColors,
  type TEntityColor,
} from "../../../players/model/entitiesColors";
import { getNextRandom } from "../../../helpers/computedRandom";
import { X, Y, Z } from "../../../helpers/axes";

const DECELERATIONY = -9.8 * 4.5;
const DECELERATIONXZ = -9.8 * 0.8;
const MaxParticles = 2000;
const VAR_PARTICLES = 5;

const DISAPEARS_TIME = 2500;

interface TProps {
  refParticles: RefObject<TINSTANCEDMESH>;
  meshPhong: THREE.Material;
  particleType: "plane" | "box";
  physicSize: number;
}

export const ParticlesManager = React.memo(
  ({ refParticles, meshPhong, particleType, physicSize }: TProps) => {
    const pColorArray = Array.from({ length: MaxParticles * 3 }, () => 1);
    const typedColorArray = new Float32Array(pColorArray);

    useEffect(() => {
      if (!refParticles.current) return;
      refParticles.current.count = 0;
      refParticles.current.instanceMatrix.needsUpdate = true;
      refParticles.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }, [refParticles]);
    return (
      <>
        <instancedMesh
          ref={refParticles}
          args={[undefined, meshPhong, MaxParticles]}
          frustumCulled={false}
          matrixAutoUpdate={false}
        >
          {particleType === "plane" ? (
            <planeGeometry attach="geometry" args={[physicSize, physicSize]}>
              <instancedBufferAttribute
                attach={"attributes-color"}
                args={[typedColorArray, 3]}
                usage={THREE.DynamicDrawUsage}
              />
            </planeGeometry>
          ) : (
            <boxGeometry
              attach="geometry"
              args={[physicSize, physicSize, physicSize]}
            >
              <instancedBufferAttribute
                attach={"attributes-color"}
                args={[typedColorArray, 3]}
                usage={THREE.DynamicDrawUsage}
              />
            </boxGeometry>
          )}
        </instancedMesh>
      </>
    );
  },
);
export class CParticlesManager {
  private hBox: T3DP;
  private entityList: CParticleEntity[] = [];
  private toRemove: number[] = [];
  private objectM: THREE.Object3D = new THREE.Object3D();
  private particleType: string;
  private minParticles: number;
  private posOffset: T3DP = [0, 0, 0];
  private tempLightColor: THREE.Color = new THREE.Color();
  private tempFinalColor: THREE.Color = new THREE.Color();
  private particlePool: CParticleEntity[] = [];
  private colorPool: THREE.Color[] = [];

  constructor(partCol: T3DP, minParticles: number, particleType: string) {
    this.hBox = partCol;
    this.particleType = particleType;
    this.minParticles = minParticles;
    if (particleType === "plane") {
      this.posOffset = [0.5, 0.7, 0.5];
    }

    for (let i = 0; i < MaxParticles; i++) {
      this.particlePool.push(
        new CParticleEntity(
          this.hBox,
          this.hBox,
          0,
          new THREE.Color(1, 1, 1),
          [0, 0, 0],
          [0, 0, 0],
        ),
      );
      this.colorPool.push(new THREE.Color(1, 1, 1));
    }
  }

  init(pos: T3DP, type: number | keyof TEntityColor) {
    // generate a random number of particles between 10 and 16
    const colors =
      typeof type === "number"
        ? CIVoxelsMng.getVoxelColors(type)
        : CIEntityColors.getColors(type);

    const particlesToAdd = Math.round(
      getNextRandom() * VAR_PARTICLES + this.minParticles,
    );
    this.removeExceedingParticles(particlesToAdd);
    this.addEntities(colors, pos, particlesToAdd);
  }

  private addEntities(colors: T3DP[], pos: T3DP, particlesToAdd: number) {
    for (let i = 0; i < particlesToAdd; i++) {
      this.addEntity(pos, colors);
    }
  }

  private removeExceedingParticles(particlesToAdd: number) {
    // More aggressively remove particles if we're getting close to the limit
    const currentTotal = this.entityList.length + particlesToAdd;
    if (currentTotal > MaxParticles * 0.9) {
      // Remove enough particles to stay under 90% of buffer capacity
      const toRemove = Math.max(
        currentTotal - Math.floor(MaxParticles * 0.9),
        0,
      );
      if (toRemove > 0) {
        const removed = this.entityList.splice(0, toRemove);
        for (const p of removed) {
          this.particlePool.push(p);
          this.colorPool.push(p.baseColor);
        }
      }
    }
  }

  private addEntity(cubePos: T3DP, colors: T3DP[]) {
    const dTime = performance.now() + (getNextRandom() - 0.5) * 1000;

    const pos: T3DP = [
      cubePos[0] + this.posOffset[0],
      cubePos[1] + this.posOffset[1],
      cubePos[2] + this.posOffset[2],
    ];
    const vel: T3DP = [
      10 * (getNextRandom() - 0.5),
      getNextRandom() * 2.5 + 2.25,
      10 * (getNextRandom() - 0.5),
    ];

    let particle: CParticleEntity;
    let color: THREE.Color;

    if (this.particlePool.length > 0) {
      particle = this.particlePool.pop()!;
      color = this.colorPool.pop()!;
      particle.position[0] = pos[0];
      particle.position[1] = pos[1];
      particle.position[2] = pos[2];
      particle.velocity[0] = vel[0];
      particle.velocity[1] = vel[1];
      particle.velocity[2] = vel[2];
      particle.appearsTime = dTime;
      particle.scale = 1;
    } else {
      // Fallback if pool is exhausted (shouldn't happen with MaxParticles limit)
      color = new THREE.Color(1, 1, 1);
      particle = new CParticleEntity(
        this.hBox,
        this.hBox,
        dTime,
        color,
        pos,
        vel,
      );
    }

    // Set color (reusing color object)
    const currColors =
      colors[Math.floor(getNextRandom() * 0.99 * colors.length)];
    color.setRGB(
      Math.max(0, Math.min(1, currColors[0] + (getNextRandom() - 0.5) * 0.01)),
      Math.max(0, Math.min(1, currColors[1] + (getNextRandom() - 0.5) * 0.01)),
      Math.max(0, Math.min(1, currColors[2] + (getNextRandom() - 0.5) * 0.01)),
    );
    particle.baseColor = color;

    this.entityList.push(particle);
  }

  update(refParticles: TINSTANCEDMESH, delta: number, camera: THREE.Camera) {
    if (this.particleType === "plane") {
      this.objectM.quaternion.copy(camera.quaternion);
    }

    // Ensure we don't exceed buffer limits
    const maxParticlesToRender = Math.min(this.entityList.length, MaxParticles);

    for (let i = 0; i < maxParticlesToRender; i++) {
      const currEntity = this.entityList[i];
      if (performance.now() - currEntity.appearsTime > DISAPEARS_TIME) {
        if (this.fadeOutParticles(i, currEntity)) continue;
      } else {
        currEntity.scale = 1;
      }
      this.updateParticles(refParticles, delta, i, currEntity);
    }

    if (this.entityList.length === 0 && refParticles.count === 0) return;

    // Set count to the safe maximum number of particles
    refParticles.count = maxParticlesToRender;
    refParticles.instanceMatrix.needsUpdate = true;

    if (refParticles.geometry.attributes.color) {
      refParticles.geometry.attributes.color.needsUpdate = true;
    }

    this.removeDisappearingParticles();
  }

  private removeDisappearingParticles() {
    // Descending order prevents index shifting during splice.
    this.toRemove.sort((a, b) => b - a);

    for (const index of this.toRemove) {
      const particle = this.entityList[index];
      this.particlePool.push(particle);
      this.colorPool.push(particle.baseColor);
      this.entityList.splice(index, 1);
    }
    this.toRemove = [];
  }

  private fadeOutParticles(index: number, currEntity: CParticleEntity) {
    currEntity.scale = THREE.MathUtils.lerp(currEntity.scale, 0, 0.25);
    if (currEntity.scale < 0.01) {
      this.addEntityToRemove(index);
      return true;
    }
    return false;
  }

  private addEntityToRemove(index: number) {
    this.toRemove.push(index);
  }

  private updateParticles(
    refParticles: TINSTANCEDMESH,
    delta: number,
    index: number,
    currEntity: CParticleEntity,
  ) {
    this.objectM.scale.setScalar(currEntity.scale);
    this.updateParticlePosition(delta, currEntity);
    this.updateParticleColor(refParticles, currEntity, index);
    this.objectM.position.set(...currEntity.position);
    this.objectM.updateMatrix();
    refParticles.setMatrixAt(index, this.objectM.matrix);
  }

  private updateParticlePosition(delta: number, currEntity: CParticleEntity) {
    const currVel = currEntity.velocity;
    const currPos = currEntity.position;
    for (const dir of [X, Z]) {
      currVel[dir] = this.getUpdatedVelocity(
        currVel[dir],
        DECELERATIONXZ,
        delta,
      );
      const displacement = currVel[dir] * delta;
      currEntity.translateDir(currPos, dir, displacement);
    }
    currVel[Y] += DECELERATIONY * delta;
    const displacement = currVel[Y] * delta;
    const collided = currEntity.translateDir(currPos, Y, displacement);
    if (collided) {
      this.bounceProprety(currVel, Y);
    }
  }

  private getUpdatedVelocity(
    velocity: number,
    deceleration: number,
    delta: number,
  ) {
    return velocity > 0
      ? Math.max(0, velocity + deceleration * delta)
      : Math.min(0, velocity - deceleration * delta);
  }

  private updateParticleColor(
    refParticles: TINSTANCEDMESH,
    currEntity: CParticleEntity,
    index: number,
  ) {
    const lightValues = getWorld().getLight(...currEntity.position);
    this.tempLightColor.setRGB(lightValues[0], lightValues[1], lightValues[2]);
    this.tempFinalColor
      .copy(currEntity.baseColor)
      .multiply(this.tempLightColor);
    const refCurrColor = refParticles.geometry.attributes
      .color as THREE.BufferAttribute;
    refCurrColor.setXYZ(
      index,
      this.tempFinalColor.r,
      this.tempFinalColor.g,
      this.tempFinalColor.b,
    );
  }

  private bounceProprety(currVelocity: number[], dir: number) {
    if (Math.abs(currVelocity[dir]) > 5.5) {
      currVelocity[dir] = -currVelocity[dir] * 0.5;
    } else {
      currVelocity[dir] = 0;
    }
  }
}
