import React, { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getMovement } from "../model/playerControls";
import { CIPlayer, CIPlayerPhys } from "../model/playerPhysic";
import { Weapon as WeaponPlayer } from "./Weapon";
import { type TMesh } from "../../Types/TMesh";
import { afkKick } from "../model/afkKick";
import { CICollisionFinder } from "../model/findIntersection";
import { getWorld } from "../../world/model/VoxelWorld";
import { workerPool } from "../../world/model/WorkerPool";
import { CIHUD } from "../../menu/HUD/hudInfo";
import { CICollisionGenerator } from "../../world/model/collisionsGenerator";
import { CISoundMng } from "../../sound/soundFX";
import { SAG, SGG, useGStore } from "../../menu/useGeneralStore";
import { CIBombManager } from "../../world/managers/bombManager";
import { CICameraShake } from "./cameraShake";
import { CISocketMng } from "../../API/socketMessagesManager";
import { useBombStore } from "../../stores/bombStore";
import { BombType } from "../../constants/bombTypes";

const firstPersonCamera = {
  position: new THREE.Vector3(),
  direction: new THREE.Vector3(),
  rotation: new THREE.Euler(),
  matrixWorld: new THREE.Matrix4(),
};
const THIRD_PERSON_DISTANCE = 3;
const camera3rdVec = new THREE.Vector3(0, 0, THIRD_PERSON_DISTANCE);
const worldDirVec = new THREE.Vector3();
let intCreated = false;

const OFFSETPOS = [0.11, -0.19, 0.79];
const OFFSETROT = [-0.1, Math.PI / 2, 0];

export const Player = React.memo(({ isDesktop }: { isDesktop: boolean }) => {
  const isThirdPerson = useGStore((state) => state.isThirdPerson);
  const { isBombUnlocked } = useBombStore();

  const lastToggleState = useRef(false);
  const lastNumberKeyStates = useRef<Record<string, boolean>>({
    Digit1: false,
    Digit2: false,
    Digit3: false,
    Digit4: false,
    Digit5: false,
  });

  const { camera } = useThree();
  const axe = useRef<TMesh>(null!);
  const mesh = useRef<TMesh>(null!);
  const kickTimer = useRef<number>(undefined!);
  if (kickTimer.current === undefined) kickTimer.current = performance.now();
  const prevTime = useRef<number>(undefined!);
  if (prevTime.current === undefined) prevTime.current = performance.now();

  useEffect(() => {
    if (intCreated) return;
    CIPlayerPhys.initPlayer();
    mesh.current.updateMatrix();
    mesh.current.visible = false;
    mesh.current.matrixAutoUpdate = false;

    mesh.current.getWorldPosition(firstPersonCamera.position);
    camera.position.copy(firstPersonCamera.position);
    camera.lookAt(128, 60, 128);

    intCreated = true;

    // Fixed 60 Hz timestep independent of the display frame rate.
    const interval = setInterval(() => {
      if (mesh.current) {
        const elapsedTime = performance.now();
        const delta = (elapsedTime - prevTime.current) / 1000;
        prevTime.current = elapsedTime;

        const meshPos = mesh.current.position;
        CIPlayerPhys.update(
          elapsedTime / 1000,
          delta,
          [meshPos.x, meshPos.y, meshPos.z],
          camera,
          isDesktop,
        );

        mesh.current.position.set(...CIPlayerPhys.position);
        mesh.current.updateMatrix();
      }
    }, 1000 / 60);

    return () => {
      clearInterval(interval);
      intCreated = false;
    };
  }, [mesh, camera, isDesktop]);

  useEffect(() => {
    const handleNumberKey = (e: KeyboardEvent) => {
      const { code } = e;

      if (SGG.getChatFocus() || SGG.getMenuDisplay() || !SGG.getIsInGame()) {
        return;
      }

      const bombTypeMap: Record<string, BombType> = {
        Digit1: BombType.MINI,
        Digit2: BombType.STANDARD,
        Digit3: BombType.HEAVY,
        Digit4: BombType.MEGA,
        Digit5: BombType.ULTRA,
      };

      const bombType = bombTypeMap[code];
      if (!bombType) return;

      const wasPressed = lastNumberKeyStates.current[code];
      lastNumberKeyStates.current[code] = true;

      if (wasPressed) return;

      if (!isBombUnlocked(bombType)) {
        return;
      }

      const playerId = CISocketMng.id?.toString() || "";
      CIBombManager.placeBomb(CIPlayerPhys.position, playerId, bombType);

      e.preventDefault();
      e.stopPropagation();
    };

    const handleNumberKeyUp = (e: KeyboardEvent) => {
      const { code } = e;
      if (code in lastNumberKeyStates.current) {
        lastNumberKeyStates.current[code] = false;
      }
    };

    document.addEventListener("keydown", handleNumberKey);
    document.addEventListener("keyup", handleNumberKeyUp);

    return () => {
      document.removeEventListener("keydown", handleNumberKey);
      document.removeEventListener("keyup", handleNumberKeyUp);
    };
  }, [isBombUnlocked]);

  useFrame((_state, delta) => {
    // Camera and visual updates only (physics runs in setInterval above)
    // Handle camera toggle
    const { toggleCamera } = getMovement();
    if (
      toggleCamera &&
      !lastToggleState.current &&
      !SGG.getChatFocus() &&
      !SGG.getMenuDisplay() &&
      SGG.getIsInGame()
    ) {
      if (!isThirdPerson) {
        firstPersonCamera.direction.copy(camera.getWorldDirection(worldDirVec));
        firstPersonCamera.position.copy(camera.position);
        firstPersonCamera.rotation.copy(camera.rotation);
      }
      SAG.setIsThirdPerson(!isThirdPerson);
    }
    lastToggleState.current = toggleCamera;

    mesh.current.getWorldPosition(firstPersonCamera.position);

    firstPersonCamera.direction
      .set(0, 0, -1)
      .applyQuaternion(camera.quaternion);
    firstPersonCamera.rotation.setFromQuaternion(camera.quaternion);
    firstPersonCamera.matrixWorld.makeRotationFromQuaternion(camera.quaternion);
    firstPersonCamera.matrixWorld.setPosition(firstPersonCamera.position);

    const { posOffset } = CICameraShake.update(camera, delta);

    if (isThirdPerson) {
      const targetPosition = firstPersonCamera.position.clone();
      camera3rdVec.set(0, 0, THIRD_PERSON_DISTANCE);
      const cameraOffset = camera3rdVec.applyQuaternion(camera.quaternion);
      cameraOffset.y += 0.5;
      camera.position.copy(targetPosition).add(cameraOffset).add(posOffset);
    } else {
      const finalPos = firstPersonCamera.position.clone().add(posOffset);
      camera.position.copy(finalPos);
    }

    if (axe.current) {
      axe.current.visible = !isThirdPerson;
      if (!isThirdPerson) {
        axe.current.rotation.copy(camera.rotation);
        axe.current.position
          .copy(camera.position)
          .add(camera.getWorldDirection(worldDirVec));
        axe.current
          .translateX(OFFSETPOS[0])
          .translateY(OFFSETPOS[1])
          .translateZ(OFFSETPOS[2]);
        axe.current
          .rotateY(OFFSETROT[1])
          .rotateZ(OFFSETROT[2] + CIPlayerPhys.animRotZ * 0.6)
          .rotateX(OFFSETROT[0] + CIPlayerPhys.animRotX * 0.6);
      }
    }

    workerPool.sendWaitingListToWorkers(camera);
    afkKick(kickTimer);

    CIHUD.coordinates.setVal([
      Math.floor(CIPlayerPhys.position[0]),
      Math.floor(CIPlayerPhys.position[1]),
      Math.floor(CIPlayerPhys.position[2]),
    ]);
    audioHandler();
    if (isThirdPerson) {
      CICollisionFinder.findIntersect({
        position: firstPersonCamera.position,
        rotation: firstPersonCamera.rotation,
        matrixWorld: firstPersonCamera.matrixWorld,
        getWorldDirection: (target: THREE.Vector3) => {
          return target.copy(firstPersonCamera.direction);
        },
      } as any);
    } else {
      CICollisionFinder.findIntersect(camera);
    }

    CICollisionFinder.differentVoxelDetected();
    const world = getWorld();
    world.setLightToMaterial(axe, ...CIPlayerPhys.position);
  }, 1);

  return (
    <>
      <PlayerCameraView mesh={mesh} />
      <WeaponPlayer weaponRef={axe} />
    </>
  );
});

const PlayerCameraView = React.memo(
  ({ mesh }: { mesh: React.RefObject<TMesh> }) => {
    return <mesh ref={mesh} position={CIPlayerPhys.position} />;
  },
);

function audioHandler() {
  const { sprint } = getMovement();
  const menuDisplay = SGG.getMenuDisplay();
  let [x, y, z] = CIPlayerPhys.position;

  if (
    (CIPlayerPhys.velocity[0] === 0 && CIPlayerPhys.velocity[2] === 0) ||
    !CIPlayerPhys.canJump ||
    menuDisplay
  ) {
    CISoundMng?.soundsFx.walk.stopSound();
    CISoundMng?.soundsFx.run.stopSound();
    CISoundMng?.soundsFx.walkGrass.stopSound();
    CISoundMng?.soundsFx.runGrass.stopSound();
  } else if (CIPlayerPhys.canJump) {
    const grassBlock = CICollisionGenerator.getCollisionsContainer(
      Math.round(x),
      Math.floor(y - 1.6),
      Math.round(z),
    );
    if (grassBlock === -1) {
      if (
        sprint &&
        CIPlayer.endurance.val.curr > 0.25 &&
        (CIPlayerPhys.velocity[0] !== 0 || CIPlayerPhys.velocity[2] !== 0)
      ) {
        CISoundMng?.soundsFx.runGrass.updateSound([x, y - 1.5, z]);
        CISoundMng?.soundsFx.run.stopSound();
        CISoundMng?.soundsFx.walk.stopSound();
        CISoundMng?.soundsFx.walkGrass.stopSound();
      } else {
        CISoundMng?.soundsFx.walkGrass.updateSound([x, y - 1.5, z]);
        CISoundMng?.soundsFx.run.stopSound();
        CISoundMng?.soundsFx.walk.stopSound();
        CISoundMng?.soundsFx.runGrass.stopSound();
      }
    } else {
      if (
        sprint &&
        (CIPlayerPhys.velocity[0] !== 0 || CIPlayerPhys.velocity[2] !== 0)
      ) {
        CISoundMng?.soundsFx.run.updateSound([x, y - 1.5, z]);
        CISoundMng?.soundsFx.walk.stopSound();
        CISoundMng?.soundsFx.walkGrass.stopSound();
        CISoundMng?.soundsFx.runGrass.stopSound();
      } else {
        CISoundMng?.soundsFx.walk.updateSound([x, y - 1.5, z]);
        CISoundMng?.soundsFx.run.stopSound();
        CISoundMng?.soundsFx.walkGrass.stopSound();
        CISoundMng?.soundsFx.runGrass.stopSound();
      }
    }
  }

  if (CIPlayerPhys.jumped) {
    CISoundMng?.soundsFx.jump.updateSound([x, y - 1.5, z]);
  }

  if (CIPlayerPhys.isFlying) {
    CISoundMng?.soundsFx.fly.updateSound([x, y - 1.5, z]);
  } else {
    CISoundMng?.soundsFx.fly.stopSound();
  }
}
