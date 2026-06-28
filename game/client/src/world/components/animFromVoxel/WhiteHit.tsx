import React, { type RefObject, useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import emitter from "../../../helpers/EventEmitter";
import { type T3DP } from "../../../Types/T3DP";
import { type TMesh } from "../../../Types/TMesh";

let whiteHitNeedUpdate = false;
let lastHitTime = 0;

type TProps = {
  refWhiteHit: RefObject<TMesh>;
};

export function WhiteHit({ refWhiteHit }: TProps) {
  useWhiteHitIndicator(refWhiteHit);

  useFrame(() => {
    if (whiteHitNeedUpdate && refWhiteHit.current) {
      // white hit handler, more than 50 ms since last hit
      if (performance.now() - lastHitTime > 50) {
        refWhiteHit.current.visible = false;
        whiteHitNeedUpdate = false;
      }
    }
  }, 2);

  useEffect(() => {
    if (refWhiteHit.current) {
      refWhiteHit.current.matrixAutoUpdate = false;
      refWhiteHit.current.visible = false;
    }
  }, [refWhiteHit]);

  return (
    <mesh ref={refWhiteHit}>
      <boxGeometry attach="geometry" args={[1.0001, 1.0001, 1.0001]} />
      <meshPhongMaterial
        attach="material"
        side={THREE.FrontSide}
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}

function useWhiteHitIndicator(ref: React.RefObject<TMesh>) {
  const cubeHittedHandler = useCallback(
    (cubePos: T3DP, critical: boolean) => {
      if (!ref.current) return;

      const material = ref.current.material as THREE.MeshPhongMaterial;

      ref.current.position.set(
        cubePos[0] + 0.5,
        cubePos[1] + 0.5,
        cubePos[2] + 0.5,
      );
      material.emissive.set(critical ? 0xbb5555 : 0xaaaaaa);
      ref.current.visible = true;
      ref.current.updateMatrix();

      lastHitTime = performance.now();
      whiteHitNeedUpdate = true;
    },
    [ref],
  );

  useEffect(() => {
    const cubeHittedEvent = emitter.addListener(
      "cubeHitted",
      cubeHittedHandler,
    );
    return () => {
      cubeHittedEvent.remove();
    };
  }, [cubeHittedHandler]);
}
