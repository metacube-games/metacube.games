"use client";

import * as THREE from "three";
import React, { useRef, useMemo, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import type { GLTF } from "three-stdlib";
import { useFrame } from "@react-three/fiber";
import { PointMaterial, Points } from "@react-three/drei";

const paths = {
  brother: "/glb/brother.glb",
  zombie: "/glb/Zombie.glb",
  ogStove: "/glb/OGStove.glb",
  v1Collection: `https://felts.xyz/v1/i/0.png`,
};

Object.keys(paths).forEach((key) => {
  useGLTF.preload(paths[key as keyof typeof paths]);
});

export type pathTypes = keyof typeof paths;

interface ModelNodes {
  [key: string]: THREE.Mesh;
}

interface ModelMaterials {
  [key: string]: THREE.Material;
}

type GLTFResult = GLTF & {
  nodes: ModelNodes;
  materials: ModelMaterials;
};

interface GLBModelProps {
  path: pathTypes;
  isPopup?: boolean;
  quality?: "standard" | "high";
}

export function GLBModel({ path, quality = "standard" }: GLBModelProps) {
  const gltf = useGLTF(paths[path]) as unknown as GLTFResult;
  const modelRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!gltf) return;

    Object.values(gltf.materials).forEach((material) => {
      if (material instanceof THREE.MeshStandardMaterial) {
        // Adjust material quality based on settings
        if (quality === "high") {
          material.envMapIntensity = 1.5;
          material.roughness = Math.max(0.1, material.roughness * 0.8);
          material.metalness = Math.min(1, material.metalness * 1.2);
          material.flatShading = false;
        } else {
          material.envMapIntensity = 1;
          material.flatShading = true;
        }
      }
    });
  }, [gltf, quality]);


  return (
    <group
      ref={modelRef}
      dispose={null}
      position={[0, -1.15, 0]}
      rotation={[0, -Math.PI, 0]}
    >
      <primitive
        object={gltf.scene}
        scale={[1, 1, 1]}
        castShadow={quality === "high"}
        receiveShadow={quality === "high"}
      />
    </group>
  );
}

interface GreenParticlesProps {
  count?: number;
  speed?: number;
  quality?: "standard" | "high";
}

export function GreenParticles({
  count = 500,
  speed = 0.2,
  quality = "standard",
}: GreenParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const particleSize = quality === "high" ? 0.025 : 0.03;
  const particleOpacity = quality === "high" ? 0.9 : 0.8;

  const positions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return positions;
  }, [count]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = clock.getElapsedTime() * speed;
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3}>
      <PointMaterial
        transparent
        color="#00ff44"
        size={particleSize}
        sizeAttenuation
        depthWrite={false}
        opacity={particleOpacity}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

type GLTFResult2 = GLTF & {
  nodes: {
    Player: THREE.Mesh;
    Cube: THREE.Mesh;
    Plane: THREE.Mesh;
    Weapon: THREE.Mesh;
    Coin1: THREE.Mesh;
    Coin3: THREE.Mesh;
    Coin2: THREE.Mesh;
  };
  materials: {
    Player: THREE.MeshPhysicalMaterial;
    Cube: THREE.MeshPhysicalMaterial;
    ["Material.002"]: THREE.MeshStandardMaterial;
    ["palette.001"]: THREE.MeshStandardMaterial;
    ["palette.004"]: THREE.MeshStandardMaterial;
  };
};

interface ModelV1Props {
  nftPath: string;
  quality?: "standard" | "high";
}

export const ModelV1 = React.memo(
  ({ nftPath, quality = "standard" }: ModelV1Props) => {
    const { nodes, materials } = useGLTF(nftPath) as unknown as GLTFResult2;
    const colorBack = useMemo(() => {
      if (nftPath) {
        return materials["Material.002"]?.color ?? new THREE.Color(0x000000);
      }
      return new THREE.Color(0x000000);
    }, [materials, nftPath]);
    const particlesRef = useRef<THREE.Points>(null);
    const coinRef1 = useRef<THREE.Mesh>(null);
    const coinRef2 = useRef<THREE.Mesh>(null);
    const coinRef3 = useRef<THREE.Mesh>(null);

    const particlesGeometry = useMemo(() => {
      const geometry = new THREE.BufferGeometry();
      const count = 100;
      const positions = new Float32Array(count * 3);

      for (let i = 0; i < count * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 4;
        positions[i + 1] = Math.random() * 4;
        positions[i + 2] = (Math.random() - 0.5) * 4;
      }

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      return geometry;
    }, []);

    useFrame(({ clock }) => {
      const time = clock.getElapsedTime();

      if (particlesRef.current) {
        particlesRef.current.rotation.y = time * 0.1;
        particlesRef.current.rotation.x = Math.sin(time * 0.3) * 0.2;
      }

      if (coinRef1.current) {
        coinRef1.current.rotation.y += 0.02;
        coinRef1.current.position.y = 1.247 + Math.sin(time * 2) * 0.1;
      }

      if (coinRef2.current) {
        coinRef2.current.rotation.y += 0.03;
        coinRef2.current.position.y = 2.017 + Math.sin(time * 1.5) * 0.15;
      }

      if (coinRef3.current) {
        coinRef3.current.rotation.y += 0.025;
        coinRef3.current.position.y = 0.614 + Math.sin(time * 2.5) * 0.08;
      }
    });

    useEffect(() => {
      if (nftPath) {
        const texture = new THREE.TextureLoader().load(nftPath);
        texture.minFilter =
          quality === "high" ? THREE.LinearFilter : THREE.NearestFilter;
        texture.magFilter =
          quality === "high" ? THREE.LinearFilter : THREE.NearestFilter;
        texture.anisotropy = quality === "high" ? 16 : 1;
        materials.Player.emissiveMap = texture;
        materials.Player.emissiveIntensity = 0.5;
        materials.Cube.emissiveIntensity = 1;
      }
    }, [nftPath, quality, materials.Player, materials.Cube]);

    return (
      <group
        scale={[1.8, 1.8, 1.8]}
        position={[0, -2.8, 0]}
        rotation={[0, -Math.PI, 0]}
      >
        <mesh position={[0, 2, 0]}>
          <boxGeometry args={[10, 10, 10]} />
          <meshPhysicalMaterial color={colorBack} side={THREE.BackSide} />
        </mesh>

        <points ref={particlesRef}>
          <primitive object={particlesGeometry} />
          <pointsMaterial
            size={0.001}
            color={colorBack}
            transparent
            opacity={0.6}
            sizeAttenuation
          />
        </points>

        <spotLight
          position={[0, 4, 0]}
          angle={0.3}
          penumbra={0.8}
          intensity={0.2}
          color="#ffffff"
          castShadow
          target-position={[0, 1.97, 0]}
        />

        <mesh
          geometry={nodes.Player.geometry}
          material={materials.Player}
          position={[0, 1.97, 0]}
          castShadow
          receiveShadow
        />
        <mesh
          geometry={nodes.Cube.geometry}
          material={materials.Cube}
          position={[-0.001, 0.505, 0.003]}
          scale={0.5}
          castShadow
          receiveShadow
        />
        <mesh
          geometry={nodes.Weapon.geometry}
          material={nodes.Weapon.material}
          position={nodes.Weapon.position}
          quaternion={nodes.Weapon.quaternion}
          scale={nodes.Weapon.scale}
          receiveShadow
        />
        <mesh
          ref={coinRef1}
          geometry={nodes.Coin1.geometry}
          material={materials["palette.004"]}
          position={[0.565, 1.247, 0.737]}
          rotation={[0.715, 0.536, -2.014]}
          scale={0.234}
        />
        <mesh
          ref={coinRef3}
          geometry={nodes.Coin3.geometry}
          material={materials["palette.004"]}
          position={[-0.944, 0.614, 1]}
          rotation={[0.96, -0.624, -1.083]}
          scale={0.15}
          receiveShadow
        ></mesh>
        <mesh
          ref={coinRef2}
          geometry={nodes.Coin2.geometry}
          material={materials["palette.004"]}
          position={[-0.734, 2.017, -0.409]}
          rotation={[0.468, -0.784, -1.532]}
          scale={0.293}
          receiveShadow
        ></mesh>
      </group>
    );
  },
);

ModelV1.displayName = "ModelV1";
