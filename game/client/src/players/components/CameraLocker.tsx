import { useEffect } from "react";
import type * as THREE from "three";
import { useGStore } from "../../menu/useGeneralStore";

export function CameraLocker(gl: THREE.WebGLRenderer) {
  const menuDisplay = useGStore((state) => state.menuDisplay);
  useEffect(() => {
    if (menuDisplay) return;
    const onPointerDownHandle = (e: {
      preventDefault: () => void;
      stopPropagation: () => void;
    }) => {
      e.preventDefault();
      e.stopPropagation();
      if (document.pointerLockElement !== gl.domElement) {
        const canvas = document.querySelector("canvas");
        if (canvas) canvas.requestPointerLock();
      }
    };

    // Always lock pointer for camera controls in both first and third-person modes
    const canvas = document.querySelector("canvas");
    if (canvas) canvas.requestPointerLock();
    window.addEventListener("pointerdown", onPointerDownHandle);
    return () => {
      window.removeEventListener("pointerdown", onPointerDownHandle);
    };
  }, [menuDisplay, gl.domElement]);
}
