import { useEffect } from "react";
import { CISocketMng } from "../../API/socketMessagesManager";
import { CIPlayerPhys } from "../model/playerPhysic";
import { useThree } from "@react-three/fiber";
import { CICollisionFinder } from "../model/findIntersection";
import { CIFiscManager } from "../../world/components/animFromVoxel/FiscManager";
import * as THREE from "three";
import emitter from "../../helpers/EventEmitter";
import { CISoundMng } from "../../sound/soundFX";
import { setDeep } from "../../menu/subMenus/NavigationBar/Model/notifTips/store";
import { postAllyAchievement } from "../../API/backendAPI";

const laserControl = {
  fire: false,
  timestamp: 0,
  startPoint: new THREE.Vector3(),
  endPoint: new THREE.Vector3(),
  intersectionType: "null",
};

let lastClickTime = 0;
let repeatInterval: NodeJS.Timeout | null = null;
const LEFT_BUTTON = 1;

let canClick = true;
export const setCanClick = (val: boolean) => {
  canClick = val;
};

export function ClickHandle() {
  const { gl } = useThree();

  useEffect(() => {
    const onPointerDownHandle = (e: any) => {
      if (e.buttons !== LEFT_BUTTON) return;
      if (document.pointerLockElement !== gl.domElement) return;

      onHammerHit(onUp, e);
    };

    const onUp = (e: {
      preventDefault: () => void;
      stopPropagation: () => void;
    }): void => {
      e.preventDefault();
      e.stopPropagation();
      if (repeatInterval) clearInterval(repeatInterval);
    };
    const onDown = (event: any): void => {
      event.preventDefault();
      event.stopPropagation();
      onPointerDownHandle(event);
      if (repeatInterval) clearInterval(repeatInterval);
      repeatInterval = setInterval(() => {
        onPointerDownHandle(event);
      }, 240);
    };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointerdown", onDown);
      if (repeatInterval) clearInterval(repeatInterval);
    };
  }, [gl]);

  return <></>;
}

export function onHammerHit(onUp: (e: any) => void, e: any) {
  if (!canClick) {
    e.preventDefault();
    e.stopPropagation();
    onUp(e);
    return;
  }
  if (performance.now() - lastClickTime >= 130) {
    laserControl.fire = true;
    laserControl.timestamp = performance.now();

    lastClickTime = performance.now();
    CIPlayerPhys.animRotSend = -0.5;
    CIPlayerPhys.sendHammerHit = true;
    CIPlayerPhys.animRotX = -0.5;
    CIPlayerPhys.animRotZ = -0.5;

    const currEntity = CICollisionFinder.intersEntity;
    const currType = currEntity.type;

    if (currType !== "null" && currEntity.position) {
      laserControl.endPoint.fromArray(currEntity.position);
    } else {
      laserControl.endPoint.set(0, 0, 0);
    }
    laserControl.intersectionType = currType;

    if (currType === "null") {
      CISoundMng?.soundsFx.hitAir.updateSound(CIPlayerPhys.position);
      return;
    }
    if (currType === "layerBarrier") {
      return;
    }

    CICollisionFinder.lastHittedPos =
      CICollisionFinder.intersEntity.positionFloor;

    if (currType === "voxel") {
      CISocketMng.sendSocketHitCube(
        CICollisionFinder.intersEntity.positionFloor,
      );
    } else if (currType === "voxelAggressive") {
      const dir = new THREE.Vector3();
      const playerPos = new THREE.Vector3(...CIPlayerPhys.position);
      const cubePos = new THREE.Vector3(...currEntity.position);
      dir.subVectors(playerPos, cubePos);
      dir.multiplyScalar(4);
      CIPlayerPhys.damageRebound([dir.x, dir.y, dir.z], 1);
      setDeep("currentNotification", "cubeDamage");
      CISocketMng.sendSocketHpLoss(4);
      emitter.emit("voxelAggressive");
    } else if (currType === "player") {
      postAllyAchievement();
      CISocketMng.sendHitPlayer(currEntity.id);
    } else if (currType === "fisc") {
      CIFiscManager.damageFisc(CICollisionFinder.intersEntity.id);
      CISoundMng?.soundsFx.hitFisc.updateSound(CIPlayerPhys.position);
    }
  }
}
