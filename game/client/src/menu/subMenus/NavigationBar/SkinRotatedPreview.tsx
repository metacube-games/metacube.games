import type * as THREE from "three";
import * as React from "react";
import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { type GLTF } from "three-stdlib";
import { useFrame } from "@react-three/fiber";

type GLTFResult = GLTF & {
  nodes: {
    rightLeg: THREE.Mesh;
    body: THREE.Mesh;
    head: THREE.Mesh;
    leftArm: THREE.Mesh;
    leftLeg: THREE.Mesh;
    rightArm: THREE.Mesh;
  };
  materials: {
    body: THREE.MeshStandardMaterial;
  };
};

export const SKIN_CONST_Y = {
  head: 0.674,
  body: 0.125,
  leftArm: 0.337,
  rightArm: 0.337,
  leftLeg: -0.215,
  rightLeg: -0.215,
};

export const SKIN_CONST_X = {
  head: 0,
  body: 0,
  leftArm: -0.32,
  rightArm: 0.32,
  leftLeg: -0.125,
  rightLeg: 0.125,
};

export function SkinModel({
  path,
  ...props
}: React.ComponentProps<"group"> & { path: string }) {
  const { nodes, materials } = useGLTF(path) as unknown as GLTFResult;

  const material = useMemo(() => {
    // Clone so the preview's vertex-colors override doesn't mutate the cached in-game material.
    const m = materials.body.clone();
    m.vertexColors = false;
    return m;
  }, [materials.body]);

  // The clone is a GPU resource not owned by the useGLTF cache, and the wrapping
  // <group dispose={null}> disables R3F auto-disposal, so dispose it explicitly
  // when path/materials.body changes or the component unmounts.
  useEffect(() => () => material.dispose(), [material]);

  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * 0.5;
  });

  return (
    <group ref={ref} {...props} dispose={null}>
      <mesh
        geometry={nodes.head.geometry}
        material={material}
        position={[SKIN_CONST_X.head, SKIN_CONST_Y.head, 0]}
      />
      <mesh
        geometry={nodes.body.geometry}
        material={material}
        position={[SKIN_CONST_X.body, SKIN_CONST_Y.body, 0]}
      />
      <mesh
        geometry={nodes.leftArm.geometry}
        material={material}
        position={[SKIN_CONST_X.leftArm, SKIN_CONST_Y.leftArm, 0]}
      />
      <mesh
        geometry={nodes.rightArm.geometry}
        material={material}
        position={[SKIN_CONST_X.rightArm, SKIN_CONST_Y.rightArm, 0]}
      />
      <mesh
        geometry={nodes.leftLeg.geometry}
        material={material}
        position={[SKIN_CONST_X.leftLeg, SKIN_CONST_Y.leftLeg, 0]}
      />
      <mesh
        geometry={nodes.rightLeg.geometry}
        material={material}
        position={[SKIN_CONST_X.rightLeg, SKIN_CONST_Y.rightLeg, 0]}
      />
    </group>
  );
}
