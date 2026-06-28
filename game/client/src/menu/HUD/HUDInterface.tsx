import * as React from "react";
import { type Ref, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { CIPlayer } from "../../players/model/playerPhysic";
import { CISettingsMng } from "../subMenus/NavigationBar/Model/CSettingsManager";
import { CIMetacubeStates } from "../../world/model/MetacubeStates";
import { CIOpponents } from "../../players/model/computeOpponentsData";
import { getIsDesktop } from "../../helpers/getIsDesktop";
import { colorGreen } from "../styles/colors";
import { SGG, useGStore } from "../useGeneralStore";

import { CIHUD } from "./hudInfo";
import { TopLeftInfoMenu, DotAimer } from "./TopLeftInfo";
import { CubeHPDisplay, MoneyDisplay, PlayerHPsFly } from "./PlayerInfo";
import { ControlsTutorial } from "./Tutorial";
import { ViewerShower } from "./Viewer";
import { BombSelector } from "./BombSelector";
import { STYLES } from "./styles";

export const HUDInterface = React.memo(function HUDInterface() {
  const { t } = useTranslation();
  const isDesktop = getIsDesktop();
  // Translated HUD labels cached in a ref and refreshed each render (incl. on
  // language change) so the per-frame rAF tick reads them without calling t().
  const hudLabels = useRef({ ally: "", players: "", fps: "" });
  hudLabels.current.ally = t("hud.ally");
  hudLabels.current.players = t("hud.playersCount");
  hudLabels.current.fps = t("hud.fps");
  const generalHPRef = useRef<HTMLDivElement>(null!);
  const hpBarRef = useRef<HTMLDivElement>(null!);
  const enemyHpWritingRef = useRef<HTMLDivElement>(null!);
  const enemyNameRef = useRef<HTMLDivElement>(null!);
  const flyJaugeRef = useRef<HTMLDivElement>(null!);
  const hpContRef = useRef<HTMLDivElement>(null!);
  const fpsRef = useRef<HTMLDivElement>(null!);
  const coordinatesRef = useRef<HTMLDivElement>(null!);
  const totalCubeBrokenRef = useRef<HTMLDivElement>(null!);
  const playerNbRef = useRef<HTMLDivElement>(null!);

  // Cached last-set values to avoid layout thrash at game-loop rates.
  const lastSetValues = useRef({
    flyJaugeWidth: 1,
    generalHpOpacity: "",
    enemyName: "",
    enemyHp: "",
    hpBarWidth: 1,
    hpBarBgColor: "",
    fpsText: "",
    coordinatesText: "",
    totalCubeText: "",
    playerText: "",
  });

  // Throttled to every 3rd frame — HUD only needs ~20-40 fps of visual updates.
  useEffect(() => {
    let animId = 0;
    let frameCounter = 0;
    const last = lastSetValues.current;
    const ENEMY_RED = "rgb(230, 48, 48)";
    const ALLY_GREEN = `${colorGreen} !important`;

    const tick = () => {
      animId = window.requestAnimationFrame(tick);
      if (++frameCounter % 3 !== 0) return;

      if (SGG.getIsInGame()) {
        const enduranceWidth =
          CIPlayer.endurance.val.curr / CIPlayer.endurance.val.max;
        const enemyName = CIHUD.eInfo.name;
        let hpBarWidth = 1;
        let hpBarBgColor = ENEMY_RED;
        let enemyHpText = "";

        if (CIHUD.eInfo.maxHp === -1) {
          hpBarBgColor = ALLY_GREEN;
          enemyHpText = hudLabels.current.ally;
        } else if (enemyName.includes("Charged layer barrier")) {
          enemyHpText = "∞";
        } else {
          hpBarWidth = Math.max(
            0,
            Math.min(CIHUD.eInfo.hp / CIHUD.eInfo.maxHp, 1),
          );
          enemyHpText = `${CIHUD.eInfo.hp} / ${CIHUD.eInfo.maxHp}`;
        }

        if (last.flyJaugeWidth !== enduranceWidth && flyJaugeRef.current) {
          flyJaugeRef.current.style.transform = `scaleX(${enduranceWidth})`;
          last.flyJaugeWidth = enduranceWidth;
        }
        if (last.enemyName !== enemyName && enemyNameRef.current) {
          enemyNameRef.current.textContent = enemyName;
          last.enemyName = enemyName;
        }
        const wantOpacity = last.enemyName.length > 1 ? "1" : "0";
        if (last.generalHpOpacity !== wantOpacity && generalHPRef.current) {
          generalHPRef.current.style.opacity = wantOpacity;
          last.generalHpOpacity = wantOpacity;
        }
        if (last.hpBarWidth !== hpBarWidth && hpBarRef.current) {
          hpBarRef.current.style.transform = `scaleX(${hpBarWidth})`;
          last.hpBarWidth = hpBarWidth;
        }
        if (last.hpBarBgColor !== hpBarBgColor && hpBarRef.current) {
          hpBarRef.current.style.backgroundColor = hpBarBgColor;
          last.hpBarBgColor = hpBarBgColor;
        }
        if (last.enemyHp !== enemyHpText && enemyHpWritingRef.current) {
          enemyHpWritingRef.current.textContent = enemyHpText;
          last.enemyHp = enemyHpText;
        }
      }

      const playerText = `${hudLabels.current.players} ${Object.keys(CIOpponents.players).length}`;
      if (last.playerText !== playerText) {
        playerNbRef.current.textContent = playerText;
        last.playerText = playerText;
      }
      const fpsText = `${CIHUD.fps.val} ${hudLabels.current.fps}`;
      if (last.fpsText !== fpsText) {
        fpsRef.current.textContent = fpsText;
        last.fpsText = fpsText;
      }
      const [cx, cy, cz] = CIHUD.coordinates.val;
      const coordinatesText = `x: ${Math.round(cx)}  y:${Math.round(cy - 1)}  z: ${Math.round(cz)}`;
      if (last.coordinatesText !== coordinatesText && coordinatesRef.current) {
        coordinatesRef.current.textContent = coordinatesText;
        last.coordinatesText = coordinatesText;
      }
      const totalCubeText = `${CIMetacubeStates.nbCubeLeft.val} / ${CIMetacubeStates.totalNbCube}`;
      if (last.totalCubeText !== totalCubeText) {
        totalCubeBrokenRef.current.textContent = totalCubeText;
        last.totalCubeText = totalCubeText;
      }
    };
    animId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animId);
  }, []);

  return (
    <>
      <TopLeftInfoMenu
        fpsRef={fpsRef}
        coordinatesRef={coordinatesRef}
        totalCubeBrokenRef={totalCubeBrokenRef}
        playerNbRef={playerNbRef}
      />
      <HUDComponents
        generalHPRef={generalHPRef}
        hpBarRef={hpBarRef}
        enemyNameRef={enemyNameRef}
        flyJaugeRef={flyJaugeRef}
        enemyHpRef={enemyHpWritingRef}
        hpContRef={hpContRef}
      />
      {isDesktop && <ControlsTutorial />}
    </>
  );
});

interface HUDComponentsProps {
  generalHPRef: Ref<HTMLDivElement>;
  hpBarRef: Ref<HTMLDivElement>;
  enemyNameRef: Ref<HTMLDivElement>;
  flyJaugeRef: React.RefObject<HTMLDivElement>;
  enemyHpRef: Ref<HTMLDivElement>;
  hpContRef: Ref<HTMLDivElement>;
}

const HUDComponents = React.memo(function HUDComponents({
  generalHPRef,
  hpBarRef,
  enemyNameRef,
  flyJaugeRef,
  enemyHpRef,
  hpContRef,
}: HUDComponentsProps) {
  const isInGame = useGStore((state) => state.isInGame);
  const isThirdPerson = useGStore((state) => state.isThirdPerson);
  const damageMarkerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const listener = CISettingsMng.hud.showDamageMarker.addListener((show) => {
      if (damageMarkerRef.current) {
        damageMarkerRef.current.style.visibility = show ? "visible" : "hidden";
      }
    });
    return () => listener.remove();
  }, []);

  return (
    <>
      {/* Host for `CHUDInfo.bloodDamageDiv` blood-vignette class toggle. */}
      <span
        id="gameHUD"
        style={STYLES.POINTER_EVENTS_NONE}
        tabIndex={-1}
        aria-hidden="true"
      />
      <div
        id="damageMarkerParent"
        ref={damageMarkerRef}
        style={STYLES.POINTER_EVENTS_NONE}
        tabIndex={-1}
        aria-hidden="true"
      />
      {isInGame ? (
        <>
          {!isThirdPerson && <DotAimer />}
          <CubeHPDisplay
            generalHPRef={generalHPRef}
            hpBarRef={hpBarRef}
            enemyHpRef={enemyHpRef}
            enemyNameRef={enemyNameRef}
            hpContRef={hpContRef}
          />
          <MoneyDisplay />
          <PlayerHPsFly flyJaugeRef={flyJaugeRef} />
          <BombSelector />
        </>
      ) : (
        <ViewerShower />
      )}
    </>
  );
});
