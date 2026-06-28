import type * as THREE from "three";

export type TMesh = THREE.Mesh<
  THREE.BufferGeometry,
  THREE.Material | THREE.Material[]
>;
