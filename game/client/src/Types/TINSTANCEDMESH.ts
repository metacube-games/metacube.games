import type * as THREE from "three";

export type TINSTANCEDMESH = THREE.InstancedMesh<
  THREE.BufferGeometry,
  THREE.Material | THREE.Material[]
>;
