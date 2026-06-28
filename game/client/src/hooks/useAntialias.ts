import { useState, useEffect } from "react";
import { CISettingsMng } from "../menu/subMenus/NavigationBar/Model/CSettingsManager";

export function useAntialias() {
  const [antialias, setAntialias] = useState<boolean>(
    CISettingsMng.render.antialiasing.getVal(),
  );

  useEffect(() => {
    const listener =
      CISettingsMng.render.antialiasing.addListener(setAntialias);
    return () => {
      listener.remove();
    };
  }, []);

  return antialias;
}
