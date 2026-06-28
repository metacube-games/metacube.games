import { useEffect } from "react";
import { useRenderFrame } from "../mainComponents/RendererFrame";
import { useCameraFov } from "../mainComponents/UpdateCameraFov";
import { useSoundFX } from "../sound/soundFX";
import { useGStore, SAG, selectReadyToRender } from "../menu/useGeneralStore";

function useDelayedRender() {
  const delayedRender = useGStore(selectReadyToRender);
  useEffect(() => {
    if (!delayedRender) return;
    const timeoutId = setTimeout(() => {
      SAG.setReadyToRender3(true);
    }, 800);
    return () => clearTimeout(timeoutId);
  }, [delayedRender]);
}

export const CanvasHooks = () => {
  useRenderFrame();
  useCameraFov();
  useSoundFX();
  useDelayedRender();
  return <> </>;
};
