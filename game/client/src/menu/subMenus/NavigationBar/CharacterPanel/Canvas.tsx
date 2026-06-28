import * as React from "react";
import { Suspense, memo, useEffect, useMemo, useRef } from "react";
import { Canvas as R3FCanvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { colorGreen } from "../../../styles/colors";
import { getNextRandom } from "../../../../helpers/computedRandom";

const LoadingModel = memo(() => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const time = clock.getElapsedTime();
    const sinTime1 = Math.sin(time * 0.8);
    const sinTime2 = Math.sin(time * 2);
    const sinTime3 = Math.sin(time * 3);
    const sinTime4 = Math.sin(time * 4);
    const cosTime = Math.cos(time * 0.3);

    const mesh = meshRef.current;
    mesh.rotation.x = sinTime1 * 0.15;
    mesh.rotation.y = time * 1.15;
    mesh.rotation.z = cosTime * 0.15;
    mesh.position.y = sinTime2 * 0.1;
    mesh.position.x = Math.sin(time * 1.5) * 0.05;

    const scale = 1.2 + sinTime3 * 0.15;
    mesh.scale.set(scale, scale, scale);

    if (glowRef.current) {
      glowRef.current.intensity = 1.5 + sinTime4 * 0.5;
      glowRef.current.distance = 3 + sinTime2 * 0.5;
    }
  });

  return (
    <group>
      <pointLight
        ref={glowRef}
        color={colorGreen}
        intensity={2}
        distance={3}
        decay={2}
        position={[0, 0, 0]}
      />
      <mesh ref={meshRef}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial
          color={colorGreen}
          wireframe
          emissive={colorGreen}
          emissiveIntensity={0.6}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
});
LoadingModel.displayName = "LoadingModel";

export const LoadingCanvas = memo(() => <LoadingModel />);
LoadingCanvas.displayName = "LoadingCanvas";

const LoadingParticles = memo(() => {
  const particlesRef = useRef<THREE.Points>(null);

  const particlesGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const count = 200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (getNextRandom() - 0.5) * 8;
      positions[i + 1] = (getNextRandom() - 0.5) * 4;
      positions[i + 2] = (getNextRandom() - 0.5) * 4;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);

  useEffect(() => () => particlesGeometry.dispose(), [particlesGeometry]);

  useFrame(({ clock }) => {
    if (!particlesRef.current) return;
    const time = clock.getElapsedTime();
    particlesRef.current.rotation.y = time * 0.2;
    particlesRef.current.rotation.x = Math.sin(time * 0.5) * 0.2;
  });

  return (
    <points ref={particlesRef}>
      <primitive object={particlesGeometry} />
      <pointsMaterial
        size={0.03}
        color={colorGreen}
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
});
LoadingParticles.displayName = "LoadingParticles";

export const SkinCanvas = memo(
  ({ children }: { children: React.ReactNode }) => (
    <R3FCanvas
      camera={{ position: [2, 2, 2], zoom: 2, near: 0.1, far: 100 }}
      frameloop="always"
      dpr={window.devicePixelRatio}
    >
      <ambientLight intensity={1} />
      <pointLight position={[10, 10, 10]} />
      <LoadingParticles />
      <Suspense fallback={<LoadingCanvas />}>{children}</Suspense>
    </R3FCanvas>
  ),
);
SkinCanvas.displayName = "SkinCanvas";
