import * as THREE from "three";
import React, { type RefObject } from "react";
import { useGLTF } from "@react-three/drei";
import { type GLTF } from "three-stdlib";
import { type TMesh } from "../../Types/TMesh";
import { weaponUrls } from "../../GLBImports/weaponImports";
type GLTFResult = GLTF & {
  nodes: {
    Cube001: THREE.Mesh;
  };
  materials: {
    ["Material.001"]: THREE.MeshStandardMaterial;
  };
};

interface GLTFRes {
  weaponRef: RefObject<TMesh>;
}

export const Weapon = React.memo(({ weaponRef }: GLTFRes) => {
  const { nodes, materials } = useGLTF(
    weaponUrls.hammerSelfUrl,
  ) as unknown as GLTFResult;
  materials["Material.001"].side = THREE.FrontSide;

  return (
    <mesh
      ref={weaponRef}
      geometry={nodes["Cube001"].geometry}
      material={materials["Material.001"]}
      scale={0.32}
    />
  );
});
