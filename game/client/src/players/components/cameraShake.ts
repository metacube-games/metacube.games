import * as THREE from "three";

/**
 * Camera shake system using trauma-based approach
 * Trauma decays exponentially over time
 */
class CCameraShake {
  private trauma: number = 0;
  private maxShakeMagnitude: number = 0.5; // Maximum shake offset
  private traumaDecayRate: number = 1.5; // Trauma decays at 1.5/second

  /**
   * Add trauma to trigger shake (0.0 to 1.0)
   * Higher trauma = stronger shake
   */
  addTrauma(amount: number) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  /**
   * Update shake and apply to camera
   * Call this every frame from player.tsx useFrame loop
   * @param camera - The Three.js camera to shake
   * @param delta - Time since last frame (seconds)
   * @returns [posOffset, rotOffset] to apply to camera
   */
  update(
    _camera: THREE.Camera,
    delta: number,
  ): {
    posOffset: THREE.Vector3;
    rotOffset: THREE.Euler;
  } {
    if (this.trauma <= 0) {
      return {
        posOffset: new THREE.Vector3(0, 0, 0),
        rotOffset: new THREE.Euler(0, 0, 0),
      };
    }

    // Decay trauma over time
    this.trauma = Math.max(0, this.trauma - this.traumaDecayRate * delta);

    // Shake intensity is squared trauma (feels more natural)
    const shake = this.trauma * this.trauma;

    // Generate pseudo-random shake using time-based noise
    const time = performance.now() * 0.01; // Scale for variation

    // Position offset (small random movements)
    const posOffset = new THREE.Vector3(
      this.noise(time + 0) * shake * this.maxShakeMagnitude * 0.5,
      this.noise(time + 1) * shake * this.maxShakeMagnitude * 0.3,
      this.noise(time + 2) * shake * this.maxShakeMagnitude * 0.5,
    );

    // Rotation offset (subtle head bobbing)
    const rotOffset = new THREE.Euler(
      this.noise(time + 3) * shake * 0.08, // Pitch
      this.noise(time + 4) * shake * 0.08, // Yaw
      this.noise(time + 5) * shake * 0.05, // Roll
    );

    return { posOffset, rotOffset };
  }

  /**
   * Simple noise function using sine waves
   * Returns value between -1 and 1
   */
  private noise(x: number): number {
    return Math.sin(x * 1.3) * 0.5 + Math.sin(x * 2.7) * 0.5;
  }

  /**
   * Get current trauma level (for debugging)
   */
  getTrauma(): number {
    return this.trauma;
  }

  /**
   * Clear all trauma (instant stop)
   */
  clear() {
    this.trauma = 0;
  }
}

export const CICameraShake = new CCameraShake();
