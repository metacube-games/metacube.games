import { PHYSIC_SIZE, PARTICLES_COL } from "../../../world/model/voxelConstants";
import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { getWorld } from "../../../world/model/VoxelWorld";
import { CIFiscManager, FiscController } from "./FiscManager";
import { type TINSTANCEDMESH } from "../../../Types/TINSTANCEDMESH";
import { CICoinsManager, CoinsManager } from "./CoinsManager";
import { CParticlesManager, ParticlesManager } from "./ParticlesManager";
import { CINftCardManager, NFTAnimation } from "./NftManager";
import { WhiteHit } from "./WhiteHit";
import "../../../world/model/nftParticlesMaterial";
import { useFrame } from "@react-three/fiber";
import { type T3DP } from "../../../Types/T3DP";
import { type TMesh } from "../../../Types/TMesh";
import { CISoundMng } from "../../../sound/soundFX";
import { type TCubeDestructionState } from "../../../Types/TCubeDestructionState";
import { Electricity } from "./Electricity";
import { getNextRandom } from "../../../helpers/computedRandom";
import { CIPlayer } from "../../../players/model/playerPhysic";
const OWN_CUBE_WAITING_DESTRUCTION = 0;
const OWN_CUBE_DESTRUCTION = 1;
const OTHER_CUBE_DESTRUCTION = 2;

const CIParticlesManager = new CParticlesManager(PARTICLES_COL, 17, "plane");
const CIParticlesManagerOpp = new CParticlesManager(PARTICLES_COL, 17, "plane");

export const IntersectedCube = React.memo(() => {
  const refWhiteHit = useRef<TMesh>(null!);
  const refNFTCARD = useRef<TMesh>(null!);
  const refNFTParticle = useRef<TMesh>(null!);
  const refParticles = useRef<TINSTANCEDMESH>(null!);
  const refParticlesOpp = useRef<TINSTANCEDMESH>(null!);

  const refMoney = useRef<THREE.Group>(null!);
  const refBody = useRef<TINSTANCEDMESH>(null!);
  const refHeadSleep = useRef<TINSTANCEDMESH>(null!);
  const refLeg = useRef<TINSTANCEDMESH>(null!);

  const oldTimeRef = useRef(performance.now() / 1000);

  const sharedSMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        toneMapped: false,
        side: THREE.FrontSide,
      }),
    [],
  );

  useFrame((state) => {
    const camera = state.camera;
    const elapsedTime = state.clock.getElapsedTime();
    const diffTime = elapsedTime - oldTimeRef.current;

    oldTimeRef.current = elapsedTime;

    CIDestroyedAnim.update(refNFTCARD.current, refNFTParticle.current);

    CIFiscManager.update(
      refBody.current,
      refHeadSleep.current,
      refLeg.current,
      elapsedTime,
      diffTime,
    );
    CICoinsManager.update(refMoney.current, diffTime);
    CIParticlesManager.update(refParticles.current, diffTime, camera);
    CIParticlesManagerOpp.update(refParticlesOpp.current, diffTime, camera);

    CINftCardManager.update(
      elapsedTime,
      refNFTCARD.current,
      refNFTParticle.current,
      camera,
    );
  }, 2);

  return (
    <>
      <FiscController
        refBody={refBody}
        refHeadSleep={refHeadSleep}
        refLeg={refLeg}
      />
      <CoinsManager refMoney={refMoney} />
      <ParticlesManager
        refParticles={refParticles}
        meshPhong={sharedSMat}
        physicSize={PHYSIC_SIZE}
        particleType="plane"
      />
      <ParticlesManager
        refParticles={refParticlesOpp}
        meshPhong={sharedSMat}
        physicSize={PHYSIC_SIZE}
        particleType="plane"
      />
      <Electricity />
      <WhiteHit refWhiteHit={refWhiteHit} />
      <NFTAnimation refNFTCARD={refNFTCARD} refNFTParticle={refNFTParticle} />
    </>
  );
});

class CVoxelDestructAnimation {
  pTurnOwn: number;
  pTurnOthers: number;
  cubeDestroyedWaiting: TCubeDestructionState[];
  constructor() {
    this.pTurnOwn = 0;
    this.pTurnOthers = 3;
    this.cubeDestroyedWaiting = [];
  }

  setSelfDestruct(
    cubeHittedPos: T3DP,
    cubeHittedType: number,
    coinValue: number,
    newHP: number,
    fiscController: number,
    nftID: number,
  ) {
    if (coinValue > 0) CIPlayer.updateMoney(coinValue);
    this.cubeDestroyedWaiting.push({
      ready: OWN_CUBE_WAITING_DESTRUCTION,
      type: cubeHittedType,
      pos: cubeHittedPos,
      coinsIndexes: CICoinsManager.generateIndex(coinValue) as (
        | 0
        | 1
        | 2
        | 3
        | 4
      )[],
      newHP: newHP,
      fiscController: fiscController / 100 > getNextRandom() ? 1 : 0,
      nftID,
    });
  }

  initDestructAnim(voxelPos: T3DP) {
    let cubeDestLength = this.cubeDestroyedWaiting.length;
    for (let i = 0; i < cubeDestLength; i++) {
      let cube = this.cubeDestroyedWaiting[i];
      if (
        cube.pos[0] === voxelPos[0] &&
        cube.pos[1] === voxelPos[1] &&
        cube.pos[2] === voxelPos[2]
      ) {
        this.cubeDestroyedWaiting[i].ready = OWN_CUBE_DESTRUCTION;
        return;
      }
    }
    const type = getWorld().getVoxel(...voxelPos);
    if (type === null) return;
    this.cubeDestroyedWaiting.push({
      ready: OTHER_CUBE_DESTRUCTION,
      pos: voxelPos,
      type: type,
      coinsIndexes: [],
      newHP: 0,
      fiscController: 0,
      nftID: 0,
    });
  }

  update(refNFTCARDCurr: TMesh, refNFTParticleCurr: TMesh) {
    const toRemove = [];
    for (let i = 0; i < this.cubeDestroyedWaiting.length; i++) {
      const cubeDestroyed = this.cubeDestroyedWaiting[i];

      if (cubeDestroyed.ready === OWN_CUBE_DESTRUCTION) {
        const cubeCenter = cubeDestroyed.pos.map((v) => v + 0.5) as T3DP;

        CISoundMng?.soundsFx.breakCube.updateSound(cubeCenter);

        CIParticlesManager.init(cubeDestroyed.pos, cubeDestroyed.type);
        if (cubeDestroyed.nftID !== 0) {
          CINftCardManager.init(
            cubeDestroyed,
            refNFTCARDCurr,
            refNFTParticleCurr,
            (cubeDestroyed.nftID - 1).toString(),
          );
        }
        if (cubeDestroyed.coinsIndexes.length > 0) {
          CICoinsManager.init(cubeDestroyed);
        }
        if (cubeDestroyed.fiscController !== 0) {
          CIFiscManager.init(cubeDestroyed);
        }

        toRemove.push(i);
      } else if (cubeDestroyed.ready === OTHER_CUBE_DESTRUCTION) {
        CIParticlesManagerOpp.init(cubeDestroyed.pos, cubeDestroyed.type);
        toRemove.push(i);
      }
    }

    for (const remove of toRemove) {
      this.cubeDestroyedWaiting.splice(remove, 1);
    }
  }
}

export const CIDestroyedAnim = new CVoxelDestructAnimation();
