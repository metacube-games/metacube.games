import type React from "react";
import { getMovement } from "./playerControls";
import { CIAlertMng } from "../../menu/subMenus/AlertDialog";
import { CISocketMng } from "../../API/socketMessagesManager";
import { DELAY_WARNING, MAXAFKTIME } from "./delayWarning";

let cameraMoved = false;
export function setCameraMoved(value: boolean) {
  cameraMoved = value;
}
let alertActive = false;
export function afkKick(kickTimer: React.RefObject<number>) {
  const movement = getMovement();
  if (
    movement.backward ||
    movement.forward ||
    movement.left ||
    movement.right ||
    movement.jump ||
    cameraMoved
  ) {
    kickTimer.current = performance.now();
    if (alertActive) {
      alertActive = false;
      CIAlertMng.dialogs.nothing.emit();
    }
  }
  cameraMoved = false;
  const deltaAFK = performance.now() - kickTimer.current;
  if (deltaAFK >= DELAY_WARNING) {
    if (deltaAFK >= MAXAFKTIME) {
      CISocketMng.quitGame(CIAlertMng.dialogs.afk);
      alertActive = false;
    } else if (!alertActive) {
      alertActive = true;
      CIAlertMng.dialogs.afkWarning.emit();
    }
  }
}
