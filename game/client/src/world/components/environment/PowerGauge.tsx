import React, {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { type T3DP } from "../../../Types/T3DP";
import { clamp } from "../../../helpers/clamp";
import { CIMetacubeStates } from "../../model/MetacubeStates";
import emitter from "../../../helpers/EventEmitter";

const LAYERINDEXMAP = {
  0: { lId: 5, layerCubes: 4734976, totalCubes: 4734976, alreadyDestroyed: 0 },
  1: {
    lId: 4,
    layerCubes: 8519680 - 4734976,
    totalCubes: 8519680,
    alreadyDestroyed: 4734976,
  },
  2: {
    lId: 3,
    layerCubes: 11862016 - 8519680,
    totalCubes: 11862016,
    alreadyDestroyed: 8519680,
  },
  3: {
    lId: 2,
    layerCubes: 15302656 - 11862016,
    totalCubes: 15302656,
    alreadyDestroyed: 11862016,
  },
  4: {
    lId: 1,
    layerCubes: 16744448 - 15302656,
    totalCubes: 16744448,
    alreadyDestroyed: 15302656,
  },
  5: {
    lId: 0,
    layerCubes: 16777216 - 16744448,
    totalCubes: CIMetacubeStates.totalNbCube,
    alreadyDestroyed: 16744448,
  },
};

const TOWERS = [
  [[38, 5, -22], Math.PI / 2],
  [[38, 5, -60], Math.PI / 2],
  [[227, 5, -22], Math.PI / 2],
  [[227, 5, -60], Math.PI / 2],
  [[152, 5, -65], 0],
  [[87, 5, -91], 0],
];

export const PowerGauges = React.memo(() => {
  const [currentLayer, setCurrentLayer] = useState(() =>
    CIMetacubeStates.getCurrLayer(),
  );

  useEffect(() => {
    const onListener = (layer: number) => {
      startTransition(() => {
        setCurrentLayer(layer);
      });
    };
    const listener1 = emitter.addListener("initLayer", onListener);
    const listener2 = emitter.addListener("changeLayer", onListener);

    return () => {
      listener1.remove();
      listener2.remove();
    };
  }, []);

  return (
    <>
      {TOWERS.map((tower, index) => {
        const layerV = LAYERINDEXMAP[index as keyof typeof LAYERINDEXMAP];
        if (currentLayer > 7) return;
        if (layerV.lId > currentLayer) return;
        const position = tower[0] as T3DP;
        const rotationY = tower[1] as number;
        return (
          <PowerGauge
            key={`${position[0]},${position[1]},${position[2]}:${rotationY}`}
            layerV={layerV}
            position={position}
            rotationY={rotationY}
            colorShade={0x55ff55}
          />
        );
      })}
    </>
  );
});

const PowerGauge = React.memo(
  ({
    layerV,
    position,
    rotationY,
    colorShade,
  }: {
    layerV: {
      lId: number;
      layerCubes: number;
      totalCubes: number;
      alreadyDestroyed: number;
    };
    position: T3DP;
    rotationY: number;
    colorShade: number;
  }) => {
    const planeHeight = 47;
    const pHOffset = 46.94;
    const radius = 0.02;
    const particleCount = 3000;

    // Create material and geometry once
    const pointMaterial = useMemo(
      () =>
        new THREE.PointsMaterial({
          color: colorShade,
          size: 0.12,
          opacity: 0.8,
          transparent: true,
        }),
      [colorShade],
    );

    const pointsGeom = useMemo(() => {
      const geom = new THREE.BufferGeometry();
      // Ensure we allocate enough buffer space with some extra padding
      const vertices = new Float32Array(particleCount * 3 + 90); // Add padding to prevent buffer overflows
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        if (idx + 2 < vertices.length) {
          // Safety check to prevent buffer overflow
          vertices[idx] = Math.random() * 4; // x
          vertices[idx + 1] = Math.random() * planeHeight; // y
          vertices[idx + 2] = -Math.random() * 2; // z
        }
      }
      geom.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3),
      );
      return geom;
    }, [particleCount, planeHeight]);

    useEffect(
      () => () => {
        pointsGeom.dispose();
        pointMaterial.dispose();
      },
      [pointsGeom, pointMaterial],
    );

    const initTime = useRef<number | null>(null);
    if (initTime.current === null) initTime.current = performance.now();
    const positions = useRef<Float32Array>(null);
    const bufferSize = useRef<number>(0);

    useFrame(() => {
      if (!positions.current) {
        positions.current = pointsGeom.getAttribute("position")
          .array as Float32Array;
        bufferSize.current = positions.current.length;
      }
      const nbCubeDestroyed =
        CIMetacubeStates.totalNbCube - CIMetacubeStates.nbCubeLeft.val;
      const time = (performance.now() - initTime.current!) / 1000;
      const posArray = positions.current;

      const progress =
        layerV.lId !== CIMetacubeStates.currentLayer
          ? 1
          : Math.min(
              1,
              (layerV.totalCubes - nbCubeDestroyed) / layerV.layerCubes,
            );

      const totalParticles = Math.floor(posArray.length / 3); // Each particle has 3 coordinates (x, y, z)
      const activeParticles = Math.ceil(totalParticles * progress);
      const maxHeight = pHOffset * progress; // Scale max height with progress

      for (let i = 0; i < posArray.length; i += 3) {
        // Safety check to ensure we don't exceed the buffer size
        if (i + 2 >= bufferSize.current) {
          continue;
        }

        const isActive = i / 3 < activeParticles;

        const originalX = posArray[i];
        const originalZ = posArray[i + 2];

        if (isActive) {
          // Animate active particles
          const phase = time + i; // using index i as offset for variety
          const cosOffset = radius * Math.cos(phase);
          const sinOffset = radius * Math.sin(phase);

          // Calculate target height based on particle index to ensure even distribution
          const particleIndex = i / 3;
          const normalizedIndex = particleIndex / activeParticles; // 0 to 1
          const targetHeight = 0.06 + (maxHeight - 0.06) * normalizedIndex;

          posArray[i] = clamp(originalX + cosOffset, 0.06, 3.94); // X
          posArray[i + 1] = clamp(targetHeight, 0.06, maxHeight); // Y distributed evenly
          posArray[i + 2] = clamp(originalZ + sinOffset, -1.94, -0.06); // Z
        } else {
          // Move inactive particles off-screen or to a default position
          posArray[i] = 9999; // Move X off-screen
          posArray[i + 1] = 9999; // Move Y off-screen
          posArray[i + 2] = 9999; // Move Z off-screen
        }
      }

      pointsGeom.getAttribute("position").needsUpdate = true;
    }, 3);

    return (
      <points
        position={position}
        rotation-y={rotationY}
        geometry={pointsGeom}
        material={pointMaterial}
      />
    );
  },
);
