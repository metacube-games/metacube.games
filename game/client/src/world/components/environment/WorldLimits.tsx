import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import glassTexture from "../../../assets/cubeTextures/green_stained_glass.png";
import { WORLD_BOUNDARIES } from "../../../helpers/worldBoundaries";
import { toStaticMeshOutConverter } from "./StaticGlbs/StaticGlbComponent";
const XSIDE = 0;
const YSIDE = 1;
const ZSIDE = 2;
export const WorldLimits = memo(() => {
  const refGroupPlane = useRef<THREE.Group>(null!);
  const texture = useLoader(THREE.TextureLoader, glassTexture);
  texture.anisotropy = 0;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

  // Index 5 is the original useLoader source; indices 0–4 are clones to dispose separately.
  const textures = useMemo(
    () => [
      texture.clone(),
      texture.clone(),
      texture.clone(),
      texture.clone(),
      texture.clone(),
      texture,
    ],
    [texture],
  );

  useEffect(() => {
    return () => {
      for (let i = 0; i < 5; i++) {
        textures[i].dispose();
      }
    };
  }, [textures]);

  const [currMinX, currMaxX, currMinY, currMaxY, currMinZ, currMaxZ] =
    WORLD_BOUNDARIES;
  const diffX = currMaxX - currMinX;
  const diffY = currMaxY - currMinY;
  const diffZ = currMaxZ - currMinZ;
  const midX = currMinX + diffX / 2;
  const midY = currMinY + diffY / 2;
  const midZ = currMinZ + diffZ / 2;
  const angleLayerSide = [
    [currMinX, midY, midZ, diffY, diffZ, [0, Math.PI / 2, Math.PI / 2], XSIDE],
    [currMaxX, midY, midZ, diffY, diffZ, [0, Math.PI / 2, Math.PI / 2], XSIDE],
    [midX, currMinY, midZ, diffX, diffZ, [Math.PI / 2, 0, 0], YSIDE],
    [midX, currMaxY, midZ, diffX, diffZ, [-Math.PI / 2, 0, 0], YSIDE],
    [midX, midY, currMinZ, diffY, diffX, [0, 0, Math.PI / 2], ZSIDE],
    [midX, midY, currMaxZ, diffY, diffX, [0, 0, Math.PI / 2], ZSIDE],
  ];

  useEffect(() => {
    refGroupPlane.current.children.forEach((plane) => {
      toStaticMeshOutConverter(plane as THREE.Mesh);
    });
  }, [refGroupPlane]);

  useFrame((state) => {
    const player = state.camera;
    const playerPos = player.position;
    const playerPosArr = playerPos.toArray();

    angleLayerSide.forEach((spec, i) => {
      const specS = spec as number[];
      const currSide = specS[6] as number;
      const proximity = Math.abs(
        (playerPosArr[currSide] - specS[currSide]) as number,
      );
      if (proximity < 60) {
        const child = refGroupPlane.current.children[i] as THREE.Mesh;
        child.visible = true;
        (child.material as THREE.Material).opacity = (1 - proximity / 60) / 2;
      } else {
        refGroupPlane.current.children[i].visible = false;
      }
    });
  }, 3);
  return (
    <group ref={refGroupPlane}>
      {angleLayerSide.map((spec, i) => {
        const mx = spec[0] as number;
        const my = spec[1] as number;
        const mz = spec[2] as number;
        const diffW = spec[3] as number;
        const diffH = spec[4] as number;
        const angle = spec[5] as number[];
        const side = spec[6] as number;
        const planeKey = `${side}:${mx},${my},${mz}`;
        textures[i].repeat.set(diffW, diffH);
        return (
          <mesh
            key={planeKey}
            position={[mx, my, mz]}
            rotation={[angle[0], angle[1], angle[2]]}
            rotation-order={"YXZ"}
          >
            <planeGeometry args={[diffW, diffH]} />
            <meshStandardMaterial
              side={THREE.DoubleSide}
              map={textures[i]}
              transparent={true}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
});
