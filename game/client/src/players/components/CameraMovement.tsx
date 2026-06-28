import { type Camera, useThree } from "@react-three/fiber";
import { startTransition, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CISettingsMng } from "../../menu/subMenus/NavigationBar/Model/CSettingsManager";
import emitter from "../../helpers/EventEmitter";
import { SAG } from "../../menu/useGeneralStore";
import { setCameraMoved } from "../model/afkKick";

const SENSITIVITY_RATIO = 1 / 150;
const PI_2 = Math.PI / 2;
const MARGIN = 0.0001;
const UPPERBOUND = Math.PI - MARGIN;
const LOWERBOUND = PI_2 - MARGIN;
const CAMERAMOVSPEEDMIN = 0.0004;

export function DesktopCameraControls() {
  const { camera, gl } = useThree();
  const cameraMovSpeed = useCameramoveSpeed();
  const euler = useMemo(() => new THREE.Euler(0, 0, 0, "YXZ"), []);

  usePointerLocker(gl);
  useMouseMove(gl, euler, camera, cameraMovSpeed.current);
  return <></>;
}

export function MobileCameraControls() {
  const { camera, gl } = useThree();
  const cameraMovSpeed = useCameramoveSpeed();
  const euler = useMemo(() => new THREE.Euler(0, 0, 0, "YXZ"), []);
  useTouchMove(gl, euler, camera, cameraMovSpeed.current);
  return <></>;
}

function useCameramoveSpeed() {
  const cameraMovSpeed = useRef<number>(
    CISettingsMng.controls.cameraSensitivity.getVal() * SENSITIVITY_RATIO +
      CAMERAMOVSPEEDMIN,
  );
  useEffect(() => {
    const onCameraSpeedChange = (value: number) => {
      const factor = value * SENSITIVITY_RATIO + CAMERAMOVSPEEDMIN;
      cameraMovSpeed.current = factor;
    };
    const listener =
      CISettingsMng.controls.cameraSensitivity.addListener(onCameraSpeedChange);
    return () => {
      listener.remove();
    };
  }, []);
  return cameraMovSpeed;
}

function getTouchForElement(event: TouchEvent, elementDataAttribute: string) {
  return Array.from(event.touches).find(
    // @ts-expect-error
    (touch) => touch.target.dataset.touchzone === elementDataAttribute,
  );
}

function useTouchMove(
  gl: THREE.WebGLRenderer,
  euler: THREE.Euler,
  camera: Camera & { manual?: boolean | undefined },
  cameraMovSpeed: number,
) {
  useEffect(() => {
    let lastTouchX: number | null = null;
    let lastTouchY: number | null = null;

    const handleTouchStart = (event: TouchEvent) => {
      const touch = getTouchForElement(event, "cameraControl");
      if (!touch) return;
      lastTouchX = touch.clientX;
      lastTouchY = touch.clientY;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = getTouchForElement(event, "cameraControl");
      if (!touch) return;
      const currentTouchX = touch.clientX;
      const currentTouchY = touch.clientY;
      if (lastTouchX === null || lastTouchY === null) {
        lastTouchX = currentTouchX;
        lastTouchY = currentTouchY;
        return;
      }

      const movementX = (currentTouchX - lastTouchX) / window.devicePixelRatio;
      const movementY = (currentTouchY - lastTouchY) / window.devicePixelRatio;

      lastTouchX = currentTouchX;
      lastTouchY = currentTouchY;
      const multiplierTouch = 6;
      setEulerTransformation(
        euler,
        camera,
        movementX,
        cameraMovSpeed * multiplierTouch,
        movementY,
      );
    };
    const touchDiv = document.createElement("span");
    touchDiv.style.position = "absolute";
    touchDiv.style.top = "0";
    touchDiv.style.left = "0";
    touchDiv.style.width = "100%";
    touchDiv.style.height = "100%";
    touchDiv.style.zIndex = "99998";
    touchDiv.setAttribute("data-touchzone", "cameraControl");
    touchDiv.style.backgroundColor = "transparent";
    const active = {
      passive: true,
    };
    const startListener = emitter.addListener("touchStartAb", handleTouchStart);
    const moveListener = emitter.addListener("touchMoveAb", handleTouchMove);
    touchDiv.addEventListener("touchstart", handleTouchStart, active);
    touchDiv.addEventListener("touchmove", handleTouchMove, active);
    window.document.body.appendChild(touchDiv);
    return () => {
      window.document.body.removeChild(touchDiv);
      startListener.remove();
      moveListener.remove();
    };
  }, [camera, euler, gl.domElement, cameraMovSpeed]);
}

function useMouseMove(
  gl: THREE.WebGLRenderer,
  euler: THREE.Euler,
  camera: Camera & { manual?: boolean | undefined },
  cameraMovSpeed: number,
) {
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setCameraMoved(true);
      if (document.pointerLockElement !== gl.domElement) return;
      event.preventDefault();
      event.stopPropagation();
      const movementX = (event.movementX || 0) / window.devicePixelRatio;
      const movementY = (event.movementY || 0) / window.devicePixelRatio;

      setEulerTransformation(
        euler,
        camera,
        movementX,
        cameraMovSpeed,
        movementY,
      );
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [camera, euler, gl.domElement, cameraMovSpeed]);
}

function usePointerLocker(gl: THREE.WebGLRenderer) {
  useEffect(() => {
    const onPointerlockChange = (e: {
      preventDefault: () => void;
      stopPropagation: () => void;
    }) => {
      e.preventDefault();
      e.stopPropagation();
      startTransition(() => {
        SAG.setMenuDisplay(document.pointerLockElement !== gl.domElement);
      });
    };
    document.addEventListener("pointerlockchange", onPointerlockChange);
    return () => {
      document.removeEventListener("pointerlockchange", onPointerlockChange);
    };
  }, [gl.domElement]);
}

function setEulerTransformation(
  euler: THREE.Euler,
  camera: Camera & { manual?: boolean | undefined },
  movementX: number,
  cameraMovSpeed: number,
  movementY: number,
) {
  euler.setFromQuaternion(camera.quaternion);
  euler.y -= movementX * cameraMovSpeed;
  euler.x -= movementY * cameraMovSpeed;
  euler.x = Math.max(PI_2 - UPPERBOUND, Math.min(LOWERBOUND, euler.x));

  camera.quaternion.setFromEuler(euler);
}
