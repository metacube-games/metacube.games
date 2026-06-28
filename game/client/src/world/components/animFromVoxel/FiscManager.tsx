import { PHYSIC_SIZE, PARTICLES_COL } from "../../../world/model/voxelConstants";
import { type RefObject, useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei"; // Updated import
import * as THREE from "three";
import fiscPath from "../../../assets/glb/FiscControlleur.glb";
import fiscSleepPath from "../../../assets/glb/FiscControlleurClosed.glb";
import { type T3DP } from "../../../Types/T3DP";
import { type TCubeDestructionState } from "../../../Types/TCubeDestructionState";
import { CIPlayer, CIPlayerPhys } from "../../../players/model/playerPhysic";
import {
  CCollisionBox,
  CICollisionFinder,
} from "../../../players/model/findIntersection";
import { CISocketMng } from "../../../API/socketMessagesManager";
import { CFiscEntity } from "../../../players/model/EntityClasses";
import { CParticlesManager, ParticlesManager } from "./ParticlesManager";
import { useFrame } from "@react-three/fiber";
import { type TINSTANCEDMESH } from "../../../Types/TINSTANCEDMESH";
import { CISoundMng } from "../../../sound/soundFX";
import { SGG } from "../../../menu/useGeneralStore";
import { setDeep } from "../../../menu/subMenus/NavigationBar/Model/notifTips/store";
import { getNextRandom } from "../../../helpers/computedRandom";
import { OFF_WORLD_COORD } from "../../../helpers/worldBoundaries";
import { X, Y, Z } from "../../../helpers/axes";
const CIFiscParticleManager = new CParticlesManager(PARTICLES_COL, 15, "box");

const SCALE = 0.5;
const PI_2 = Math.PI / 2;
const LEG_TRANSLATE = 0.13 * SCALE;
const LEG_TRANSLATE_2 = -2 * LEG_TRANSLATE;
const LEG_TRANSLATE_Y = -0.66 * SCALE;

const integralLimit = 12;
const filterGain = 0.05;

const KP = 6;
const KI = 1.2 / 60;
const KD = 1 / 60;
const maxSpeed = 4.5;

const maxTotalFisc = 8;

const oDefault = new THREE.Object3D();
oDefault.position.set(OFF_WORLD_COORD, OFF_WORLD_COORD, OFF_WORLD_COORD);
oDefault.updateMatrix();

interface TProps {
  refBody: RefObject<TINSTANCEDMESH>;
  refHeadSleep: RefObject<TINSTANCEDMESH>;
  refLeg: RefObject<TINSTANCEDMESH>;
}

export function FiscController({ refBody, refHeadSleep, refLeg }: TProps) {
  const { nodes } = useGLTF(fiscPath, true, true) as any;
  const { nodes: nodesSleep } = useGLTF(fiscSleepPath, true, true) as any;
  nodes.body.material.side = THREE.FrontSide;
  nodes.leg_left.material.side = THREE.FrontSide;
  nodes.leg_right.material.side = THREE.FrontSide;
  nodesSleep.body.material.side = THREE.FrontSide;

  useEffect(() => {
    if (!refBody.current || !refHeadSleep.current || !refLeg.current) return;
    refBody.current.count = 0;
    refHeadSleep.current.count = 0;
    refLeg.current.count = 0;
    refBody.current.instanceMatrix.needsUpdate = true;
    refHeadSleep.current.instanceMatrix.needsUpdate = true;
    refLeg.current.instanceMatrix.needsUpdate = true;

    refBody.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    refHeadSleep.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    refLeg.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, [refBody, refLeg, refHeadSleep]);

  const refParticles = useRef<TINSTANCEDMESH>(null!);

  const sharedSMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    toneMapped: false,
    side: THREE.FrontSide,
  });

  useFrame((state, delta) => {
    const camera = state.camera;
    CIFiscParticleManager.update(refParticles.current, delta, camera);
  }, 3);

  return (
    <>
      <instancedMesh
        ref={refBody}
        args={[nodes.body.geometry, nodes.body.material, maxTotalFisc]}
        frustumCulled={false}
        matrixAutoUpdate={false}
      />
      <instancedMesh
        ref={refHeadSleep}
        args={[
          nodesSleep.body.geometry,
          nodesSleep.body.material,
          maxTotalFisc,
        ]}
        frustumCulled={false}
        matrixAutoUpdate={false}
      ></instancedMesh>
      <instancedMesh
        ref={refLeg}
        args={[
          nodes.leg_left.geometry,
          nodes.leg_left.material,
          2 * maxTotalFisc,
        ]}
        frustumCulled={false}
        matrixAutoUpdate={false}
      />
      <ParticlesManager
        refParticles={refParticles}
        meshPhong={sharedSMat}
        physicSize={PHYSIC_SIZE}
        particleType="box"
      />
    </>
  );
}
useGLTF.preload(fiscPath, true, true);

class CFiscController {
  private entityList: CFiscEntity[] = [];
  private toRemove: number[] = [];
  private oBody = new THREE.Object3D();
  private fiscMoneySteal: number[] = [-100, -100, -100];
  private fiscColors: T3DP[] = [
    [1, 1, 1],
    [1, 0, 1],
    [0, 1, 0],
  ];
  private fiscHP: number[] = [1, 1, 1];

  private fiscPool: CFiscEntity[] = [];
  private colorPool: THREE.Color[] = [];

  constructor() {
    for (let i = 0; i < maxTotalFisc; i++) {
      this.colorPool.push(new THREE.Color(1, 1, 1));
      this.fiscPool.push(
        new CFiscEntity(
          1,
          0,
          new THREE.Color(1, 1, 1),
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ),
      );
    }
  }

  init(cubeDestroyed: TCubeDestructionState) {
    const cubePos = cubeDestroyed.pos;
    const fiscType = cubeDestroyed.fiscController;

    this.removeExceedingFisc(1);
    this.addEntity(
      cubePos,
      new THREE.Color(...this.fiscColors[fiscType]),
      this.fiscHP[fiscType],
      this.fiscMoneySteal[fiscType],
    );
    this.oBody.scale.setScalar(SCALE);
  }

  private removeExceedingFisc(fiscsToAdd: number) {
    const exceedingP = this.entityList.length + fiscsToAdd - maxTotalFisc;
    if (exceedingP > 0) {
      for (let i = 0; i < exceedingP; i++) {
        const entity = this.entityList[i];
        CISoundMng?.soundsFx.moneyGained.updateSound(entity.position);
        this.addEntityToRemove(i);
      }
      this.removeDisappearingFisc();
    }
  }

  private removeDisappearingFisc() {
    // Descending order prevents index shifting during splice.
    this.toRemove.sort((a, b) => b - a);

    for (const index of this.toRemove) {
      const fisc = this.entityList[index];
      this.fiscPool.push(fisc);
      this.colorPool.push(fisc.baseColor);
      this.entityList.splice(index, 1);
    }
    this.toRemove = [];
  }

  private entityAttack(
    index: number,
    refBody: TINSTANCEDMESH,
    refHeadSleep: TINSTANCEDMESH,
    refLeg: TINSTANCEDMESH,
    diffN: T3DP,
    sinPos: T3DP,
  ) {
    const normal = new THREE.Vector3(...diffN).normalize().multiplyScalar(10);
    CIPlayerPhys.damageRebound(normal.toArray(), 1);
    const entity = this.entityList[index];
    CIPlayer.updateMoney(entity.moneySteal);

    CISocketMng.sendSocketHpLoss(3);
    setDeep("currentNotification", "fisc");
    this.entityDeath(index, refBody, refHeadSleep, refLeg, sinPos);
  }

  private entityDeath(
    index: number,
    refBody: TINSTANCEDMESH,
    refHeadSleep: TINSTANCEDMESH,
    refLeg: TINSTANCEDMESH,
    sinPos: T3DP,
  ) {
    CIFiscParticleManager.init(sinPos, "fisc");

    const legsIndex = 2 * index;
    refBody.setMatrixAt(index, oDefault.matrix);
    refHeadSleep.setMatrixAt(index, oDefault.matrix);
    refLeg.setMatrixAt(legsIndex, oDefault.matrix);
    refLeg.setMatrixAt(legsIndex + 1, oDefault.matrix);

    const entity = this.entityList[index];
    CISoundMng?.soundsFx.moneyGained.updateSound(entity.position);

    this.addEntityToRemove(index);
  }

  private addEntityToRemove(index: number) {
    this.toRemove.push(index);
  }

  private addEntity(
    cubePos: T3DP,
    color: THREE.Color,
    hp: number,
    moneySteal: number,
  ) {
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

    let fisc: CFiscEntity;
    let fiscColor: THREE.Color;

    if (this.fiscPool.length > 0) {
      fisc = this.fiscPool.pop()!;
      fiscColor = this.colorPool.pop()!;
      fisc.hp = hp;
      fisc.moneySteal = moneySteal;
      fisc.position[0] = pos[0];
      fisc.position[1] = pos[1];
      fisc.position[2] = pos[2];
      fisc.velocity[0] = vel[0];
      fisc.velocity[1] = vel[1];
      fisc.velocity[2] = vel[2];
      fisc.offset[0] = offset[0];
      fisc.offset[1] = offset[1];
      fisc.offset[2] = offset[2];
      fisc.sumErr = [0, 0, 0];
      fisc.prevErr = [0, 0, 0];
      fisc.prevVel = [0, 0, 0];
      fisc.initTime = performance.now();
      fiscColor.copy(color);
      fisc.baseColor = fiscColor;
    } else {
      fisc = new CFiscEntity(hp, moneySteal, color, pos, vel, offset);
    }

    this.entityList.push(fisc);

    this.oBody.position.set(...pos);
    this.oBody.lookAt(...CIPlayerPhys.position);
    this.entityList[this.entityList.length - 1].oldQuaternion.copy(
      this.oBody.quaternion,
    );
  }

  damageFisc(id: number) {
    this.entityList[id].hp--;
  }

  update(
    refBody: TINSTANCEDMESH,
    refHeadSleep: TINSTANCEDMESH,
    refLeg: TINSTANCEDMESH,
    elapsedTime: number,
    delta: number,
  ) {
    if (!SGG.getIsInGame()) {
      for (const f of this.entityList) {
        this.fiscPool.push(f);
        this.colorPool.push(f.baseColor);
      }
      this.entityList = [];
    } else {
      this.updateAnimationPhase(
        elapsedTime,
        refBody,
        refHeadSleep,
        refLeg,
        delta,
      );
    }

    if (
      this.entityList.length === 0 &&
      refBody.count === 0 &&
      refHeadSleep.count === 0
    )
      return;
    this.updateMatrix(refBody, refHeadSleep, refLeg);
    this.removeDisappearingFisc();
  }

  private updateMatrix(
    refBody: TINSTANCEDMESH,
    refHeadSleep: TINSTANCEDMESH,
    refLeg: TINSTANCEDMESH,
  ) {
    refBody.count = this.entityList.length;
    refHeadSleep.count = this.entityList.length;
    refLeg.count = 2 * this.entityList.length;
    refBody.instanceMatrix.needsUpdate = true;
    refHeadSleep.instanceMatrix.needsUpdate = true;
    refLeg.instanceMatrix.needsUpdate = true;
  }

  private updateAnimationPhase(
    elapsedTime: number,
    refBody: TINSTANCEDMESH,
    refHeadSleep: TINSTANCEDMESH,
    refLeg: TINSTANCEDMESH,
    delta: number,
  ) {
    const pPos = CIPlayerPhys.position;
    for (const sIndex in this.entityList) {
      const index = Number(sIndex);
      const entity = this.entityList[index];
      if (entity.hp <= 0) {
        const fiscPos = entity.position;
        const sinElapsedSlowY = 0.1 * Math.sin(2 * elapsedTime);
        const sinElapsedSlowX = 0.05 * Math.sin(2 * elapsedTime + Math.PI / 3);
        const sinElapsedSlowZ =
          0.05 * Math.sin(2 * elapsedTime + Math.PI / 1.2);

        const sinPos: T3DP = [
          fiscPos[X] + sinElapsedSlowX,
          fiscPos[Y] + sinElapsedSlowY,
          fiscPos[Z] + sinElapsedSlowZ,
        ];

        this.entityDeath(index, refBody, refHeadSleep, refLeg, sinPos);
        continue;
      }
      const refHeadType = this.animationPhase(
        entity,
        refBody,
        refHeadSleep,
        pPos,
        index,
        delta,
      );

      const fiscPos = entity.position;
      const sinElapsedSlowY = 0.1 * Math.sin(2 * elapsedTime);
      const sinElapsedSlowX = 0.05 * Math.sin(2 * elapsedTime + Math.PI / 3);
      const sinElapsedSlowZ = 0.05 * Math.sin(2 * elapsedTime + Math.PI / 1.2);
      const sinElapsed = 1.5 * Math.sin(10 * elapsedTime);

      const sinPos: T3DP = [
        fiscPos[X] + sinElapsedSlowX,
        fiscPos[Y] + sinElapsedSlowY,
        fiscPos[Z] + sinElapsedSlowZ,
      ];
      const diffX = sinPos[X] - pPos[X];
      const diffY = sinPos[Y] - pPos[Y];
      const diffZ = sinPos[Z] - pPos[Z];

      if (
        Math.abs(diffX) < 0.5 &&
        Math.abs(diffY) < 0.5 &&
        Math.abs(diffZ) < 0.5
      ) {
        this.entityAttack(
          index,
          refBody,
          refHeadSleep,
          refLeg,
          [-diffX, -diffY, -diffZ],
          sinPos,
        );
        continue;
      } else {
        const legsIndex = 2 * index;
        const oBodyMatrix = this.oBody.matrix;
        this.oBody.position.set(...sinPos);
        this.oBody.lookAt(...pPos);
        entity.oldQuaternion.rotateTowards(this.oBody.quaternion, 0.025);
        this.oBody.quaternion.copy(entity.oldQuaternion);
        this.oBody.rotateX(PI_2).rotateY(Math.PI);
        this.oBody.updateMatrix();

        refHeadType.setMatrixAt(index, oBodyMatrix);
        this.oBody.translateY(LEG_TRANSLATE_Y);
        this.oBody.rotateX(sinElapsed);
        this.oBody.translateX(LEG_TRANSLATE);
        this.oBody.updateMatrix();
        refLeg.setMatrixAt(legsIndex, oBodyMatrix);

        this.oBody.translateX(LEG_TRANSLATE_2);
        this.oBody.rotateX(-2 * sinElapsed);

        this.oBody.updateMatrix();
        refLeg.setMatrixAt(legsIndex + 1, oBodyMatrix);
        this.oBody.rotateX(sinElapsed);

        this.createCollisionIfClose(sinPos, pPos, index);
      }
    }
  }

  private animationPhase(
    entity: CFiscEntity,
    refBody: TINSTANCEDMESH,
    refHeadSleep: TINSTANCEDMESH,
    pPos: T3DP,
    index: number,
    delta: number,
  ) {
    const diffTime = performance.now() - entity.initTime;
    if (diffTime < 600) {
      refHeadSleep.visible = true;
      return refHeadSleep;
    }

    refHeadSleep.visible = false;
    this.PIDController(pPos, index, delta);
    return refBody;
  }

  private createCollisionIfClose(sinPos: T3DP, pPos: T3DP, index: number) {
    const sumPos = Math.sqrt(
      Math.pow(sinPos[0] - pPos[0], 2) +
        Math.pow(sinPos[1] - pPos[1], 2) +
        Math.pow(sinPos[2] - pPos[2], 2),
    );
    if (sumPos < CIPlayer.attackRange.val) {
      const offset = -0.001;
      const widthBox = 0.25;
      const hitBoxMin: T3DP = [
        sinPos[0] - widthBox - offset,
        sinPos[1] - widthBox - offset,
        sinPos[2] - widthBox - offset,
      ];

      const hitBoxMax: T3DP = [
        sinPos[0] + widthBox - offset,
        sinPos[1] + widthBox - offset,
        sinPos[2] + widthBox - offset,
      ];

      CICollisionFinder.intersectList.push(
        new CCollisionBox("fisc", index, sinPos, hitBoxMin, hitBoxMax, 0),
      );
    }
  }

  private PIDController(pPos: T3DP, i: number, delta: number) {
    const entity = this.entityList[i];
    for (let j = 0; j < 3; j++) {
      const err = pPos[j] - entity.position[j] - entity.offset[j];
      const derr = (err - entity.prevErr[j]) / delta;
      const prev = entity.prevErr[j];
      entity.prevErr[j] = err;

      // Trapezoidal integral with anti-windup clamping.
      entity.sumErr[j] += ((err + prev) * delta) / 2;
      entity.sumErr[j] = Math.max(
        -integralLimit,
        Math.min(integralLimit, entity.sumErr[j]),
      );

      if (entity.prevVel === undefined) {
        entity.prevVel = [0, 0, 0];
      }

      let KPErr = KP * err;
      KPErr = KPErr > 0 ? Math.max(0.1, KPErr) : Math.min(-0.1, KPErr);
      entity.velocity[j] =
        KPErr +
        KI * entity.sumErr[j] +
        KD * derr +
        (filterGain * (entity.velocity[j] - entity.prevVel[j])) / delta;

      // Low-pass filter on velocity to prevent jitter.
      entity.velocity[j] =
        filterGain * entity.velocity[j] + (1 - filterGain) * entity.prevVel[j];

      entity.velocity[j] = Math.max(
        -maxSpeed,
        Math.min(maxSpeed, entity.velocity[j]),
      );

      entity.prevVel[j] = entity.velocity[j];
      entity.position[j] += entity.velocity[j] * delta;
    }
  }
}

export const CIFiscManager = new CFiscController();
