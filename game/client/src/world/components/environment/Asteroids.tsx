import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import cubeTexture from "../../../assets/cubeTextures/0.png";

// Utility component for the circular field
function CircularField({
  radius = 500,
  instanceLen = 300,
  texture,
  yOffset = 0,
  rotationSpeed = 0.5,
}: {
  radius?: number;
  instanceLen?: number;
  texture: THREE.Texture;
  yOffset?: number;
  rotationSpeed?: number;
}) {
  const circularMeshRef = useRef<THREE.InstancedMesh>(null!);
  const tempObjectRef = useRef<THREE.Object3D | null>(null);
  if (tempObjectRef.current === null)
    tempObjectRef.current = new THREE.Object3D();
  const tempObject = tempObjectRef.current;
  const randomOffsets = useMemo(
    () =>
      Array.from({ length: instanceLen }).map(() => ({
        rotationSpeed: Math.random() * 0.01 + rotationSpeed,
        orbitOffset: Math.random() * Math.PI * 10, // random orbit phase
        scale: {
          x: Math.random() + 0.7,
          y: Math.random() + 0.7,
          z: Math.random() + 0.7,
        },
        selfRotationSpeed: {
          x: Math.random() * 0.0001,
          y: Math.random() * 0.0001,
          z: Math.random() * 0.0001,
        },
      })),
    [instanceLen, rotationSpeed],
  );

  useFrame(() => {
    const time = performance.now() / 1000 / 10;

    for (let i = 0; i < instanceLen; i++) {
      const angle =
        (i / instanceLen) * Math.PI * 2 +
        time * randomOffsets[i].rotationSpeed +
        randomOffsets[i].orbitOffset;
      const dynamicRadius = radius + Math.sin(time * 0.3 + i) * 180;

      const x = dynamicRadius * Math.cos(angle);
      const y = (Math.sin(time * 0.2 + i) - 0.5) * 10; // randomized vertical motion
      const z = dynamicRadius * Math.sin(angle);

      tempObject.position.set(x, y, z);

      tempObject.rotation.x += randomOffsets[i].selfRotationSpeed.x;
      tempObject.rotation.y += randomOffsets[i].selfRotationSpeed.y;
      tempObject.rotation.z += randomOffsets[i].selfRotationSpeed.z;
      // add random scaling between 0.7 and 7
      tempObject.scale.set(
        randomOffsets[i].scale.x,
        randomOffsets[i].scale.y,
        randomOffsets[i].scale.z,
      );

      tempObject.updateMatrix();
      circularMeshRef.current.setMatrixAt(i, tempObject.matrix);
    }
    circularMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={circularMeshRef}
      args={[undefined, undefined, instanceLen]}
      frustumCulled={false}
      position={[128, yOffset, 128]}
    >
      <boxGeometry args={[10, 10, 10]} />
      <meshBasicMaterial side={THREE.FrontSide} map={texture} />
    </instancedMesh>
  );
}

export const Asteroids = React.memo(() => {
  const instanceLen = 166;
  const texture = useTexture(cubeTexture);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.repeat.set(10, 10);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const tempObjectRef = useRef<THREE.Object3D | null>(null);
  if (tempObjectRef.current === null)
    tempObjectRef.current = new THREE.Object3D();
  const tempObject = tempObjectRef.current;

  // Pre-compute positions once to avoid nested loops on every render
  const positions = useMemo(() => {
    const result: [number, number, number][] = [];
    const offsetXArr = [-420, -200, -300];
    const offsetYArr = [-170, 370, 380];
    const offsetZArr = [240, -100, -200];

    for (let y = 0; y < offsetXArr.length; y++) {
      const offsetX = offsetXArr[y];
      const offsetY = offsetYArr[y];
      const offsetZ = offsetZArr[y];
      for (let x = 0; x < 5; x++) {
        for (let z = 0; z < 5; z++) {
          const radius = Math.random() * 200 + 200;
          const posX = radius + x * 50 + offsetX;
          const posY = radius + offsetY;
          const posZ = radius + z * 50 + offsetZ;
          result.push([posX, posY, posZ]);
        }
      }
    }

    for (let x = 0; x < 7; x++) {
      for (let z = 0; z < 13; z++) {
        const radius = Math.random() * 200;
        const posX = (radius + x * 50 - 180) * 2;
        const posY = radius - 360;
        const posZ = (radius + z * 40 - 250) * 2;
        result.push([posX, posY, posZ]);
      }
    }

    return result;
  }, []); // Computed once on mount

  useFrame(() => {
    const time = performance.now() / 1000 / 10;

    for (let i = 0; i < instanceLen; i++) {
      tempObject.rotation.y = Math.sin(i * 0.25 + time);
      tempObject.rotation.z = tempObject.rotation.y * 2;
      tempObject.position.set(...positions[i]);
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, instanceLen]}
        frustumCulled={false}
      >
        <boxGeometry args={[10, 10, 10]} />
        <meshStandardMaterial
          side={THREE.FrontSide}
          map={texture}
          emissive={0x222222}
          roughness={1}
        />
      </instancedMesh>

      {/* Reusable circular orbiting asteroid field */}
      <CircularField
        radius={500}
        instanceLen={300}
        texture={texture}
        yOffset={550}
      />
      <CircularField
        radius={1500}
        instanceLen={150}
        texture={texture}
        yOffset={-50}
        rotationSpeed={-0.1}
      />
    </>
  );
});
