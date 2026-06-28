import type * as THREE from "three";

import type { TMesh } from "../Types/TMesh";

/**
 * Narrow a mesh's `material` (typed by r3f as `Material | Material[]`)
 * to a `THREE.ShaderMaterial` so you can access `.uniforms.X.value` without
 * the per-line type suppressions that custom shaders normally require.
 *
 * Only use this on meshes whose material is a known ShaderMaterial — usually
 * an `extend()`-registered custom material (e.g. CoolFogMaterial,
 * ElectricityMaterial). Misuse silently breaks at runtime.
 */
export function shaderMat(mesh: TMesh): THREE.ShaderMaterial {
  return mesh.material as THREE.ShaderMaterial;
}

/**
 * Narrow a generic camera to `PerspectiveCamera` to access `.fov`.
 * Game canvas always renders with a perspective camera; this helper makes
 * the assumption explicit and skips a `@ts-expect-error`.
 */
export function perspectiveCam(camera: THREE.Camera): THREE.PerspectiveCamera {
  return camera as THREE.PerspectiveCamera;
}
