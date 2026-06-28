import { useFrame, useThree } from "@react-three/fiber";
import { CIHUD } from "../menu/HUD/hudInfo";
import { useRef } from "react";
import { CIBombManager } from "../world/managers/bombManager";

export const useRenderFrame = () => {
  const frameCounterRef = useRef(0);
  const { gl } = useThree();
  let totalElapsedTime = 0;
  let prevTime = performance.now();

  useFrame((state) => {
    const currentTime = performance.now();
    const diffTime = currentTime - prevTime;
    const delta = diffTime / 1000;
    totalElapsedTime += diffTime;
    prevTime = currentTime;
    frameCounterRef.current++;

    CIBombManager.update(delta);
    if (totalElapsedTime >= 1000) {
      CIHUD.fps.val = Math.round(
        (frameCounterRef.current / totalElapsedTime) * 1000,
      );
      frameCounterRef.current = 0;
      totalElapsedTime = 0;
    }
    gl.render(state.scene, state.camera);
  }, 4);
};
