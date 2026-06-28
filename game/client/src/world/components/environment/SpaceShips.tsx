import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

const vec3Dummy1 = new THREE.Vector3();
const vec3Dummy2 = new THREE.Vector3();
const vec3Dummy3 = new THREE.Vector3();

export const SpaceShips = React.memo(() => {
  const spaceshipCount = 40;
  const spaceshipInstances = useRef<THREE.InstancedMesh>(null!);
  const spaceshipDummy = useMemo(() => {
    const dummy = new THREE.Object3D();
    dummy.scale.set(2, 2, 2);
    return dummy;
  }, []);

  const spaceshipGeometry = useMemo(() => {
    const bodyGeometry = new THREE.BoxGeometry(2, 2, 6);
    const wingGeometry = new THREE.BoxGeometry(1, 4, 1);
    const cockpitGeometry = new THREE.BoxGeometry(1, 1, 2);

    const bodyMatrix = new THREE.Matrix4().makeTranslation(0, 0, 0);
    const wingMatrix = new THREE.Matrix4().makeTranslation(1.5, 0, 0);
    const cockpitMatrix = new THREE.Matrix4().makeTranslation(-3, 0, 0);

    const geometries = [
      bodyGeometry.clone().applyMatrix4(bodyMatrix),
      wingGeometry.clone().applyMatrix4(wingMatrix),
      cockpitGeometry.clone().applyMatrix4(cockpitMatrix),
    ];
    return BufferGeometryUtils.mergeGeometries(geometries);
  }, []);

  const spaceshipMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0x003300,
      metalness: 0.3,
      roughness: 0.7,
      emissive: 0x003300,
      emissiveIntensity: 0.3,
    });
  }, []);

  const orbits = useMemo(() => {
    return Array.from({ length: spaceshipCount }, () => {
      const radius = 900 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const orbitAxis = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
      ).normalize();

      const orbitPerpendicular = new THREE.Vector3()
        .crossVectors(orbitAxis, new THREE.Vector3(0, 1, 0))
        .normalize();

      return {
        radius,
        speed: 0.8 + Math.random() * 0.1,
        phase: Math.random() * Math.PI * 2,
        orbitAxis,
        orbitPerpendicular,
      };
    });
  }, [spaceshipCount]);

  useFrame(() => {
    if (!spaceshipInstances.current) return;

    const time = performance.now() * 0.0001;

    for (let i = 0; i < spaceshipCount; i++) {
      const orbit = orbits[i];
      const angle = time * orbit.speed + orbit.phase;

      const position = vec3Dummy1
        .copy(orbit.orbitPerpendicular)
        .multiplyScalar(Math.sin(angle) * orbit.radius)
        .add(
          vec3Dummy2
            .crossVectors(orbit.orbitAxis, orbit.orbitPerpendicular)
            .multiplyScalar(Math.cos(angle) * orbit.radius),
        );

      spaceshipDummy.position.copy(position);

      const direction = vec3Dummy3
        .crossVectors(position, orbit.orbitAxis)
        .normalize();

      spaceshipDummy.lookAt(spaceshipDummy.position.clone().add(direction));
      spaceshipDummy.rotation.x = Math.sin(angle * 3) * 0.1;

      spaceshipDummy.updateMatrix();
      spaceshipInstances.current.setMatrixAt(i, spaceshipDummy.matrix);
    }

    spaceshipInstances.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={spaceshipInstances}
      args={[spaceshipGeometry, spaceshipMaterial, spaceshipCount]}
      frustumCulled={false}
      visible={true}
    />
  );
});
