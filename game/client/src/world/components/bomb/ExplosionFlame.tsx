import { useFrame } from "@react-three/fiber";
import { useRef, useState, useEffect, useMemo } from "react";
import React from "react";
import * as THREE from "three";
import { type T3DP } from "../../../Types/T3DP";
import emitter from "../../../helpers/EventEmitter";

interface ExplosionFlameProps {
  voxelPositions: T3DP[];
  startTime: number;
  duration?: number;
}

interface ExplosionEntry extends ExplosionFlameProps {
  id: number;
}

let explosionIdCounter = 0;

export const ExplosionFlames = React.memo(() => {
  const [explosions, setExplosions] = useState<ExplosionEntry[]>([]);

  // Spawn flames when the bomb manager emits an explosion.
  useEffect(() => {
    const listener = emitter.addListener(
      "explosionFlames",
      (voxelPositions: T3DP[]) => {
        setExplosions((prev) => [
          ...prev,
          {
            id: explosionIdCounter++,
            voxelPositions,
            startTime: performance.now(),
            duration: 800, // 800ms flame duration
          },
        ]);
      },
    );

    return () => listener.remove();
  }, []);

  // Clean up old explosions
  useFrame(() => {
    const now = performance.now();
    setExplosions((prev) => {
      const next = prev.filter(
        (exp) => now - exp.startTime < (exp.duration || 800),
      );
      // Keep the same reference when nothing expired so React can bail out of re-rendering
      return next.length === prev.length ? prev : next;
    });
  });

  return (
    <>
      {explosions.map((explosion) => (
        <ExplosionFlameGroup
          key={explosion.id}
          voxelPositions={explosion.voxelPositions}
          startTime={explosion.startTime}
          duration={explosion.duration}
        />
      ))}
    </>
  );
});

ExplosionFlames.displayName = "ExplosionFlames";

const ExplosionFlameGroup = React.memo(
  ({ voxelPositions, startTime, duration = 800 }: ExplosionFlameProps) => {
    return (
      <>
        {voxelPositions.map((pos, idx) => (
          <FlameVoxel
            key={`${pos[0]}_${pos[1]}_${pos[2]}_${idx}`}
            position={pos}
            startTime={startTime}
            duration={duration}
          />
        ))}
      </>
    );
  },
);

ExplosionFlameGroup.displayName = "ExplosionFlameGroup";

// Shared geometry for all flame voxels (created once, reused)
const sharedFlameGeometry = new THREE.BoxGeometry(1, 1, 1);

// Factory function to create shader material (called once per FlameVoxel instance)
const createFlameMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uOpacity: { value: 1.0 },
    },
    vertexShader: `
    varying vec3 vPosition;
    varying vec2 vUv;

    void main() {
      vPosition = position;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    fragmentShader: `
    uniform float uTime;
    uniform float uProgress;
    uniform float uOpacity;

    varying vec3 vPosition;
    varying vec2 vUv;

    // Simple noise function
    float noise(vec3 p) {
      return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
    }

    void main() {
      // Create flame-like pattern with noise
      vec3 noisePos = vPosition * 3.0 + vec3(0.0, uTime * 2.0, 0.0);
      float n = noise(noisePos);

      // Vertical gradient (brighter at bottom, darker at top)
      float verticalGrad = 1.0 - vPosition.y;

      // Combine noise with gradient
      float intensity = n * 0.5 + verticalGrad * 0.8;

      // Color transition: yellow → orange → red
      vec3 color;
      if (intensity > 0.7) {
        color = mix(vec3(1.0, 0.8, 0.0), vec3(1.0, 1.0, 0.5), (intensity - 0.7) / 0.3); // Yellow-white
      } else if (intensity > 0.4) {
        color = mix(vec3(1.0, 0.3, 0.0), vec3(1.0, 0.8, 0.0), (intensity - 0.4) / 0.3); // Orange-yellow
      } else {
        color = mix(vec3(0.5, 0.1, 0.0), vec3(1.0, 0.3, 0.0), intensity / 0.4); // Dark red-orange
      }

      // Add pulsing effect
      float pulse = sin(uTime * 10.0 + vPosition.y * 5.0) * 0.2 + 0.8;
      color *= pulse;

      // Apply opacity
      float alpha = intensity * uOpacity;

      gl_FragColor = vec4(color, alpha);
    }
  `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending, // Additive blending for bright flame effect
  });

interface FlameVoxelProps {
  position: T3DP;
  startTime: number;
  duration: number;
}

const FlameVoxel = React.memo(
  ({ position, startTime, duration }: FlameVoxelProps) => {
    const meshRef = useRef<THREE.Mesh>(null);

    // Create material once per FlameVoxel instance (not every render!)
    const material = useMemo(() => createFlameMaterial(), []);

    // Dispose the per-instance material on unmount (geometry is shared, so it is not disposed here)
    useEffect(() => () => material.dispose(), [material]);

    useFrame(() => {
      if (!meshRef.current) return;

      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      // Update shader uniforms
      material.uniforms.uTime.value = elapsed * 0.001;
      material.uniforms.uProgress.value = progress;

      // Fade out and scale down as time progresses
      const fadeOut = 1.0 - progress;
      meshRef.current.scale.setScalar(0.5 + fadeOut * 0.5);
      material.uniforms.uOpacity.value = fadeOut;
    });

    return (
      <mesh
        ref={meshRef}
        position={[position[0] + 0.5, position[1] + 0.5, position[2] + 0.5]}
        geometry={sharedFlameGeometry}
        material={material}
      />
    );
  },
);

FlameVoxel.displayName = "FlameVoxel";
