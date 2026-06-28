import React, { useRef, useEffect, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { getWorld } from "../../model/VoxelWorld";
import { workerPool } from "../../model/WorkerPool";
import { useGStore } from "../../../menu/useGeneralStore";
import { type TRenderingData } from "../../../Types/TRenderingData";

import colorMap from "../../../assets/cubeTextures/chunks/color.png";
import lightMap from "../../../assets/cubeTextures/chunks/light.png";
import metalnessMap from "../../../assets/cubeTextures/chunks/metalness.png";
import roughnessMap from "../../../assets/cubeTextures/chunks/roughness.png";

// Emissive animation constants
const EMISSIVE_MIN = 0;
const EMISSIVE_MAX = 1.5;
const EMISSIVE_STEP = 0.75; // Adjusted to per-second basis

// Geometry performance and safety constants
const MAX_VERTEX_COUNT = 1_000_000; // Maximum vertices per geometry (safety limit)
const MAX_BUFFER_SIZE_MB = 128; // Maximum buffer size in megabytes
const MAX_BUFFER_SIZE_BYTES = MAX_BUFFER_SIZE_MB * 1024 * 1024; // 128MB in bytes
const BYTES_PER_FLOAT = 4;
const BYTES_PER_UINT16 = 2;
const BYTES_PER_UINT32 = 4;

const setOrUpdateAttribute = (
  geometry: THREE.BufferGeometry,
  name: string,
  array: THREE.TypedArray,
  itemSize: number,
) => {
  const attribute = geometry.getAttribute(name) as THREE.BufferAttribute;

  if (attribute && array.length > attribute.array.length) {
    geometry.setAttribute(
      name,
      new THREE.BufferAttribute(array, itemSize).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    return true;
  }
  else if (attribute && attribute.count === array.length / itemSize) {
    attribute.array.set(array);
    attribute.needsUpdate = true;
    return true;
  }
  else {
    geometry.setAttribute(
      name,
      new THREE.BufferAttribute(array, itemSize).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    return true;
  }
};

const setOrUpdateIndex = (
  geometry: THREE.BufferGeometry,
  array: Uint16Array | Uint32Array,
) => {
  // Loop instead of Math.max(...array) to avoid call-stack overflow on large arrays.
  let maxIndex = 0;
  for (let i = 0; i < array.length; i++) {
    if (array[i] > maxIndex) maxIndex = array[i];
  }
  const needsUint32 = maxIndex > 65535;

  let typedArray = array;
  if (needsUint32 && array instanceof Uint16Array) {
    const temp = new Uint32Array(array.length);
    temp.set(array, 0);
    typedArray = temp;
  }

  const indexAttr = geometry.getIndex() as THREE.BufferAttribute;

  if (indexAttr) {
    if (typedArray.length > indexAttr.array.length) {
      geometry.setIndex(
        new THREE.BufferAttribute(typedArray, 1).setUsage(
          THREE.DynamicDrawUsage,
        ),
      );
    }
    // Copy in place only if widths match; a Uint16 buffer can't hold indices > 65535.
    else if (
      indexAttr.count === typedArray.length &&
      (!needsUint32 || indexAttr.array instanceof Uint32Array)
    ) {
      indexAttr.array.set(typedArray);
      indexAttr.needsUpdate = true;
    }
    else {
      geometry.setIndex(
        new THREE.BufferAttribute(typedArray, 1).setUsage(
          THREE.DynamicDrawUsage,
        ),
      );
    }
  } else {
    geometry.setIndex(
      new THREE.BufferAttribute(typedArray, 1).setUsage(THREE.DynamicDrawUsage),
    );
  }

  return true;
};

export const Chunks: React.FC = React.memo(() => {
  const RTR = useGStore((state) => state.readyToRender);
  const chunksRef = useRef<THREE.Group>(null!);
  const world = getWorld();
  const nbSideCell = world?.nbSideCells ?? 512;

  const globalSphere = useMemo(() => {
    const size = world?.cellSize ?? 32;
    return new THREE.Sphere(
      new THREE.Vector3(size / 2, size / 2, size / 2),
      (size * Math.sqrt(3)) / 2,
    );
  }, [world?.cellSize]);

  const materialAtlas = useAtlasMaterial();
  useEmissiveVariations(materialAtlas);

  const idToMeshMap = useRef<Map<number, THREE.Mesh> | null>(null);
  if (idToMeshMap.current === null)
    idToMeshMap.current = new Map<number, THREE.Mesh>();

  useEffect(() => {
    if (workerPool) {
      workerPool.updatedCellsID = new Set(
        Array.from({ length: nbSideCell }, (_, i) => i),
      );
    }
  }, [nbSideCell]);

  const updateGeometryAttributes = (
    geometry: THREE.BufferGeometry,
    { positions, normals, uvs, colors, indices }: TRenderingData,
  ) => {
    // Check overall geometry size first to avoid trying to create massive geometries
    const totalVertexCount = positions.length / 3;
    if (totalVertexCount > MAX_VERTEX_COUNT) {
      console.warn(
        `Geometry exceeds safe vertex count (${totalVertexCount} vertices), skipping`,
      );
      return false;
    }

    const totalBufferSize =
      positions.length * BYTES_PER_FLOAT +
      normals.length * BYTES_PER_FLOAT +
      uvs.length * BYTES_PER_FLOAT +
      colors.length * BYTES_PER_FLOAT +
      indices.length *
        (indices instanceof Uint16Array ? BYTES_PER_UINT16 : BYTES_PER_UINT32);

    if (totalBufferSize > MAX_BUFFER_SIZE_BYTES) {
      console.warn(
        `Geometry exceeds safe buffer size (${(
          totalBufferSize /
          (1024 * 1024)
        ).toFixed(2)}MB), skipping`,
      );
      return false;
    }

    const posSuccess = setOrUpdateAttribute(geometry, "position", positions, 3);
    const normSuccess = setOrUpdateAttribute(geometry, "normal", normals, 3);
    const uvSuccess = setOrUpdateAttribute(geometry, "uv", uvs, 2);
    const colorSuccess = setOrUpdateAttribute(geometry, "color", colors, 3);
    const indexSuccess = setOrUpdateIndex(geometry, indices);

    return (
      posSuccess && normSuccess && uvSuccess && colorSuccess && indexSuccess
    );
  };

  useFrame(() => {
    if (!RTR || !chunksRef.current || !world || !workerPool) return;

    const meshMap = idToMeshMap.current!;
    const updatedIds = workerPool.getUpdatedCellsIDs();
    const updatedLightIds = workerPool.getUpdatedLightIDs();
    const worldData = world.getRenderingData();

    for (const id of updatedLightIds) {
      workerPool.removeUpdatedLightID(id);
      const colorData = worldData[id]?.colors;
      const mesh = meshMap.get(id);
      if (colorData && mesh) {
        setOrUpdateAttribute(mesh.geometry, "color", colorData, 3);
      }
    }

    for (const id of updatedIds) {
      workerPool.removeUpdatedCellID(id);
      const cellData = worldData[id];
      if (!cellData) continue;

      let mesh = meshMap.get(id);

      try {
        if (!mesh) {
          if (cellData.positions.length === 0) continue;

          const geometry = new THREE.BufferGeometry();
          mesh = new THREE.Mesh(geometry, materialAtlas);

          const cellCoords = world.computeCellFromCellId(id);
          const size = world.cellSize;
          mesh.position.set(
            cellCoords[0] * size,
            cellCoords[1] * size,
            cellCoords[2] * size,
          );

          mesh.frustumCulled = true;
          mesh.matrixAutoUpdate = false;
          mesh.updateMatrix();

          const success = updateGeometryAttributes(mesh.geometry, cellData);
          if (!success) {
            console.warn(`Failed to create geometry for chunk ${id}, skipping`);
            mesh.geometry.dispose();
            continue;
          }

          mesh.geometry.boundingSphere = globalSphere;
          chunksRef.current.add(mesh);
          meshMap.set(id, mesh);
        } else {
          if (cellData.positions.length === 0) {
            mesh.geometry.dispose();
            chunksRef.current.remove(mesh);
            meshMap.delete(id);
          } else {
            const success = updateGeometryAttributes(mesh.geometry, cellData);
            if (!success) {
              console.warn(
                `Failed to update geometry for chunk ${id}, skipping`,
              );
              // Keep the old geometry instead of failing
            }
          }
        }
      } catch (error) {
        console.error(`Error processing chunk ${id}:`, error);
        if (mesh && !meshMap.has(id)) {
          mesh.geometry.dispose();
        }
      }
    }
  });

  return <group ref={chunksRef} />;
});

function useAtlasMaterial() {
  const [color, light, metalness, roughness] = useLoader(THREE.TextureLoader, [
    colorMap,
    lightMap,
    metalnessMap,
    roughnessMap,
  ]);

  useEffect(() => {
    [color, light, metalness, roughness].forEach((texture) => {
      texture.matrixAutoUpdate = false;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
    });
  }, [color, light, metalness, roughness]);

  const materialAtlas = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        side: THREE.FrontSide,
        vertexColors: true,
        map: color,
        emissiveMap: light,
        metalnessMap: metalness,
        roughnessMap: roughness,
        aoMap: light,
        aoMapIntensity: 0.05,
        emissive: new THREE.Color(0.2, 0.2, 0.2),
        emissiveIntensity: 0.3,
      }),
    [color, light, metalness, roughness],
  );

  useEffect(() => {
    return () => {
      materialAtlas.dispose();
      color.dispose();
      light.dispose();
      metalness.dispose();
      roughness.dispose();
    };
  }, [materialAtlas, color, light, metalness, roughness]);

  return materialAtlas;
}

function useEmissiveVariations(materialAtlas: THREE.MeshStandardMaterial) {
  const increasingRef = useRef(true);

  useFrame((_, delta) => {
    const intensityChange = EMISSIVE_STEP * delta;

    if (increasingRef.current) {
      materialAtlas.emissiveIntensity = Math.min(
        EMISSIVE_MAX,
        materialAtlas.emissiveIntensity + intensityChange,
      );
      if (materialAtlas.emissiveIntensity >= EMISSIVE_MAX) {
        increasingRef.current = false;
      }
    } else {
      materialAtlas.emissiveIntensity = Math.max(
        EMISSIVE_MIN,
        materialAtlas.emissiveIntensity - intensityChange,
      );
      if (materialAtlas.emissiveIntensity <= EMISSIVE_MIN) {
        increasingRef.current = true;
      }
    }
  });
}
