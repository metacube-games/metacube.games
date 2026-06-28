import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import glassTexture from "../../../assets/cubeTextures/red_glass.png";
import { useEffect, useMemo, useRef } from "react";
import { OpponentsSpawn } from "./OpponentsSpawn";
import { Glow } from "./Glow";
import { SPAWNER_REGION_MIN_Y } from "../../../helpers/worldBoundaries";

const ANGLE = [-Math.PI / 2, 0, 0];

export const SpawnerBarrier = () => {
  const refMesh = useRef<THREE.Mesh>(null!);
  const texture = useLoader(THREE.TextureLoader, glassTexture);
  texture.anisotropy = 0;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  const texture2 = useMemo(() => texture.clone(), [texture]);

  // Only dispose the clone; the useLoader source texture is managed by the cache.
  useEffect(() => {
    return () => {
      texture2.dispose();
    };
  }, [texture2]);

  const [currMinX, currMaxX, currMinY, currMaxY, currMinZ, currMaxZ] = [
    30,
    196,
    SPAWNER_REGION_MIN_Y,
    454,
    -84 - 3,
    -16 + 3,
  ];
  const diffX = currMaxX - currMinX;
  const diffZ = currMaxZ - currMinZ;
  const midX = currMinX + diffX / 2;
  const midZ = currMinZ + diffZ / 2;

  useEffect(() => {
    refMesh.current.matrixAutoUpdate = false;
    refMesh.current.frustumCulled = false;
    refMesh.current.updateMatrix();
  }, [refMesh]);
  const mx = midX;
  const my = currMaxY - currMinY;
  const mz = midZ;
  const diffW = diffX;
  const diffH = diffZ;
  const angle = ANGLE;
  return (
    <>
      <OpponentsSpawn texture={texture2} />
      <mesh
        ref={refMesh}
        position={[mx, my, mz - 82]}
        rotation={[angle[0], angle[1], angle[2]]}
        rotation-order={"YXZ"}
      >
        <Glow
          color={"#ff4444"}
          jsxGeo={<planeGeometry args={[diffW, diffH, 8, 8]} />}
        />
      </mesh>
    </>
  );
};
