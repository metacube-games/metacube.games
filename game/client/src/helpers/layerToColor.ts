import * as THREE from "three";

/**
 * Map a metacube layer index to its greyscale material color.
 *
 * Higher layers are lighter; the final `else` (any layer outside 0..5,
 * e.g. -1 / "no layer") collapses to near-black. Returns a fresh
 * `THREE.Color` on each call so callers can assign it to a material
 * without aliasing a shared instance.
 */
export function layerToColor(layer: number): THREE.Color {
  if (layer === 5) {
    return new THREE.Color(1, 1, 1);
  } else if (layer === 4) {
    return new THREE.Color(0.8, 0.8, 0.8);
  } else if (layer === 3) {
    return new THREE.Color(0.6, 0.6, 0.6);
  } else if (layer === 2) {
    return new THREE.Color(0.5, 0.5, 0.5);
  } else if (layer === 1) {
    return new THREE.Color(0.4, 0.4, 0.4);
  } else if (layer === 0) {
    return new THREE.Color(0.3, 0.3, 0.3);
  } else {
    return new THREE.Color(0.01, 0.01, 0.01);
  }
}
