import { useState, useEffect, startTransition, useCallback } from "react";
import { useGStore } from "../menu/useGeneralStore";
import { CISettingsMng } from "../menu/subMenus/NavigationBar/Model/CSettingsManager";
import { CISoundMng } from "../sound/soundFX";
import { resetAllInputs } from "../players/model/playerControls";
import { PAUSE_RESOLUTION_MODIFIER } from "../constants";

export function useResolutionModifier() {
  const menuDisplay = useGStore((state) => state.menuDisplay);

  const currRes = useCallback(
    () => CISettingsMng.render.resolution.getVal() * window.devicePixelRatio,
    [],
  );

  const [dpr, setDpr] = useState(currRes() * PAUSE_RESOLUTION_MODIFIER);

  const handleResize = useCallback(() => {
    startTransition(() => {
      const currResolution = currRes();
      if (menuDisplay) {
        setDpr(currResolution * PAUSE_RESOLUTION_MODIFIER);
      } else {
        setDpr(currResolution);
      }
    });
  }, [menuDisplay, currRes]);

  useEffect(() => {
    if (!menuDisplay) {
      CISoundMng?.soundsFx.exitingMenu.updateSound();
    }

    handleResize();
    const listener2 = CISettingsMng.render.resolution.addListener(handleResize);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      listener2.remove();
    };
  }, [menuDisplay, handleResize]);

  useEffect(() => {
    if (menuDisplay) {
      resetAllInputs();
    }
  }, [menuDisplay]);

  return dpr;
}
