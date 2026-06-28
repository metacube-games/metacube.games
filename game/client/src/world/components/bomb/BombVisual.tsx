import { useFrame } from "@react-three/fiber";
import { useRef, useState, useMemo, useEffect } from "react";
import React from "react";
import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CIBombManager } from "../../managers/bombManager";
import { type CBombEntity } from "../../../players/model/EntityClasses";

export const BombVisuals = React.memo(() => {
  const [bombs, setBombs] = useState<CBombEntity[]>([]);
  const lastBombsRef = useRef<CBombEntity[]>([]);

  useFrame(() => {
    // Update bombs list every frame to stay reactive
    const activeBombs = CIBombManager.getActiveBombs();

    // Check if bombs changed (length OR different bombs)
    let changed = activeBombs.length !== lastBombsRef.current.length;
    if (!changed) {
      // Same length, check if actual bombs changed
      for (let i = 0; i < activeBombs.length; i++) {
        if (activeBombs[i] !== lastBombsRef.current[i]) {
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      setBombs([...activeBombs]);
      lastBombsRef.current = activeBombs;
    }
  });

  return (
    <>
      {bombs.map((bomb) => (
        <BombMesh key={`${bomb.ownerId}_${bomb.spawnTime}`} bomb={bomb} />
      ))}
    </>
  );
});

BombVisuals.displayName = "BombVisuals";

// Create voxel-style dynamite texture
const createDynamiteTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;

  // Red base for dynamite
  ctx.fillStyle = "#cc0000";
  ctx.fillRect(0, 0, 64, 64);

  // Black stripes (voxel style)
  ctx.fillStyle = "#000000";
  for (let i = 0; i < 64; i += 8) {
    ctx.fillRect(i, 0, 2, 64);
  }

  // Add some horizontal details
  ctx.fillRect(0, 8, 64, 2);
  ctx.fillRect(0, 54, 64, 2);

  // Lighter red highlights (voxel shading)
  ctx.fillStyle = "#ff3333";
  ctx.fillRect(2, 2, 4, 60);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter; // Pixelated look for voxel style
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

// Create shared resources
const dynamiteTexture = createDynamiteTexture();

// Create reusable geometries
const createDynamiteSticks = () => {
  // Create 5 dynamite sticks in a bundle
  const stickGeometry = new THREE.CylinderGeometry(0.12, 0.12, 1, 8);
  const positions = [
    { x: 0, z: 0 }, // Center
    { x: 0.15, z: 0 }, // Right
    { x: -0.15, z: 0 }, // Left
    { x: 0, z: 0.15 }, // Back
    { x: 0, z: -0.15 }, // Front
  ];

  const geometries: THREE.BufferGeometry[] = [];

  positions.forEach((pos) => {
    const geo = stickGeometry.clone();
    geo.translate(pos.x, 0, pos.z);
    geometries.push(geo);
  });

  // Merge all stick geometries into one
  const merged = BufferGeometryUtils.mergeGeometries(geometries);

  return merged;
};

const sticksGeometry = createDynamiteSticks();
const bandGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.15, 8);
const fuseGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6);

// Shared band material (doesn't change per bomb)
const sharedBandMaterial = new THREE.MeshStandardMaterial({
  color: 0x1a1a1a,
  metalness: 0.1,
  roughness: 0.9,
});

// Bomb material factory
const createBombMaterial = () =>
  new THREE.MeshStandardMaterial({
    map: dynamiteTexture,
    color: 0xffffff, // White to not tint the texture
    emissive: 0x330000, // Dark red emissive
    emissiveIntensity: 0.3,
    metalness: 0.2,
    roughness: 0.7,
  });

const createFuseMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    emissive: 0xffaa00,
    emissiveIntensity: 0.5,
  });

interface BombMeshProps {
  bomb: CBombEntity;
}

// Constants for cleaner code
const PULSE_SPEED_MIN = 1.5; // Bips per second when spawned
const PULSE_SPEED_MAX = 3; // Bips per second before explosion
const BASE_SCALE = 0.5;
const PULSE_SCALE_AMOUNT = 0.12;
const TWO_PI = Math.PI * 2;
const Y_OFFSET = 0.5;
const FUSE_Y = 0.65;
const FUSE_ROTATION_X = Math.PI * 0.1;

// Pre-calculated constants
const PULSE_SPEED_RANGE = PULSE_SPEED_MAX - PULSE_SPEED_MIN;
const INV_STAGE_GREEN = 1 / (1 - 0.66);
const INV_STAGE_ORANGE = 1 / (0.66 - 0.33);
const INV_STAGE_RED = 1 / 0.33;

// Color thresholds
const STAGE_GREEN = 0.66; // Above 66% time left = green
const STAGE_ORANGE = 0.33; // Above 33% time left = orange

// Pre-allocated objects for reuse (avoid allocations in hot path)
const tempPosition = new THREE.Vector3();

// Optimized: Inline color calculation to avoid object allocation
const updateBombGlow = (
  material: THREE.MeshStandardMaterial,
  ratio: number,
  normalizedPulse: number,
) => {
  let emissiveColor: number;
  let emissiveIntensity: number;

  if (ratio > STAGE_GREEN) {
    // Stage 1: Green glow (safe)
    const t = (ratio - STAGE_GREEN) * INV_STAGE_GREEN;
    const red = (50 + (1 - t) * 155) | 0; // Use bitwise OR for fast floor
    emissiveColor = (red << 16) | (220 << 8) | 20;
    emissiveIntensity = normalizedPulse * 0.2;
  } else if (ratio > STAGE_ORANGE) {
    // Stage 2: Orange glow (warning)
    const t = (ratio - STAGE_ORANGE) * INV_STAGE_ORANGE;
    const red = (205 + (1 - t) * 50) | 0;
    const green = (220 - (1 - t) * 120) | 0;
    emissiveColor = (red << 16) | (green << 8);
    emissiveIntensity = 0.05 + normalizedPulse * 0.3;
  } else {
    // Stage 3: Red glow (DANGER!)
    const t = ratio * INV_STAGE_RED;
    const green = (100 * t) | 0;
    emissiveColor = (255 << 16) | (green << 8);
    emissiveIntensity = 0.1 + normalizedPulse * 0.5;
  }

  material.emissive.setHex(emissiveColor);
  material.emissiveIntensity = emissiveIntensity;
};

// Optimized: Inline fuse color update
const updateFuseGlow = (
  material: THREE.MeshStandardMaterial,
  ratio: number,
  normalizedPulse: number,
) => {
  let fuseColor: number;

  if (ratio > STAGE_GREEN) {
    fuseColor = 0xffffaa; // Yellow-White
  } else if (ratio > STAGE_ORANGE) {
    fuseColor = 0xffaa00; // Orange
  } else {
    // Red-White (critical!)
    const t = ratio * INV_STAGE_RED;
    const red = 255;
    const green = (220 * t) | 0;
    const blue = (200 * t) | 0;
    fuseColor = (red << 16) | (green << 8) | blue;
  }

  material.color.setHex(fuseColor);
  material.emissive.setHex(fuseColor);
  material.emissiveIntensity = 0.2 + (1 - ratio) * 0.4 + normalizedPulse * 0.6;
};

const BombMesh = React.memo(({ bomb }: BombMeshProps) => {
  const groupRef = useRef<THREE.Group>(null);

  // Use useMemo to create materials only once
  const sticksMaterial = useMemo(() => createBombMaterial(), []);
  const fuseMaterial = useMemo(() => createFuseMaterial(), []);

  // Cleanup materials on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      sticksMaterial.dispose();
      fuseMaterial.dispose();
    };
  }, [sticksMaterial, fuseMaterial]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    // Calculate time remaining based on bomb's own lifetime
    const now = performance.now();
    const bombAge = now - bomb.spawnTime;
    const bombAgeSeconds = bombAge * 0.001;

    // After fuse expires, loop within the red danger zone at max speed
    // while waiting for the server BOMB_EXPLODED message
    const ratio =
      bombAge < bomb.fuseTime
        ? 1 - bombAge / bomb.fuseTime
        : STAGE_ORANGE *
          0.5 *
          (1 + Math.sin(bombAgeSeconds * PULSE_SPEED_MAX * TWO_PI));

    // Update position using pre-allocated vector
    tempPosition.set(
      bomb.position[0],
      bomb.position[1] + Y_OFFSET,
      bomb.position[2],
    );
    group.position.copy(tempPosition);

    // Pulsing effect using bomb's own age
    const pulseSpeed = PULSE_SPEED_MIN + (1 - ratio) * PULSE_SPEED_RANGE;
    const pulse = Math.sin(bombAgeSeconds * pulseSpeed * TWO_PI);
    const normalizedPulse = (pulse + 1) * 0.5; // Faster than division by 2
    // Apply bomb type scaling: bomb.scale determines base size (0.7× to 2.0×)
    const bombTypeScale = bomb.scale || 1.0; // Default to 1.0 if not set
    const scale =
      (1 + pulse * PULSE_SCALE_AMOUNT * pulseSpeed) *
      BASE_SCALE *
      bombTypeScale;
    group.scale.setScalar(scale);

    // Update materials using optimized inline functions
    updateBombGlow(sticksMaterial, ratio, normalizedPulse);
    updateFuseGlow(fuseMaterial, ratio, normalizedPulse);
  });

  return (
    <group ref={groupRef}>
      {/* Dynamite sticks */}
      <mesh geometry={sticksGeometry} material={sticksMaterial} />

      {/* Black band/tape */}
      <mesh geometry={bandGeometry} material={sharedBandMaterial} />

      {/* Fuse */}
      <mesh
        geometry={fuseGeometry}
        material={fuseMaterial}
        position={[0, FUSE_Y, 0]}
        rotation={[FUSE_ROTATION_X, 0, 0]}
      />
    </group>
  );
});

BombMesh.displayName = "BombMesh";
