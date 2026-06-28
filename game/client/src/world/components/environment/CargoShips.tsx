import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const CargoShips = React.memo(() => {
  const cargoInstances = useRef<THREE.InstancedMesh>(null!);
  const cargoCount = 2;

  const cargoGeometry = useMemo(() => {
    // Create ship parts with reusable dimensions
    const dimensions = {
      mainBody: [20, 15, 80],
      upperHull: [18, 5, 70],
      bridge: [12, 8, 15],
      commandTower: [8, 12, 10],
      fin: [3, 15, 30],
      railGun: [4, 4, 40],
      thruster: {
        main: [12, 8, 5],
        side: [5, 5, 8],
        mainGlow: [10, 6, 2],
        sideGlow: [4, 4, 2],
      },
    };

    const geometries = [];

    // Main body
    geometries.push(new THREE.BoxGeometry(...dimensions.mainBody));

    // Upper hull
    const upperHull = new THREE.BoxGeometry(...dimensions.upperHull);
    upperHull.translate(0, 10, 0);
    geometries.push(upperHull);

    // Bridge
    const bridge = new THREE.BoxGeometry(...dimensions.bridge);
    bridge.translate(0, 15, -25);
    geometries.push(bridge);

    // Command tower
    const commandTower = new THREE.BoxGeometry(...dimensions.commandTower);
    commandTower.translate(0, 20, -20);
    geometries.push(commandTower);

    // Fins - create once and clone for efficiency
    const leftFin = new THREE.BoxGeometry(...dimensions.fin);
    leftFin.translate(-12, 5, 10);
    leftFin.rotateZ(Math.PI / 6);
    geometries.push(leftFin);

    const rightFin = leftFin.clone();
    rightFin.scale(-1, 1, 1); // Mirror along X
    geometries.push(rightFin);

    // Rail guns - create once and clone
    const leftRailGun = new THREE.BoxGeometry(...dimensions.railGun);
    leftRailGun.translate(-8, 5, -30);
    geometries.push(leftRailGun);

    const rightRailGun = leftRailGun.clone();
    rightRailGun.translate(16, 0, 0);
    geometries.push(rightRailGun);

    // Missile bays - use a loop with a single geometry instance
    const bayGeometry = new THREE.BoxGeometry(4, 2, 5);
    for (let i = 0; i < 6; i++) {
      const bay = bayGeometry.clone();
      bay.translate(i % 2 === 0 ? -8 : 8, 8, -10 + i * 5);
      geometries.push(bay);
    }

    // Thrusters
    const mainThruster = new THREE.BoxGeometry(...dimensions.thruster.main);
    mainThruster.translate(0, 5, 40);
    geometries.push(mainThruster);

    const leftThruster = new THREE.BoxGeometry(...dimensions.thruster.side);
    leftThruster.translate(-8, 5, 38);
    geometries.push(leftThruster);

    const rightThruster = leftThruster.clone();
    rightThruster.translate(16, 0, 0);
    geometries.push(rightThruster);

    // Thruster glows
    const mainThrusterGlow = new THREE.BoxGeometry(
      ...dimensions.thruster.mainGlow,
    );
    mainThrusterGlow.translate(0, 5, 43);
    geometries.push(mainThrusterGlow);

    const leftThrusterGlow = new THREE.BoxGeometry(
      ...dimensions.thruster.sideGlow,
    );
    leftThrusterGlow.translate(-8, 5, 42);
    geometries.push(leftThrusterGlow);

    const rightThrusterGlow = leftThrusterGlow.clone();
    rightThrusterGlow.translate(16, 0, 0);
    geometries.push(rightThrusterGlow);

    // Armor plates
    const plateBase = new THREE.BoxGeometry(22, 2, 8);
    for (let i = 0; i < 8; i++) {
      const plate = plateBase.clone();
      const scale = 1 - i * 0.07;
      plate.scale(scale, 1, 1);
      plate.translate(0, -6, -30 + i * 10);
      geometries.push(plate);
    }

    // Sensor array and antennas
    const sensorArray = new THREE.BoxGeometry(15, 1, 10);
    sensorArray.translate(0, 22, -15);
    geometries.push(sensorArray);

    const antenna1 = new THREE.BoxGeometry(1, 10, 1);
    antenna1.translate(-4, 25, -18);
    geometries.push(antenna1);

    const antenna2 = new THREE.BoxGeometry(1, 8, 1);
    antenna2.translate(4, 24, -18);
    geometries.push(antenna2);

    return BufferGeometryUtils.mergeGeometries(geometries);
  }, []);

  // Texture
  const cargoTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // Base color
      ctx.fillStyle = "#111111";
      ctx.fillRect(0, 0, 512, 512);

      // Grid pattern
      ctx.strokeStyle = "#0a3a0a";
      ctx.lineWidth = 1;
      const gridSize = 64;
      ctx.beginPath();
      for (let i = 0; i < 512; i += gridSize) {
        ctx.moveTo(0, i);
        ctx.lineTo(512, i);
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
      }
      ctx.stroke();

      // Tech patterns
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "#00ff00";
      for (let i = 0; i < 10; i++) {
        ctx.fillRect(
          Math.random() * 512,
          Math.random() * 512,
          50 + Math.random() * 100,
          8 + Math.random() * 10,
        );
      }
      ctx.globalAlpha = 1.0;

      // Circuit patterns
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const x = Math.random() * 412;
        const y = Math.random() * 412;
        ctx.moveTo(x, y);
        ctx.lineTo(x + 50, y);
        ctx.lineTo(x + 50, y + 50);
        ctx.lineTo(x + 100, y + 50);
      }
      ctx.stroke();

      // Warning markings - batch rendering
      ctx.fillStyle = "#00ff00";
      for (let i = 0; i < 3; i++) {
        const y = 100 + i * 150;
        for (let j = 0; j < 8; j++) {
          ctx.fillRect(j * 70, y, 35, 10);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);

    return texture;
  }, []);

  // material.dispose() does not cascade to textures, so dispose the CanvasTexture explicitly on unmount
  useEffect(() => () => cargoTexture.dispose(), [cargoTexture]);

  const cargoMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: cargoTexture,
      roughness: 0.4,
      metalness: 0.8,
    });
  }, [cargoTexture]);

  // Create a reusable dummy object and positions
  const cargoDummy = useMemo(() => new THREE.Object3D(), []);
  const positions = useMemo(() => {
    return Array(cargoCount)
      .fill(0)
      .map((_, i) => ({
        x: -200 + i * 600,
        y: -50 + i * 100,
        z: -2000 + i * 350,
      }));
  }, [cargoCount]);

  // Pre-set the scale and initial rotation once
  useEffect(() => {
    cargoDummy.scale.set(4, 4, 4);
    cargoDummy.rotation.y = Math.PI / 3;
  }, [cargoDummy]);

  useFrame(() => {
    if (!cargoInstances.current) return;

    const time = performance.now() * 0.002;
    const sinValue = Math.sin(time * 0.1) * 0.03;

    for (let i = 0; i < cargoCount; i++) {
      const pos = positions[i];

      // Update position with time
      cargoDummy.position.set(pos.x + time, pos.y, pos.z + time);

      // Only update z rotation, keeping y constant
      cargoDummy.rotation.z = sinValue;

      // Update matrix and set instance
      cargoDummy.updateMatrix();
      cargoInstances.current.setMatrixAt(i, cargoDummy.matrix);
    }

    cargoInstances.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={cargoInstances}
      args={[cargoGeometry, cargoMaterial, cargoCount]}
      frustumCulled={false}
    />
  );
});
