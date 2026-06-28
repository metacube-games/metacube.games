import { OrbitSpaceStation } from "./environment/ISS_animated_texture";
import { Spacecraft } from "./environment/StaticGlbs/Spacecraft";
import { LayerPlanes } from "./metacubeCube/LayerPlanes";
import { WorldLimits } from "./environment/WorldLimits";
import { AirportScene } from "./environment/AirportScene";
import { SpawnerBarrier } from "./environment/SpawnerBarrier";
import { Towers } from "./environment/StaticGlbs/Towers";
import { TerrainV4 } from "./environment/StaticGlbs/TerrainV4";
import { PowerGauges } from "./environment/PowerGauge";
import { Shockwave } from "./environment/Shockwave";
import { CISettingsMng } from "../../menu/subMenus/NavigationBar/Model/CSettingsManager";
import { useEffect, useState } from "react";
import { useGSelectors } from "../../menu/useGeneralStore";

export const WorldComponents = () => {
  const [spaceCraft, setSpaceCraft] = useState(() =>
    CISettingsMng.render.spaceCraft.getVal(),
  );
  const [powerJauges, setPowerJauges] = useState(() =>
    CISettingsMng.render.powerJauges.getVal(),
  );

  const { readyToRender3 } = useGSelectors("readyToRender3");
  useEffect(() => {
    const listener = CISettingsMng.render.spaceCraft.addListener(setSpaceCraft);
    const listener2 =
      CISettingsMng.render.powerJauges.addListener(setPowerJauges);
    return () => {
      listener.remove();
      listener2.remove();
    };
  }, []);

  return (
    <>
      {spaceCraft && (
        <>
          <OrbitSpaceStation />
          <AirportScene />
        </>
      )}
      {powerJauges && readyToRender3 && <PowerGauges />}
      <Towers />
      <LayerPlanes />
      <Spacecraft />
      <SpawnerBarrier />
      <TerrainV4 />
      <WorldLimits />
      <Shockwave />
    </>
  );
};
