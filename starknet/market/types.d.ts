declare module "*.glb" {
  const src: string;
  export default src;
}

declare module "three-stdlib" {
  import * as THREE from "three";

  export interface GLTF {
    scene: THREE.Group;
    scenes: THREE.Group[];
    cameras: THREE.Camera[];
    animations: THREE.AnimationClip[];
    asset: {
      copyright?: string;
      generator?: string;
      version?: string;
      minVersion?: string;
      extensions?: Record<string, unknown>;
      extras?: unknown;
    };
    parser: unknown;
    userData: Record<string, unknown>;
  }
}
