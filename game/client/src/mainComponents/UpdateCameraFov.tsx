import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { CISettingsMng } from "../menu/subMenus/NavigationBar/Model/CSettingsManager";
import type * as THREE from "three";

export const useCameraFov = () => {
  const { camera } = useThree();
  const [fov, setFov] = useState<number>(() =>
    CISettingsMng.render.fov.getVal(),
  );

  useEffect(() => {
    (camera as THREE.PerspectiveCamera).fov = fov;
    camera.updateProjectionMatrix();
  }, [fov, camera]);

  useEffect(() => {
    const onFovListener = (newFov: number) => setFov(newFov);
    const fovListener = CISettingsMng.render.fov.addListener(onFovListener);
    return () => fovListener.remove();
  }, [setFov]);
};
