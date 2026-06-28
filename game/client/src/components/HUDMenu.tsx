import React from "react";
import { HUDInterface } from "../menu/HUD/HUDInterface";
import { TouchControlsWrapper } from "../menu/HUD/TouchControls";
import { useGStore, selectReadyToRender } from "../menu/useGeneralStore";

export const HUDMenu = React.memo(() => {
  const RTR = useGStore(selectReadyToRender);
  return (
    <>
      {RTR && (
        <div style={{ touchAction: "none !important" }}>
          <HUDInterface />
          <TouchControlsWrapper />
        </div>
      )}
    </>
  );
});

HUDMenu.displayName = "HUDMenu";
