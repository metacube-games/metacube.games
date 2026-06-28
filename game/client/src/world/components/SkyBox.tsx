import React, { startTransition, useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import sb from "./../../assets/environmentMap/Background_Below3.png";
import sh from "./../../assets/environmentMap/Background_Top3.png";
import ss from "./../../assets/environmentMap/Background_Face3.png";
import { CISettingsMng } from "../../menu/subMenus/NavigationBar/Model/CSettingsManager";
import { CAMERA_FAR_VIEW } from "../../constants";
import { SAG } from "../../menu/useGeneralStore";

export const SkyBoxAndFar = React.memo(() => {
  const far = useDistanceDisplay();
  useFarModifier(far);

  const { scene } = useThree();
  useEffect(() => {
    startTransition(() => {
      SAG.setReadyToRender2(true);
    });
  }, [scene]);

  return (
    <Environment
      files={[ss, ss, sh, sb, ss, ss]}
      background={far >= CISettingsMng.render.renderDistance.max}
    />
  );
});

const useDistanceDisplay = () => {
  const [far, setFar] = useState<number>(() =>
    CISettingsMng.render.renderDistance.getVal(),
  );
  useEffect(() => {
    const onDistanceListener = (distance: number) => {
      setFar(distance);
    };
    const distanceListener =
      CISettingsMng.render.renderDistance.addListener(onDistanceListener);
    return () => {
      distanceListener.remove();
    };
  }, [setFar]);

  return far;
};

const useFarModifier = (far: number) => {
  const { camera, scene, invalidate } = useThree();

  useEffect(() => {
    const isFarLimit = far < CISettingsMng.render.renderDistance.max;
    camera.far = isFarLimit ? far : CAMERA_FAR_VIEW;

    if (isFarLimit) {
      const colorFog = new THREE.Color("#556655");
      scene.background = colorFog;
      scene.fog = new THREE.Fog(colorFog, 1, far);
    } else {
      scene.fog = null;
    }

    camera.updateProjectionMatrix();
    invalidate();
  }, [far, camera, scene, invalidate]);
};
