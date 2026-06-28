import { type TPlayer } from "../../../Types/TPlayer";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import React, { useEffect, useRef, useMemo } from "react";
import { type T3DP } from "../../../Types/T3DP";
import { PID2 } from "../../../helpers/PI";
import { CISoundMng } from "../../../sound/soundFX";
import { SPAWNER_REGION_MIN_Y } from "../../../helpers/worldBoundaries";
const currMinY = SPAWNER_REGION_MIN_Y;
const currMaxY = 455;
const SPAWNTIME = 2000;
const MAXINSTANCE = 800;
interface OppSpawnProps {
  texture: THREE.Texture;
}

type TSpawner = {
  initTime: number;
  pos: [number, number, number];
};
const spawnerMng: { [key: string]: TSpawner } = {};
const matrix = new THREE.Matrix4();
let newlyConnectedPlayers: { [key: string]: TPlayer } = {};
export function setNewConnectedPlayers(userId: string, player: TPlayer) {
  newlyConnectedPlayers[userId] = player;
}

export function setSelfPlayer(position: T3DP) {
  spawnerMng[-1] = {
    initTime: performance.now(),
    pos: position,
  };
  setTimeout(() => {
    CISoundMng?.soundsFx.spawner.updateSound(position);
  }, 50);
}

const V31 = new THREE.Vector3(1, 1, 1);
const Q1 = new THREE.Quaternion();
const euler3 = new THREE.Euler(0, 0, 0, "YXZ");
const V3M = new THREE.Vector3();
const xAngles = [0, PID2, PID2];
const zAngles = [0, 0, PID2];
const vec3 = new THREE.Vector3();
export const OpponentsSpawn = React.memo(({ texture }: OppSpawnProps) => {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null!);
  const isTabVisible = useRef(true);

  const geometry = useMemo(() => new THREE.PlaneGeometry(currMaxY, 1.4), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        map: texture,
        transparent: true,
        opacity: 0.2,
      }),
    [texture],
  );

  // Cleanup geometry and material on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useEffect(() => {
    instancedMeshRef.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instancedMeshRef.current.count = 0;

    // Add visibility change event listener
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === "visible";
      isTabVisible.current = visible;
      // Clear accumulated players when tab becomes visible again
      if (visible) {
        newlyConnectedPlayers = {};
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [instancedMeshRef]);
  // if layer 0 no planes

  useFrame((state) => {
    // Skip processing if tab is not visible
    if (!isTabVisible.current) return;

    // when player close to one of the edge of the world, make the specific plane visible. otherwise make it invisible
    // do not render player with id similar to CIMainViewer.followedPlayerID
    const entriesNewP = Object.keys(newlyConnectedPlayers);
    for (const playerID of entriesNewP) {
      const nbId = Number(playerID);
      const { placedPos } = newlyConnectedPlayers[nbId];
      if (!placedPos) continue;
      spawnerMng[nbId] = {
        initTime: performance.now(),
        pos: placedPos,
      };
      const camera = state.camera;
      // check if distance between camera and placedPos is less than a sphere of radius 20
      const distance = camera.position.distanceTo(vec3.set(...placedPos));
      if (distance < 20) {
        CISoundMng?.soundsFx.spawner.updateSound(placedPos);
      }
      delete newlyConnectedPlayers[nbId];
    }

    let mi = 0;
    const spawnerEmtries = Object.keys(spawnerMng);
    for (const spawnedP of spawnerEmtries) {
      if (mi >= MAXINSTANCE) break;
      const spawnID = Number(spawnedP);
      const { pos, initTime } = spawnerMng[spawnID];
      const currMinX = pos[0] - 0.7;
      const currMaxX = pos[0] + 0.7;

      const currMinZ = pos[2] - 0.7;
      const currMaxZ = pos[2] + 0.7;

      const diffX = currMaxX - currMinX;
      const diffY = currMaxY - currMinY;
      const diffZ = currMaxZ - currMinZ;
      const midX = currMinX + diffX / 2;
      const midY = currMinY + diffY / 2;
      const midZ = currMinZ + diffZ / 2;
      const angleLayerSide = [
        [currMinX, midZ, xAngles], // -x
        [currMaxX, midZ, xAngles], // +x
        [midX, currMinZ, zAngles], // -z
        [midX, currMaxZ, zAngles], // +z
      ];

      const timeDiff = performance.now() - initTime;
      let heightScaleFactor = 0;
      if (timeDiff <= 100) {
        heightScaleFactor = timeDiff / 100;
      } else if (timeDiff <= 500) {
        heightScaleFactor = 1;
      } else {
        heightScaleFactor = 1 - (timeDiff - 500) / 1500;
      }

      V31.setX(heightScaleFactor);
      const my = (2 - heightScaleFactor) * midY;
      for (let index = 0; index < angleLayerSide.length; index++) {
        const spec = angleLayerSide[index];
        const mx = spec[0] as number;
        const mz = spec[1] as number;
        const angle = spec[2] as T3DP;

        matrix.compose(
          V3M.set(mx, my, mz),
          Q1.setFromEuler(euler3.set(...angle)),
          V31,
        );

        instancedMeshRef.current.setMatrixAt(mi++, matrix);
      }

      if (timeDiff > SPAWNTIME) {
        delete spawnerMng[spawnID];
      }
    }

    instancedMeshRef.current.count = mi;
    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
  }, 3);

  return (
    <>
      <instancedMesh
        ref={instancedMeshRef}
        frustumCulled={false}
        args={[geometry, material, MAXINSTANCE]}
      />
    </>
  );
});
