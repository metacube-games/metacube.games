import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { CISettingsMng } from "../subMenus/NavigationBar/Model/CSettingsManager";
import emitter from "../../helpers/EventEmitter";
import { useGStore } from "../useGeneralStore";

export const ViewerShower = () => {
  const { t } = useTranslation();
  const [userSelected, setUserSelected] = useState<string | false>(false);
  const [showSpectator, setShowSpectator] = useState<boolean>(() =>
    CISettingsMng.hud.showSpectator.getVal(),
  );

  useEffect(() => {
    const listener = CISettingsMng.hud.showSpectator.addListener((value) => {
      setShowSpectator(value);
    });
    return () => listener.remove();
  }, []);

  useEffect(() => {
    const listener = emitter.addListener(
      "playerSelect",
      (next: string | false) => setUserSelected(next),
    );
    return () => listener.remove();
  }, []);

  const menuDisplay = useGStore((state) => state.menuDisplay);
  if (menuDisplay) return null;

  return (
    <div className="absolute bottom-[50px] flex w-full justify-center">
      {showSpectator && (
        <p className="text-[18px] text-foreground [text-shadow:0_0_5px_rgba(0,0,0,0.6)]">
          {t("viewer.title")}
          {userSelected === false ? "" : ": " + userSelected}
        </p>
      )}
    </div>
  );
};
