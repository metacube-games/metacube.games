import React, { useEffect, useState } from "react";
import { SkyBoxAndFar } from "./SkyBox";
import { WorldComponents } from "./WorldComponents";
import { Fogs } from "./Fogs";
import { Fogs3D } from "./Fogs3D";
import { ForceFieldShield } from "./ForceField";
import { CISettingsMng } from "../../menu/subMenus/NavigationBar/Model/CSettingsManager";
import { AmbientParticles } from "./AmbientParticles";
import { Asteroids } from "./environment/Asteroids";
import EnhancedGiantBlackHole from "./environment/BlackHole";
import { SpaceShips } from "./environment/SpaceShips";
import { CargoShips } from "./environment/CargoShips";
export const WorldAndLight = React.memo(() => {
  const [luminosity, setLuminosity] = useState(() =>
    CISettingsMng.render.luminosity.getVal(),
  );
  const [fogsEffect, setFogsEffect] = useState(() =>
    CISettingsMng.render.fogsEffect.getVal(),
  );
  const [particlesEffect, setParticlesEffect] = useState(() =>
    CISettingsMng.render.particlesEffect.getVal(),
  );
  const [variousEffects, setVariousEffects] = useState(() =>
    CISettingsMng.render.variousEffects.getVal(),
  );

  useEffect(() => {
    const listener1 =
      CISettingsMng.render.luminosity.addListener(setLuminosity);
    const listener2 =
      CISettingsMng.render.fogsEffect.addListener(setFogsEffect);
    const listener3 =
      CISettingsMng.render.particlesEffect.addListener(setParticlesEffect);
    const listener4 =
      CISettingsMng.render.variousEffects.addListener(setVariousEffects);
    return () => {
      listener1.remove();
      listener2.remove();
      listener3.remove();
      listener4.remove();
    };
  }, []);

  return (
    <>
      <ambientLight
        intensity={1.1 + (luminosity - 0.5) * 1.5}
        color={0xeeffee}
      />
      <SkyBoxAndFar />
      <WorldComponents />
      {fogsEffect && (
        <>
          <Fogs />
          <Fogs3D />
        </>
      )}
      {particlesEffect && <AmbientParticles />}

      {variousEffects && (
        <>
          <Asteroids />
          <EnhancedGiantBlackHole />
          <ForceFieldShield />
          <SpaceShips />
          <CargoShips />
          {/* <CargoShipsWithWormhole /> */}
        </>
      )}
    </>
  );
});
