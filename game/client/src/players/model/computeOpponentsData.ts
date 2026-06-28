import { type RefObject } from "react";
import * as THREE from "three";
import { type TINSTANCEDMESH } from "../../Types/TINSTANCEDMESH";
import { getWorld, type CVoxelWorld } from "../../world/model/VoxelWorld";
import { type skRef } from "../components/Opponents";
import { CITextBuilder } from "./textBuilder";
import { CIMainViewer } from "./viewerMode";
import { type TPlayer } from "../../Types/TPlayer";
import {
  CIPlayer,
  CIPlayerPhys,
  playerHitBoxMax,
  playerHitBoxMin,
} from "./playerPhysic";
import { CCollisionBox, CICollisionFinder } from "./findIntersection";
import { type T3DP } from "../../Types/T3DP";
import { SKIN_CONST_X } from "../../menu/subMenus/NavigationBar/SkinRotatedPreview";
import { CISocketMng } from "../../API/socketMessagesManager";

const MEDIUM_DIST = 170;
const MAX_TEXT_DIST = 40;
const SH_DIST_MAX = 5;
const SH_DIST_MIN = 1;
const SH_MARGIN_Y = 1.001;
const SH_SHIFT = 2;
const SH_RATIO = 3;
const CULLING_RADIUS = 1.4;
const DIFF_LIMIT = 300;
const NB_POS_LINEAR = 3;
const NB_POS_TOT = 9;
const SKIP_POS = 9999999;
const PI2 = Math.PI * 2;

const TX = 0;
const TY = 1;
const TZ = 2;
const RY = 3;
const HRX = 4;
const HRY = 5;
const ARX = 6;
const SINSPEED = 7;
const FLYING = 8;

interface TPlayers {
  [key: string]: TPlayer;
}
const dummyVec3 = new THREE.Vector3();
class COpponents {
  public players: TPlayers = {};
  private object = new THREE.Object3D();
  private frustum = new THREE.Frustum();
  private m = new THREE.Matrix4();
  private posVec = new THREE.Vector3();
  private sphereHitPlayer = new THREE.Sphere();
  private sphereView = new THREE.Sphere();
  private sphereText = new THREE.Sphere();
  private sphereHigh = new THREE.Sphere();
  private freeText: number[] = [];
  private playersToRemove: string[] = [];
  private upperBodyShadeSkins: number[][] = [];
  private lowerBodyShadeSkins: number[][] = [];
  private weaponShade: number[] = [];
  private countSkins: Array<{
    count: number;
  }> = [];
  private shCount = 0;
  private lowCount = 0;
  private textCount = 0;
  private weaponCount = 0;
  private redundantPosition: { [key: string]: number } = {};

  private cachedUpperShadeAttribs: Map<number, THREE.InstancedBufferAttribute> =
    new Map();
  private cachedLowerShadeAttribs: Map<number, THREE.InstancedBufferAttribute> =
    new Map();
  private cachedWeaponShadeAttrib: THREE.InstancedBufferAttribute | null = null;

  playerPosOffset(x: number, y: number, z: number): number {
    const key = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
    return (this.redundantPosition[key] =
      (this.redundantPosition[key] || 0) + 1);
  }

  private getOrCreateShadeAttrib(
    cache: Map<number, THREE.InstancedBufferAttribute>,
    skinIndex: number,
    data: number[],
  ): THREE.InstancedBufferAttribute {
    let attrib = cache.get(skinIndex);

    if (!attrib || attrib.array.length !== data.length) {
      attrib = new THREE.InstancedBufferAttribute(new Float32Array(data), 3);
      cache.set(skinIndex, attrib);
    } else {
      attrib.array.set(data);
      attrib.needsUpdate = true;
    }

    return attrib;
  }

  update(
    refSkins: React.RefObject<skRef>,
    refWeapon: RefObject<TINSTANCEDMESH>,
    refBodyLow: RefObject<TINSTANCEDMESH>,
    refShadow: RefObject<TINSTANCEDMESH>,
    refText: RefObject<THREE.Group>,
    nbTextRender: number,
    camera: THREE.Camera,
  ) {
    const world = getWorld();
    const currTime = performance.now();
    this.redundantPosition = {};
    this.frustum.setFromProjectionMatrix(
      this.m.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      ),
    );
    CICollisionFinder.intersectList = CICollisionFinder.intersectList.filter(
      (el) => el.type !== "player",
    );
    this.posVec.set(...camera.position.toArray());
    dummyVec3.set(...(CIPlayerPhys.position ?? [0, 0, 0]));
    this.sphereHitPlayer.set(dummyVec3, CIPlayer.attackRange.val);
    this.sphereText.set(this.posVec, MAX_TEXT_DIST);
    this.sphereHigh.set(this.posVec, MEDIUM_DIST);
    this.removePlayers(refText);
    const allSkinKeys = Object.keys(refSkins.current);

    const numSkins = allSkinKeys.length;

    if (this.upperBodyShadeSkins.length !== numSkins) {
      this.upperBodyShadeSkins = new Array(numSkins);
      this.lowerBodyShadeSkins = new Array(numSkins);
      this.countSkins = new Array(numSkins);
      for (let i = 0; i < numSkins; i++) {
        this.upperBodyShadeSkins[i] = [];
        this.lowerBodyShadeSkins[i] = [];
        this.countSkins[i] = { count: 0 };
      }
    } else {
      for (let i = 0; i < numSkins; i++) {
        this.upperBodyShadeSkins[i].length = 0;
        this.lowerBodyShadeSkins[i].length = 0;
        this.countSkins[i].count = 0;
      }
    }

    this.shCount = 0;
    this.weaponCount = 0;
    this.lowCount = 0;
    this.weaponShade.length = 0;

    const entries = Object.keys(this.players);

    for (const playerID of entries) {
      const nbId = Number(playerID);
      const {
        oldPos,
        newPos,
        posDiff,
        textID,
        skinId = 0,
      } = this.players[nbId];

      if (nbId === CIMainViewer.followedPlayerID) {
        const curPos = this.interpolation(
          this.players[nbId],
          posDiff,
          newPos,
          oldPos,
          currTime,
          false,
        );
        CIMainViewer.setInterpolatedPosition(curPos);
      }
      const isSelf = nbId === Number(CISocketMng.id);
      if (this.playerPosOffset(oldPos[0], oldPos[1], oldPos[2]) > 5 && !isSelf)
        continue;
      this.posVec.set(oldPos[0], oldPos[1], oldPos[2]);
      this.sphereView.set(this.posVec, CULLING_RADIUS);
      if (this.frustum.intersectsSphere(this.sphereView) || isSelf) {
        const curPos = this.interpolation(
          this.players[nbId],
          posDiff,
          newPos,
          oldPos,
          currTime,
          isSelf,
        );
        this.posVec.set(curPos[TX], curPos[TY], curPos[TZ]);
        if (this.sphereHigh.containsPoint(this.posVec) || isSelf) {
          if (this.sphereHitPlayer.containsPoint(this.posVec)) {
            if (
              !isSelf &&
              !CICollisionFinder.intersectList.find((el) => el.id === nbId)
            ) {
              const hitBoxMin: T3DP = [
                curPos[TX] + playerHitBoxMin[0],
                curPos[TY] + playerHitBoxMin[1] - 0.5,
                curPos[TZ] + 0.095,
              ];
              const hitBoxMax: T3DP = [
                curPos[TX] - playerHitBoxMax[0],
                curPos[TY] - playerHitBoxMax[1] - 0.6,
                curPos[TZ] - 0.095,
              ];
              CICollisionFinder.intersectList.push(
                new CCollisionBox(
                  "player",
                  nbId,
                  [curPos[0], curPos[1], curPos[2]],
                  hitBoxMin,
                  hitBoxMax,
                  curPos[HRY],
                ),
              );
            }
          }
          this.playerRender(nbId, curPos, refSkins, refWeapon, skinId);
          if (
            (this.sphereText.containsPoint(this.posVec) &&
              nbId !== CIMainViewer.followedPlayerID) ||
            isSelf
          ) {
            this.shadowsAndTextRender(
              curPos,
              world,
              nbTextRender,
              textID,
              this.players[nbId],
              this.players[nbId]?.username ?? "",
              refShadow,
              refText,
            );
          } else if (textID !== null) {
            this.removeText(textID, this.players[nbId], refText);
          }
        } else {
          if (textID !== null) {
            this.removeText(textID, this.players[nbId], refText);
          }
          const indexLow = this.lowCount++;
          this.playerLowResRender(curPos, indexLow, refBodyLow);
        }
      } else if (textID !== null) {
        this.removeText(textID, this.players[nbId], refText);
      }
    }

    for (let s = 0; s < allSkinKeys.length; s++) {
      const k = allSkinKeys[s];
      const skinPartRefs = refSkins.current[k];

      // Reuse cached attributes instead of creating new ones every frame.
      const upShade = this.getOrCreateShadeAttrib(
        this.cachedUpperShadeAttribs,
        s,
        this.upperBodyShadeSkins[s],
      );
      const lowShade = this.getOrCreateShadeAttrib(
        this.cachedLowerShadeAttribs,
        s,
        this.lowerBodyShadeSkins[s],
      );

      if (skinPartRefs.head?.current) {
        skinPartRefs.head.current.geometry.setAttribute("color", upShade);
        skinPartRefs.head.current.count = this.countSkins[s].count;
        skinPartRefs.head.current.instanceMatrix.needsUpdate = true;
        skinPartRefs.head.current.geometry.attributes.color.needsUpdate = true;
      }

      if (skinPartRefs.body?.current) {
        skinPartRefs.body.current.geometry.setAttribute("color", upShade);
        skinPartRefs.body.current.count = this.countSkins[s].count;
        skinPartRefs.body.current.instanceMatrix.needsUpdate = true;
        skinPartRefs.body.current.geometry.attributes.color.needsUpdate = true;
      }

      if (skinPartRefs.leftArm?.current) {
        skinPartRefs.leftArm.current.geometry.setAttribute("color", lowShade);
        skinPartRefs.leftArm.current.count = this.countSkins[s].count;
        skinPartRefs.leftArm.current.instanceMatrix.needsUpdate = true;
        skinPartRefs.leftArm.current.geometry.attributes.color.needsUpdate = true;
      }

      if (skinPartRefs.rightArm?.current) {
        skinPartRefs.rightArm.current.geometry.setAttribute("color", lowShade);
        skinPartRefs.rightArm.current.count = this.countSkins[s].count;
        skinPartRefs.rightArm.current.instanceMatrix.needsUpdate = true;
        skinPartRefs.rightArm.current.geometry.attributes.color.needsUpdate = true;
      }

      if (skinPartRefs.leftLeg?.current) {
        skinPartRefs.leftLeg.current.geometry.setAttribute("color", lowShade);
        skinPartRefs.leftLeg.current.count = this.countSkins[s].count;
        skinPartRefs.leftLeg.current.instanceMatrix.needsUpdate = true;
        skinPartRefs.leftLeg.current.geometry.attributes.color.needsUpdate = true;
      }

      if (skinPartRefs.rightLeg?.current) {
        skinPartRefs.rightLeg.current.geometry.setAttribute("color", lowShade);
        skinPartRefs.rightLeg.current.count = this.countSkins[s].count;
        skinPartRefs.rightLeg.current.instanceMatrix.needsUpdate = true;
        skinPartRefs.rightLeg.current.geometry.attributes.color.needsUpdate = true;
      }
    }

    if (refWeapon.current) {
      if (
        !this.cachedWeaponShadeAttrib ||
        this.cachedWeaponShadeAttrib.array.length !== this.weaponShade.length
      ) {
        this.cachedWeaponShadeAttrib = new THREE.InstancedBufferAttribute(
          new Float32Array(this.weaponShade),
          3,
        );
      } else {
        this.cachedWeaponShadeAttrib.array.set(this.weaponShade);
        this.cachedWeaponShadeAttrib.needsUpdate = true;
      }

      refWeapon.current.count = this.weaponCount;
      refWeapon.current.instanceMatrix.needsUpdate = true;
      refWeapon.current.geometry.setAttribute(
        "color",
        this.cachedWeaponShadeAttrib,
      );
      refWeapon.current.geometry.attributes.color.needsUpdate = true;
    }

    if (refBodyLow.current) {
      refBodyLow.current.count = this.lowCount;
      refBodyLow.current.instanceMatrix.needsUpdate = true;
    }

    if (refShadow.current) {
      refShadow.current.count = this.shCount;
      refShadow.current.instanceMatrix.needsUpdate = true;
    }
  }

  private playerLowResRender(
    curPos: number[],
    index: number,
    refBodyLow: RefObject<TINSTANCEDMESH>,
  ) {
    this.object.position.set(curPos[TX], curPos[TY] - 0.1, curPos[TZ]);
    this.object.rotation.y = curPos[RY];
    this.object.scale.set(1.6, 2.6, 1.6);
    this.object.updateMatrix();
    refBodyLow.current!.setMatrixAt(index, this.object.matrix);
    this.object.rotation.set(0, 0, 0);
    this.object.scale.setScalar(1);
  }

  shadowsAndTextRender(
    curPos: number[],
    world: CVoxelWorld,
    nbTextRender: number,
    currTID: number | null,
    currPlayer: TPlayer,
    username: string,
    refShadow: RefObject<TINSTANCEDMESH>,
    refText: RefObject<THREE.Group>,
  ) {
    const shx = Math.floor(curPos[TX]);
    const shy = Math.floor(curPos[TY]);
    const shz = Math.floor(curPos[TZ]);
    const TY_SHIFT = curPos[TY] - SH_SHIFT;
    for (let k = SH_DIST_MIN; k < SH_DIST_MAX; k++) {
      const currShy = shy - k;
      if (world.getCollision(shx, currShy, shz)) {
        const ratio = 1 - (TY_SHIFT - currShy) / SH_RATIO;
        const finalShy = currShy + SH_MARGIN_Y;
        const shIndex = this.shCount++;
        this.object.position.set(curPos[TX], finalShy, curPos[TZ]);
        this.object.rotation.y = curPos[RY];
        this.object.scale.setScalar(ratio);
        this.updateMatrixAndReset(refShadow, shIndex);
        this.object.scale.setScalar(1);
        break;
      }
    }
    if (
      this.freeText.length !== 0 ||
      currTID !== null ||
      this.textCount < nbTextRender
    ) {
      if (currTID !== null) {
        const currRefText = refText.current?.children[currTID];
        currRefText?.position.set(curPos[TX], curPos[TY], curPos[TZ]);
        currRefText?.updateMatrix();
      } else {
        const newCurId = (
          this.freeText.length > 0 ? this.freeText.shift() : this.textCount++
        ) as number;
        currPlayer.textID = newCurId;
        const currRefText = refText.current?.children[newCurId] as THREE.Sprite;
        if (currRefText && currRefText.name !== username) {
          CITextBuilder.createText(username, currRefText, newCurId);
        } else if (currRefText) {
          currRefText.visible = true;
        }
        currRefText?.position.set(curPos[TX], curPos[TY], curPos[TZ]);
        currRefText?.updateMatrix();
      }
    }
  }

  private updateMatrixAndReset(ref: RefObject<TINSTANCEDMESH>, idx: number) {
    this.object.updateMatrix();
    ref.current?.setMatrixAt(idx, this.object.matrix);
    this.object.rotation.set(0, 0, 0);
    this.object.scale.setScalar(1);
  }

  private playerRender(
    nbId: number,
    curPos: number[],
    refSkins: React.RefObject<skRef>,
    refWeapon: RefObject<TINSTANCEDMESH>,
    skinIndex: number,
  ) {
    const voxelWorld = getWorld();
    const offsetNoFollowd =
      nbId === CIMainViewer.followedPlayerID ? -50000 : curPos[TX];
    const upperLight = voxelWorld.getLight(
      curPos[TX],
      curPos[TY] + 0.2,
      curPos[TZ],
    );
    const lowerLight = voxelWorld.getLight(
      curPos[TX],
      curPos[TY] - 0.4,
      curPos[TZ],
    );
    this.upperBodyShadeSkins[skinIndex].push(...upperLight);
    this.lowerBodyShadeSkins[skinIndex].push(...lowerLight, ...lowerLight);
    this.weaponShade.push(...upperLight);

    const cRef = refSkins.current[skinIndex];
    const cCount = this.countSkins[skinIndex];
    const indexSkin = cCount.count++;
    this.object.position.set(offsetNoFollowd, curPos[TY], curPos[TZ]);
    this.object.rotation.y = curPos[RY];
    this.updateMatrixAndReset(cRef.body!, indexSkin);
    this.object.rotateY(curPos[HRY]).rotateX(curPos[HRX]);
    this.updateMatrixAndReset(cRef.head!, indexSkin);

    const fState = curPos[FLYING] > 0.001 ? Math.PI : 0;
    const leftRx = curPos[SINSPEED] + fState;
    this.object.position.set(offsetNoFollowd, curPos[TY], curPos[TZ]);
    this.object.rotateY(curPos[RY]).rotateX(leftRx);
    this.object.translateX(SKIN_CONST_X.leftArm);
    this.updateMatrixAndReset(cRef.leftArm!, indexSkin);

    this.object.position.set(curPos[TX], curPos[TY], curPos[TZ]);
    this.object.rotateY(curPos[RY]).rotateX(curPos[ARX]);
    this.object.translateX(SKIN_CONST_X.rightArm);
    this.object.updateMatrix();
    cRef.rightArm?.current?.setMatrixAt(indexSkin, this.object.matrix);
    // Weapon shares right-arm transform; nudge forward and up to align grip.
    const weaponIndex = this.weaponCount++;
    this.object.translateZ(0.08);
    this.object.translateY(0.08);
    this.updateMatrixAndReset(refWeapon!, weaponIndex);

    const f2 = curPos[FLYING] / 2;
    this.object.position.set(offsetNoFollowd, curPos[TY], curPos[TZ]);
    this.object.rotateY(curPos[RY]).rotateX(curPos[SINSPEED]).rotateZ(-f2);
    this.object.translateX(SKIN_CONST_X.leftLeg);
    this.updateMatrixAndReset(cRef.leftLeg!, indexSkin);
    this.object.position.set(offsetNoFollowd, curPos[TY], curPos[TZ]);
    this.object.rotateY(curPos[RY]).rotateX(-curPos[SINSPEED]).rotateZ(f2);
    this.object.translateX(SKIN_CONST_X.rightLeg);
    this.updateMatrixAndReset(cRef.rightLeg!, indexSkin);
  }

  removePlayers(refText: RefObject<THREE.Group>) {
    for (const id of this.playersToRemove) {
      const playerToRemove = this.players[id];
      if (playerToRemove) {
        const currTID = playerToRemove.textID;
        if (currTID !== null) {
          this.removeText(currTID, playerToRemove, refText);
        }
        delete this.players[id];
      }
    }
    this.playersToRemove = [];
  }

  removeText(
    currTID: number,
    currPlayer: TPlayer,
    refText: RefObject<THREE.Group>,
  ) {
    const currRefText = refText.current?.children[currTID];
    if (!currRefText) return;
    currRefText.visible = false;
    if (currTID + 1 === this.textCount) {
      this.textCount--;
    } else {
      this.freeText.push(currTID);
    }
    currPlayer.textID = null;
  }

  interpolation(
    currPlayer: TPlayer,
    posDiff: number[],
    newPos: number[],
    oldPos: number[],
    currTime: number,
    isSelf: boolean,
  ) {
    if (currPlayer.recompute) {
      for (let j = 0; j < NB_POS_LINEAR; j++) {
        posDiff[j] = newPos[j] - oldPos[j];
      }
      for (let j = NB_POS_LINEAR; j < NB_POS_TOT; j++) {
        posDiff[j] = this.shortAngleDist(oldPos[j], newPos[j]);
      }

      const totalDiff =
        Math.abs(posDiff[0]) + Math.abs(posDiff[1]) + Math.abs(posDiff[2]);

      if (totalDiff > DIFF_LIMIT) {
        // Position jumped too far (e.g. teleport or packet loss): snap immediately.
        currPlayer.invTimeDiff = SKIP_POS;
        for (let j = 0; j < NB_POS_TOT; j++) {
          oldPos[j] = newPos[j];
        }
      } else {
        const timeDiff = currPlayer.newPackageTime - currPlayer.oldPackageTime;
        // Clamp to the expected server tick window to avoid extrapolation artifacts.
        const adjustedTimeDiff = isSelf
          ? Math.max(Math.min(19, timeDiff), 15)
          : Math.max(Math.min(40, timeDiff), 30);
        currPlayer.invTimeDiff = 1000 / adjustedTimeDiff;
      }
      currPlayer.recompute = false;
    }

    const timeSinceUpdate = currTime - currPlayer.newPackageTime;
    const timeRatio = Math.min(1, timeSinceUpdate * currPlayer.invTimeDiff);

    if (!currPlayer.interpolatedPos) {
      currPlayer.interpolatedPos = new Array(NB_POS_TOT);
    }
    const curPos = currPlayer.interpolatedPos;

    if (currPlayer.invTimeDiff === SKIP_POS) {
      for (let j = 0; j < NB_POS_TOT; j++) {
        curPos[j] = newPos[j];
      }
    } else {
      for (let j = 0; j < NB_POS_LINEAR; j++) {
        curPos[j] = oldPos[j] + posDiff[j] * timeRatio;
      }
      for (let j = NB_POS_LINEAR; j < NB_POS_TOT; j++) {
        curPos[j] = oldPos[j] + posDiff[j] * timeRatio;
        // Wrap rotation angles to [-PI, PI].
        if (j === RY || j === HRY) {
          curPos[j] = curPos[j] % PI2;
        }
      }
    }
    return curPos;
  }

  shortAngleDist(a0: number, a1: number) {
    const da = (a1 - a0) % PI2;
    return ((2 * da) % PI2) - da;
  }

  addToBeFree(id: string) {
    this.playersToRemove.push(id);
  }

  setPlayers(newPlayers: TPlayers) {
    this.players = newPlayers;
  }
}

export const CIOpponents = new COpponents();
