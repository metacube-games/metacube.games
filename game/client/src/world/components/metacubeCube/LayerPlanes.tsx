import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import grass from "../../../assets/cubeTextures/barrier.png";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import emitter from "../../../helpers/EventEmitter";
import { toStaticMeshOutConverter } from "../environment/StaticGlbs/StaticGlbComponent";
import { CIMetacubeStates } from "../../model/MetacubeStates";
import { LAYER_BOUNDS as layerData } from "../../model/layerBounds";

const zOffset = 0.00004;
// Stable keys for the 5 fixed layer sides (minX, maxX, top, minZ, maxZ)
const SIDE_KEYS = ["minX", "maxX", "top", "minZ", "maxZ"];

export const LayerPlanes = () => {
  const texture = useLoader(THREE.TextureLoader, grass);
  const refGroup = useRef<THREE.Group>(null);
  const materialRefs = useRef<THREE.MeshStandardMaterial[]>([]);
  const timeoutRefs = useRef<number[]>([]);

  const animateOpacity = (duration: number) => {
    let start: number | null = null;

    const loop = (time: number) => {
      if (!start) start = time;
      const elapsed = time - start;
      const progress = Math.max(Math.min(elapsed / duration, 1), 0);
      const currentOpacity = Math.max(1 - progress, 0);

      materialRefs.current.forEach((material) => {
        if (material) {
          material.transparent = true;
          material.opacity = currentOpacity;
          material.emissiveIntensity = 1 + progress;
          material.needsUpdate = true;
        }
      });

      if (progress < 1) {
        requestAnimationFrame(loop);
      } else {
        const timeoutId = window.setTimeout(() => {
          materialRefs.current.forEach((material) => {
            if (material) {
              material.transparent = false;
              material.opacity = 1;
              material.emissiveIntensity = 1;
              material.needsUpdate = true;
            }
          });
        }, 2000);
        timeoutRefs.current.push(timeoutId);
      }
    };
    requestAnimationFrame(loop);
  };

  const currLayer = useLayer(animateOpacity, timeoutRefs);

  const textures = useMemo(() => {
    texture.anisotropy = 0;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return [
      texture.clone(),
      texture.clone(),
      texture.clone(),
      texture.clone(),
      texture,
    ];
  }, [texture]);

  useEffect(() => {
    if (refGroup.current && refGroup.current.children.length > 0) {
      refGroup.current.children.forEach((plane) => {
        toStaticMeshOutConverter(plane as THREE.Mesh);
        plane.updateMatrix();
      });
    }
  }, [refGroup, currLayer]);

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };
  }, []);

  const [currMinX, currMaxX, currMinY, currMaxY, currMinZ, currMaxZ] =
    layerData[currLayer > 5 ? 0 : currLayer];
  const diffX = currMaxX - currMinX;
  const diffY = currMaxY - currMinY;
  const diffZ = currMaxZ - currMinZ;
  const midX = currMinX + diffX / 2;
  const midY = currMinY + diffY / 2;
  const midZ = currMinZ + diffZ / 2;

  const angleLayerSide = [
    [
      currMinX - zOffset,
      midY,
      midZ,
      diffY,
      diffZ,
      [0, Math.PI / 2, Math.PI / 2],
    ],
    [
      currMaxX + zOffset,
      midY,
      midZ,
      diffY,
      diffZ,
      [0, Math.PI / 2, Math.PI / 2],
    ],
    [midX, currMaxY + zOffset, midZ, diffX, diffZ, [-Math.PI / 2, 0, 0]],
    [midX, midY, currMinZ - zOffset, diffY, diffX, [0, 0, Math.PI / 2]],
    [midX, midY, currMaxZ + zOffset, diffY, diffX, [0, 0, Math.PI / 2]],
  ];

  return (
    <group ref={refGroup}>
      {currLayer <= 0 || currLayer > 7
        ? null
        : angleLayerSide.map((spec, i) => {
            const mx = spec[0] as number;
            const my = spec[1] as number;
            const mz = spec[2] as number;
            const diffW = spec[3] as number;
            const diffH = spec[4] as number;
            const angle = spec[5] as number[];
            textures[i].repeat.set(diffW, diffH);

            return (
              <mesh
                key={SIDE_KEYS[i]}
                position={[mx, my, mz]}
                rotation={[angle[0], angle[1], angle[2]]}
                rotation-order={"YXZ"}
              >
                <planeGeometry args={[diffW, diffH]} />
                <meshStandardMaterial
                  ref={(ref) => {
                    if (ref) materialRefs.current[i] = ref;
                  }}
                  side={THREE.DoubleSide}
                  map={textures[i]}
                  opacity={1}
                  lightMapIntensity={1}
                />
              </mesh>
            );
          })}
    </group>
  );
};

function useLayer(
  animateOpacity: (duration: number) => void,
  timeoutRefs: React.RefObject<number[]>,
) {
  const [currLayer, setCurrLayer] = useState(() =>
    CIMetacubeStates.getCurrLayer(),
  );

  useEffect(() => {
    setCurrLayer(CIMetacubeStates.getCurrLayer());
  }, []);

  useEffect(() => {
    const onChangeLayer = (layer: number) => {
      animateOpacity(3000);
      const timeoutId = window.setTimeout(() => {
        startTransition(() => {
          setCurrLayer(layer);
        });
      }, 2900);
      timeoutRefs.current.push(timeoutId);
    };

    const onInitLayer = (layer: number) => {
      startTransition(() => {
        setCurrLayer(layer);
      });
    };
    const list = emitter.addListener("initLayer", onInitLayer);
    const listener = emitter.addListener("changeLayer", onChangeLayer);
    return () => {
      list.remove();
      listener.remove();
    };
  }, [animateOpacity, timeoutRefs]);
  return currLayer;
}
