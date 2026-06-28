import React, { useState, useEffect, Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { CISettingsMng } from "../menu/subMenus/NavigationBar/Model/CSettingsManager";
import { WorldAndLight } from "../world/components/WorldAndLight";
import { IntersectedCube } from "../world/components/animFromVoxel/IntersectedCube";
import { Opponents } from "../players/components/Opponents";
import { PlayerType } from "../players/components/PlayerType";
import { Chunks } from "../world/components/metacubeCube/Chunks";
import { BombVisuals } from "../world/components/bomb/BombVisual";
import { ExplosionFlames } from "../world/components/bomb/ExplosionFlame";
import { CanvasHooks } from "./CanvasHooks";
import { CAMERA_FAR_VIEW } from "../constants";
import { useAntialias } from "../hooks/useAntialias";
import { useResolutionModifier } from "../hooks/useResolutionModifier";

export const CanvasComponent = React.memo(() => {
  const dpr = useResolutionModifier();
  const antialias = useAntialias();

  const [darkFutureAmbiance, setDarkFutureAmbiance] = useState(() =>
    CISettingsMng.render.darkFutureAmbiance.getVal(),
  );

  useEffect(() => {
    const listener = CISettingsMng.render.darkFutureAmbiance.addListener(
      setDarkFutureAmbiance,
    );
    return () => {
      listener.remove();
    };
  }, []);

  const cameraConfig = useMemo(
    () => ({
      fov: CISettingsMng.render.fov.getVal(),
      far: CAMERA_FAR_VIEW,
    }),
    [],
  );

  const glConfig = useMemo(
    () => ({
      powerPreference: "high-performance" as const,
      antialias: antialias,
    }),
    [antialias],
  );

  return (
    <div className={"fullscreen"}>
      <Canvas
        linear={darkFutureAmbiance}
        flat={darkFutureAmbiance}
        key={`canvas-${antialias}-${darkFutureAmbiance}`}
        dpr={dpr}
        camera={cameraConfig}
        gl={glConfig}
        style={{ touchAction: "none" }}
      >
        <Suspense fallback={null}>
          <PlayerType />
          <WorldAndLight />
          <IntersectedCube />
          <Chunks />
          <Opponents />
          <BombVisuals />
          <ExplosionFlames />
          <CanvasHooks />
        </Suspense>
      </Canvas>
    </div>
  );
});

CanvasComponent.displayName = "CanvasComponent";
