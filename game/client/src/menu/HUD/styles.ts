import type React from "react";

export const STYLES = {
  POINTER_EVENTS_NONE: { pointerEvents: "none" } as React.CSSProperties,
  MONEY_DISPLAY_CONTAINER: {
    position: "absolute",
    top: "12px",
    right: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    pointerEvents: "none",
    touchAction: "none",
  } as React.CSSProperties,
  HP_MENU_WRAPPER: {
    height: "100%",
  } as React.CSSProperties,
  FLY_BOMB_CONTAINER: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    justifyContent: "center",
  } as React.CSSProperties,
  COIN_SVG_LARGE: {
    borderRadius: "8px",
    filter: "drop-shadow(0 0 3px #55aa5599)",
  } as React.CSSProperties,
};
