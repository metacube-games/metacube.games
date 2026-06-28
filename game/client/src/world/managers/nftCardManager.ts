import * as THREE from "three";

import type { T3DP } from "../../Types/T3DP";
import type { TCubeDestructionState } from "../../Types/TCubeDestructionState";
import type { TMesh } from "../../Types/TMesh";
import { shaderMat } from "../../helpers/threeTypeHelpers";

/** Lifecycle of the NFT-card animation triggered on cube destruction. */
export enum NftCardPhase {
  Idle = 0,
  Floor = 1,
  Touched = 2,
  Disappear = 3,
}

const forwardCard = new THREE.Vector3();
const ENDCONST = new THREE.Vector3(0.5 * 2 - 1, 0.5 * -2 + 1, 0.2);

class CNFTCardManager {
  nftState: NftCardPhase = NftCardPhase.Idle;
  nftScale = 1;
  transitionStartTime = 0;
  yAccum = 0;
  pos: T3DP = [0, 0, 0];
  nftID = "";
  nftIdChangeListeners: ((id: string) => void)[] = [];

  subscribeToNftIdChange(callback: (id: string) => void) {
    this.nftIdChangeListeners.push(callback);
  }

  unsubscribeFromNftIdChange(callback: (id: string) => void) {
    this.nftIdChangeListeners = this.nftIdChangeListeners.filter(
      (listener) => listener !== callback,
    );
  }

  notifyNftIdChange() {
    this.nftIdChangeListeners.forEach((listener) => listener(this.nftID));
  }

  init(
    cubeDestroyed: TCubeDestructionState,
    refNFTCARDCur: TMesh,
    refNFTParticleCur: TMesh,
    nftID: string,
  ) {
    this.pos[0] = cubeDestroyed.pos[0] + 0.5;
    this.pos[1] = cubeDestroyed.pos[1] + 0.5;
    this.pos[2] = cubeDestroyed.pos[2] + 0.5;
    refNFTCARDCur.position.set(...this.pos);
    refNFTParticleCur.position.set(...this.pos);
    refNFTCARDCur.visible = true;
    refNFTParticleCur.visible = true;
    this.nftScale = 1;
    this.nftState = NftCardPhase.Floor;
    refNFTParticleCur.scale.setScalar(this.nftScale);
    refNFTCARDCur.scale.setScalar(this.nftScale);
    this.nftID = nftID;
    this.notifyNftIdChange();
  }

  update(
    currTime: number,
    refNFTCARDCur: TMesh,
    refNFTParticleCur: TMesh,
    camera: THREE.Camera & { manual?: boolean | undefined },
  ) {
    if (this.nftState === NftCardPhase.Idle) {
      this.transitionStartTime = currTime;
      return;
    }
    refNFTCARDCur.visible = true;
    refNFTParticleCur.visible = true;
    if (this.nftState === NftCardPhase.Floor) {
      this.phaseFloor(currTime, refNFTCARDCur, refNFTParticleCur, camera);
    } else if (this.nftState === NftCardPhase.Touched) {
      this.phaseTouched(currTime, refNFTCARDCur, refNFTParticleCur, camera);
    } else if (this.nftState === NftCardPhase.Disappear) {
      this.phaseDisappear(currTime, refNFTCARDCur, refNFTParticleCur, camera);
    }
  }

  // phase 1
  phaseFloor(
    currTime: number,
    refNFTCARDCur: TMesh,
    refNFTParticleCur: TMesh,
    camera: THREE.Camera,
  ) {
    const sinyTime = this.pos[1] + 0.1 * Math.sin(currTime * 1.5);

    refNFTCARDCur.position.y = sinyTime;
    refNFTCARDCur.rotation.y = currTime / 1.2;

    refNFTCARDCur.updateMatrix();
    refNFTParticleCur.position.y = sinyTime;
    shaderMat(refNFTParticleCur).uniforms.iTime.value = currTime;
    refNFTParticleCur.updateMatrix();
    const playerPos = camera.position.toArray();
    const diffTime = currTime - this.transitionStartTime;
    if (
      (Math.abs(this.pos[0] - playerPos[0]) < 0.5 &&
        Math.abs(this.pos[1] - (playerPos[1] - 0.6)) < 0.9 &&
        Math.abs(this.pos[2] - playerPos[2]) < 0.5) ||
      diffTime > 3
    ) {
      this.nftState = NftCardPhase.Touched;
      this.transitionStartTime = currTime;
      this.nftScale = 0.65;
      refNFTParticleCur.scale.setScalar(this.nftScale);
      refNFTCARDCur.scale.setScalar(this.nftScale);
    }
  }

  // phase 2
  phaseTouched(
    currTime: number,
    refNFTCARDCur: TMesh,
    refNFTParticleCur: TMesh,
    camera: THREE.Camera,
  ) {
    const diffTimeInit = currTime - this.transitionStartTime;
    let diffTime = diffTimeInit / 1.5;
    diffTime = 0.7 / this.easeOutQuad(diffTime);
    forwardCard.copy(ENDCONST).unproject(camera);

    refNFTCARDCur.position.copy(forwardCard);
    refNFTCARDCur.quaternion.copy(camera.quaternion);

    const diffTimePos = diffTime * 0.02;
    refNFTCARDCur.rotateY(diffTime);
    refNFTCARDCur.translateY(diffTimePos);
    refNFTCARDCur.updateMatrix();
    refNFTCARDCur.translateY(-diffTimePos);
    refNFTCARDCur.rotateY(-diffTime);

    refNFTParticleCur.position.copy(forwardCard);
    shaderMat(refNFTParticleCur).uniforms.iTime.value = currTime;
    refNFTParticleCur.rotateY(diffTime);
    refNFTParticleCur.translateY(diffTimePos);
    refNFTParticleCur.updateMatrix();
    refNFTParticleCur.translateY(-diffTimePos);
    refNFTParticleCur.rotateY(-diffTime);
    if (diffTimeInit > 5) {
      this.transitionStartTime = currTime;
      this.nftState = NftCardPhase.Disappear;
      this.yAccum = 0;
    }
  }

  // phase 3
  phaseDisappear(
    currTime: number,
    refNFTCARDCur: TMesh,
    refNFTParticleCur: TMesh,
    camera: THREE.Camera,
  ) {
    const diffTime = currTime - this.transitionStartTime;
    if (diffTime > 2) {
      this.nftState = NftCardPhase.Idle;
      refNFTParticleCur.position.set(-7000, -7000, -7000);
      refNFTCARDCur.position.set(-7000, -7000, -7000);

      refNFTParticleCur.updateMatrix();
      refNFTCARDCur.updateMatrix();
      refNFTParticleCur.visible = false;
      refNFTCARDCur.visible = false;
      return;
    }
    forwardCard.copy(ENDCONST).unproject(camera);

    this.yAccum += 0.01 * diffTime;
    this.nftScale = THREE.MathUtils.lerp(this.nftScale, 0, 0.1);

    const forwardYTranslated = forwardCard.y - this.yAccum;
    refNFTParticleCur.scale.setScalar(this.nftScale);
    refNFTParticleCur.position.x = forwardCard.x;
    refNFTParticleCur.position.y = forwardYTranslated;
    refNFTParticleCur.position.z = forwardCard.z;

    refNFTCARDCur.scale.setScalar(this.nftScale);
    refNFTCARDCur.position.x = forwardCard.x;
    refNFTCARDCur.position.y = forwardYTranslated;
    refNFTCARDCur.position.z = forwardCard.z;
    refNFTCARDCur.quaternion.copy(camera.quaternion);

    refNFTParticleCur.updateMatrix();
    refNFTCARDCur.updateMatrix();
  }

  easeOutQuad(x: number) {
    return Math.pow(x, 2.3);
  }
}

export const CINftCardManager = new CNFTCardManager();
