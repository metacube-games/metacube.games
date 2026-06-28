"use client";

import * as THREE from "three";
import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";

const SKIN_PATHS = {
  stove: "/glb/stove.glb",
  zombie: "/glb/zombie.glb",
  ogStove: "/glb/og_stove.glb",
  brother: "/glb/brother.glb",
  peltonFlusk: "/glb/pelton_flusk.glb",
  stoveMonke: "/glb/stoveMonke.glb",
} as const;

export type SkinKey = keyof typeof SKIN_PATHS;

for (const path of Object.values(SKIN_PATHS)) {
  useGLTF.preload(path);
}

function SkinModel({ path }: { path: string }) {
  const gltf = useGLTF(path);
  const ref = useRef<THREE.Group>(null);
  // Continuous slow spin so each card has visible motion even though the
  // user can't orbit (controls disabled on this read-only card embed).
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.6;
  });
  return (
    <group
      ref={ref}
      position={[0, -1.4, 0]}
      rotation={[0, -Math.PI, 0]}
      scale={[1.25, 1.25, 1.25]}
    >
      <primitive object={gltf.scene} />
    </group>
  );
}

export function SkinViewer({ skin }: { skin: SkinKey }) {
  return (
    <Canvas
      className="bg-card"
      style={{ width: "100%", height: "100%", display: "block" }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0.4, 2.5], fov: 60, near: 0.1, far: 50 }}
    >
      <ambientLight intensity={1.2} />
      <pointLight position={[0, 2, 2]} intensity={2} color="#ddffdd" />
      <Suspense fallback={null}>
        <SkinModel path={SKIN_PATHS[skin]} />
      </Suspense>
    </Canvas>
  );
}
