import React, { type Ref, useMemo } from "react";
import * as THREE from "three";
import { CCoinEntity } from "../../../players/model/EntityClasses";
import { type TINSTANCEDMESH } from "../../../Types/TINSTANCEDMESH";
import { type T3DP } from "../../../Types/T3DP";
import { type TCoinIndex } from "../../../Types/TCoinIndex";
import { type TCubeDestructionState } from "../../../Types/TCubeDestructionState";
import { CIPlayerPhys } from "../../../players/model/playerPhysic";
import { getWorld } from "../../../world/model/VoxelWorld";
import { CISoundMng } from "../../../sound/soundFX";

import coinMoneyGreyPath from "../../../assets/glb/moneyCoins/MoneyCoinGREY.glb";
import coinMoneyBluePath from "../../../assets/glb/moneyCoins/MoneyCoinBLUE.glb";
import coinMoneyGoldPath from "../../../assets/glb/moneyCoins/MoneyCoinGOLD.glb";
import coinMoneyGreenPath from "../../../assets/glb/moneyCoins/MoneyCoinGREEN.glb";
import coinMoneyPurplePath from "../../../assets/glb/moneyCoins/MoneyCoinPURPLE.glb";

import { useGLTF } from "@react-three/drei";
import { type GLTF } from "three-stdlib";
import { getNextRandom } from "../../../helpers/computedRandom";
import { X, Y, Z } from "../../../helpers/axes";
type GLTFResult = GLTF & {
  nodes: {
    Untitled: THREE.Mesh;
  };
  materials: {
    ["Material.001"]: THREE.MeshStandardMaterial;
  };
};

const KP = 3.5;
const KI = 2.5 / 60;

const maxTotCoins = 100;

const oMoney = new THREE.Object3D();
oMoney.scale.set(0.05, 0.05, 0.05);

interface TProps {
  refMoney: Ref<THREE.Group<THREE.Object3DEventMap>>;
}

const paths = [
  coinMoneyGoldPath,
  coinMoneyPurplePath,
  coinMoneyBluePath,
  coinMoneyGreenPath,
  coinMoneyGreyPath,
];

export function CoinsManager({ refMoney }: TProps) {
  return (
    <group ref={refMoney}>
      {paths.map((path, i) => (
        <SpecifiedCoin path={path} id={i as TCoinIndex} key={path} />
      ))}
    </group>
  );
}

const SpecifiedCoin = React.memo(
  ({ path, id }: { path: string; id: TCoinIndex }) => {
    const { nodes } = useGLTF(path, true, true) as unknown as GLTFResult;

    // Memoize geometry and material to avoid unnecessary recalculations
    const geometry = useMemo(
      () => nodes.Untitled.geometry as THREE.BufferGeometry,
      [nodes],
    );
    const material = useMemo(
      () => nodes.Untitled.material as THREE.MeshStandardMaterial,
      [nodes],
    );

    // Set the color attribute only once and configure the material properties.
    // The attribute wraps the manager's backing color buffer for this coin type,
    // so the per-frame update only needs to flag needsUpdate (no re-wrapping).
    useMemo(() => {
      geometry.setAttribute(
        "color",
        new THREE.InstancedBufferAttribute(
          CICoinsManager.getColorAttribute(id),
          3,
        ),
      );
      material.vertexColors = true;
      material.transparent = true;
      material.side = THREE.FrontSide;
    }, [geometry, material, id]);

    return (
      <instancedMesh
        count={maxTotCoins}
        args={[geometry, material, maxTotCoins]}
        frustumCulled={false}
        matrixAutoUpdate={false}
      />
    );
  },
);

// Preload the GLTF files in a loop for conciseness
const pathsToPreload = [
  coinMoneyGreyPath,
  coinMoneyBluePath,
  coinMoneyGoldPath,
  coinMoneyGreenPath,
  coinMoneyPurplePath,
];

pathsToPreload.forEach((path) => useGLTF.preload(path, true, true));

class CCoinsManager {
  private entityList: CCoinEntity[] = [];
  private toRemove: Set<number> = new Set();
  private baseValues: number[] = [100000, 10000, 500, 20, 1];
  private cache: { [key: number]: number[] } = {};

  private colorAttributes: { [key: number]: Float32Array } = {};
  private coinPool: CCoinEntity[] = [];
  private colorPool: THREE.Color[] = [];

  constructor() {
    for (let i = 0; i < this.baseValues.length; i++) {
      this.colorAttributes[i] = new Float32Array(maxTotCoins * 3);
    }
    for (let i = 0; i < maxTotCoins; i++) {
      this.colorPool.push(new THREE.Color(1, 1, 1));
      this.coinPool.push(
        new CCoinEntity(
          0,
          0,
          new THREE.Color(1, 1, 1),
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ),
      );
    }
  }

  // Backing color buffer the update loop writes into for a given coin type.
  // The geometry's color attribute is wired to wrap this same array at mount.
  getColorAttribute(cIndex: number): Float32Array {
    return this.colorAttributes[cIndex];
  }

  generateIndex(remaining: number): number[] {
    const list = this.generateList(remaining);
    return list.map((value) => this.baseValues.indexOf(value));
  }

  private generateList(remaining: number): number[] {
    if (remaining === 0) return [];
    if (this.cache[remaining]) return this.cache[remaining];

    let bestList: number[] = [];
    for (const value of this.baseValues) {
      if (remaining >= value) {
        const newList = [value, ...this.generateList(remaining - value)];
        if (!bestList.length || newList.length < bestList.length) {
          bestList = newList;
        }
      }
    }

    this.cache[remaining] = bestList;
    return bestList;
  }

  init(cubeDestroyed: TCubeDestructionState) {
    const cubePos = cubeDestroyed.pos;
    const coinsAttributes = cubeDestroyed.coinsIndexes;
    this.removeExceedingCoins(coinsAttributes.length);
    this.addEntities(coinsAttributes, cubePos);
  }

  private removeExceedingCoins(coinsToAdd: number) {
    const exceedingP = this.entityList.length + coinsToAdd - maxTotCoins;
    if (exceedingP > 0) {
      for (let i = 0; i < exceedingP; i++) {
        this.sendMoneyGetEvent(i);
      }
      this.removeDisappearingCoins();
    }
  }

  private sendMoneyGetEvent(i: number) {
    const entity = this.entityList[i];
    if (entity?.value) {
      CISoundMng?.soundsFx.moneyGained.updateSound(entity.position);
      this.toRemove.add(i);
    }
  }

  private addEntities(coinsAttributes: TCoinIndex[], cubePos: T3DP) {
    coinsAttributes.forEach((cIndex) =>
      this.addEntity(cIndex, cubePos, this.baseValues[cIndex]),
    );
  }

  private addEntity(cIndex: TCoinIndex, cubePos: T3DP, value: number) {
    const pos: T3DP = [
      cubePos[0] + getNextRandom(),
      cubePos[1] + getNextRandom(),
      cubePos[2] + getNextRandom(),
    ];

    const vel: T3DP = [
      (getNextRandom() - 0.5) * 0.05,
      -getNextRandom() * 2 - 1,
      (getNextRandom() - 0.5) * 0.05,
    ];

    const offset: T3DP = [
      0.1 * getNextRandom() - 0.05,
      0.1 * getNextRandom() - 0.05,
      0.1 * getNextRandom() - 0.05,
    ];

    let coin: CCoinEntity;
    let color: THREE.Color;

    if (this.coinPool.length > 0) {
      coin = this.coinPool.pop()!;
      color = this.colorPool.pop()!;
      coin.cIndex = cIndex;
      coin.value = value;
      coin.position[0] = pos[0];
      coin.position[1] = pos[1];
      coin.position[2] = pos[2];
      coin.velocity[0] = vel[0];
      coin.velocity[1] = vel[1];
      coin.velocity[2] = vel[2];
      coin.offset[0] = offset[0];
      coin.offset[1] = offset[1];
      coin.offset[2] = offset[2];
      coin.sumErr = [0, 0, 0];
      color.setRGB(1, 1, 1);
      coin.baseColor = color;
    } else {
      // Fallback if pool is exhausted (shouldn't happen with maxTotCoins limit)
      coin = new CCoinEntity(
        cIndex,
        value,
        new THREE.Color(1, 1, 1),
        pos,
        vel,
        offset,
      );
    }

    this.entityList.push(coin);
  }

  update(moneyRef: THREE.Group, delta: number) {
    const nbEntityPerIndex: { [key: number]: number } = {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
    };
    const pPos = CIPlayerPhys.position;

    this.entityList.forEach((entity, _index) => {
      const cIndex = entity.cIndex;
      this.updateCoinPosition(pPos, entity, delta);

      oMoney.position.set(...entity.position);
      oMoney.rotation.x += delta / 1.5;
      oMoney.rotation.y += delta / 1.5;
      oMoney.rotation.z += delta / 1.5;
      oMoney.updateMatrix();

      const currInstance = moneyRef.children[cIndex] as TINSTANCEDMESH;
      currInstance.setMatrixAt(nbEntityPerIndex[cIndex], oMoney.matrix);
      this.updateCoinColor(entity, nbEntityPerIndex[cIndex], cIndex);

      nbEntityPerIndex[cIndex] += 1;
    });

    // Update coin instance matrices and colors in batches
    for (let cIndex = 0; cIndex < this.baseValues.length; cIndex++) {
      const currInstance = moneyRef.children[cIndex] as TINSTANCEDMESH;
      if (this.entityList.length === 0 && currInstance.count === 0) continue;

      // The color attribute already wraps this.colorAttributes[cIndex] (wired at
      // mount), and updateCoinColor wrote this frame's values into it; only flag
      // the GPU upload here instead of re-wrapping into a fresh attribute.
      currInstance.count = nbEntityPerIndex[cIndex];
      currInstance.instanceMatrix.needsUpdate = true;
      currInstance.geometry.attributes.color.needsUpdate = true;
    }

    this.removeDisappearingCoins();
  }

  private updateCoinPosition(pPos: T3DP, entity: CCoinEntity, delta: number) {
    for (let j = 0; j < 3; j++) {
      const err = pPos[j] - entity.position[j] - entity.offset[j];
      entity.sumErr[j] = Math.max(-10, Math.min(10, entity.sumErr[j] + err));
      entity.velocity[j] = KP * err + KI * entity.sumErr[j];
      entity.position[j] += entity.velocity[j] * delta;
    }

    if (this.collidedWithPlayer(entity, pPos)) {
      this.sendMoneyGetEvent(this.entityList.indexOf(entity));
    }
  }

  private collidedWithPlayer(entity: CCoinEntity, pPos: T3DP): boolean {
    return (
      Math.abs(entity.position[X] - pPos[X]) < 0.3 &&
      Math.abs(entity.position[Y] - pPos[Y]) < 0.3 &&
      Math.abs(entity.position[Z] - pPos[Z]) < 0.3
    );
  }

  private updateCoinColor(
    currEntity: CCoinEntity,
    index: number,
    cIndex: TCoinIndex,
  ) {
    const light = getWorld().getLight(...currEntity.position);
    const colorArray = this.colorAttributes[cIndex];

    colorArray[index * 3] = light[0];
    colorArray[index * 3 + 1] = light[1];
    colorArray[index * 3 + 2] = light[2];
  }

  private removeDisappearingCoins() {
    // Descending order prevents index shifting during splice.
    const indicesToRemove = Array.from(this.toRemove).sort((a, b) => b - a);

    for (const index of indicesToRemove) {
      const coin = this.entityList[index];
      this.coinPool.push(coin);
      this.colorPool.push(coin.baseColor);
      this.entityList.splice(index, 1);
    }
    this.toRemove.clear();
  }
}

export const CICoinsManager = new CCoinsManager();
