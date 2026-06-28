import React, { useEffect } from "react";
import { Player } from "./Player";
import { ViewerR } from "./Viewer";
import { DesktopCameraControls, MobileCameraControls } from "./CameraMovement";
import { ClickHandle } from "./CubeHitted";
import { setCameraMoved } from "../model/afkKick";
import { usePlayerControls } from "../model/playerControls";
import { CameraLocker } from "./CameraLocker";
import { useThree } from "@react-three/fiber";
import { useGSelectors, useGStore } from "../../menu/useGeneralStore";
import { getIsDesktop } from "../../helpers/getIsDesktop";
import { useShallow } from "zustand/react/shallow";

// Render all players
export const PlayerType = React.memo(() => {
  const isDesktop = getIsDesktop();
  return (
    <>
      <CameraHandlings />
      <PlayerViewerSwitch isDesktop={isDesktop} />
      {isDesktop ? <DesktopControls /> : <MobileControls />}
    </>
  );
});

const PlayerViewerSwitch = React.memo(
  ({ isDesktop }: { isDesktop: boolean }) => {
    const { isInGame } = useGStore(
      useShallow((state) => ({
        isInGame: state.isInGame,
      })),
    );

    return (
      <>
        {isInGame ? (
          <Player isDesktop={isDesktop} />
        ) : (
          <ViewerR isDesktop={isDesktop} />
        )}
      </>
    );
  },
);

const CameraHandlings = React.memo(() => {
  const isDesktop = getIsDesktop();
  const menuDisplay = useGStore((state) => state.menuDisplay);
  return (
    <>
      {!menuDisplay && (
        <>
          {isDesktop ? <DesktopCameraControls /> : <MobileCameraControls />}
          <ClickHandleEnabled />
        </>
      )}
    </>
  );
});
const ClickHandleEnabled = () => {
  const { isInGame } = useGSelectors("isInGame");
  return <>{isInGame && <ClickHandle />}</>;
};

// ------------------------------------------------------------------------------
function MobileControls() {
  useTouchMoveAFK();
  return <></>;
}

function useTouchMoveAFK() {
  useEffect(() => {
    const onMouseMove = () => {
      setCameraMoved(true);
    };

    window.addEventListener("touchmove", onMouseMove, { passive: true });
    return () => {
      window.removeEventListener("touchmove", onMouseMove);
    };
  }, []);
}

// ------------------------------------------------------------------------------
function DesktopControls() {
  const { gl } = useThree();
  // useMouseMoveAFK();
  // useMouseMoveAFK handled in cameraMovmeent look setCameraMoved(true)
  usePlayerControls();
  CameraLocker(gl);
  return <></>;
}
