import * as THREE from "three";

/**
 * Skips updateMatrixWorld for invisible Object3Ds and adds a structuredClone polyfill.
 * Call once at startup before any Object3D is created.
 */
export function optimizeThreeJS(): void {
  // Store the original updateMatrixWorld function
  const originalUpdateMatrixWorld = THREE.Object3D.prototype.updateMatrixWorld;

  // Skip matrix recomputation for invisible objects
  THREE.Object3D.prototype.updateMatrixWorld = function () {
    if (this.visible) {
      originalUpdateMatrixWorld.apply(this);
    }
  };

  // Polyfill for structuredClone if not available (mainly for older browsers)
  // Note: This is a basic polyfill using JSON serialization which has limitations
  // (won't clone functions, symbols, DOM nodes, etc.)
  if (typeof globalThis.structuredClone !== "function") {
    globalThis.structuredClone = (objectToClone) =>
      JSON.parse(JSON.stringify(objectToClone));
  }
}
