import * as React from "react";
import { useEffect } from "react";

import { CISettingsMng } from "../subMenus/NavigationBar/Model/CSettingsManager";
import { useGStore } from "../useGeneralStore";

interface TopLeftInfoMenuProps {
  fpsRef: React.RefObject<HTMLDivElement>;
  coordinatesRef: React.RefObject<HTMLDivElement>;
  totalCubeBrokenRef: React.RefObject<HTMLDivElement>;
  playerNbRef: React.RefObject<HTMLDivElement>;
}

const ITEM_SPACING = 30;

const ITEM_CLASS =
  "rounded-md border border-white/10 bg-[rgba(20,20,20,0.85)] font-mono text-white backdrop-blur-sm text-[8px] px-1 py-px sm:text-[10px] sm:px-1.5 sm:py-[2px] md:text-[12px] md:px-2 md:py-1";

export const TopLeftInfoMenu = React.memo(function TopLeftInfoMenu({
  fpsRef,
  coordinatesRef,
  totalCubeBrokenRef,
  playerNbRef,
}: TopLeftInfoMenuProps) {
  useEffect(() => {
    const setVis = (ref: React.RefObject<HTMLDivElement>, show: boolean) => {
      if (ref.current) {
        ref.current.style.visibility = show ? "visible" : "hidden";
      }
    };
    const subs = [
      CISettingsMng.hud.showFPS.addListener((s) => setVis(fpsRef, s)),
      CISettingsMng.hud.showCoordinates.addListener((s) =>
        setVis(coordinatesRef, s),
      ),
      CISettingsMng.hud.showTotCubes.addListener((s) =>
        setVis(totalCubeBrokenRef, s),
      ),
      CISettingsMng.hud.showPlayers.addListener((s) => setVis(playerNbRef, s)),
    ];
    return () => subs.forEach((sub) => sub.remove());
  }, [coordinatesRef, fpsRef, totalCubeBrokenRef, playerNbRef]);

  const isMenu = useGStore((state) => state.menuDisplay);
  const topBase = isMenu ? 72 : 12;

  const items: [string, React.RefObject<HTMLDivElement>, () => boolean][] = [
    ["fps", fpsRef, () => CISettingsMng.hud.showFPS.getVal()],
    [
      "coordinates",
      coordinatesRef,
      () => CISettingsMng.hud.showCoordinates.getVal(),
    ],
    [
      "totalCubes",
      totalCubeBrokenRef,
      () => CISettingsMng.hud.showTotCubes.getVal(),
    ],
    ["players", playerNbRef, () => CISettingsMng.hud.showPlayers.getVal()],
  ];

  return (
    <>
      {items.map(([id, ref, visible], i) => (
        <div
          key={id}
          ref={ref}
          className={ITEM_CLASS}
          style={{
            position: "absolute",
            left: "12px",
            top: `${topBase + i * ITEM_SPACING}px`,
            zIndex: 30,
            visibility: visible() ? "visible" : "hidden",
          }}
        />
      ))}
    </>
  );
});

/** Aim dot in the center of the screen. Hidden while the menu is open. */
export const DotAimer = () => {
  const menuDisplay = useGStore((state) => state.menuDisplay);
  if (menuDisplay) return null;
  return <span className="dot" />;
};
