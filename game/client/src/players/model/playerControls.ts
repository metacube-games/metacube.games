import { useEffect } from "react";
import { SGG } from "../../menu/useGeneralStore";

type TMovementFields =
  | "forward"
  | "backward"
  | "left"
  | "right"
  | "jump"
  | "sprint"
  | "fly"
  | "toggleCamera"
  | "bomb";

type TMMovementFields = "forwardM" | "backwardM" | "leftM" | "rightM";

interface IMovement {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  fly: boolean;
  jump: boolean;
  sprint: boolean;
  toggleCamera: boolean;
  bomb: boolean;
}

interface IMMovement {
  forwardM: number;
  backwardM: number;
  leftM: number;
  rightM: number;
}

const movement: IMovement = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  fly: false,
  jump: false,
  sprint: false,
  toggleCamera: false,
  bomb: false,
};

const mMovement: IMMovement = {
  forwardM: 0,
  backwardM: 0,
  leftM: 0,
  rightM: 0,
};

export function setMMovement(type: TMMovementFields, value: number) {
  mMovement[type] = value;
}

export function getMMovement(): IMMovement {
  return mMovement;
}

export function resetAllInputs() {
  movement.forward = false;
  movement.backward = false;
  movement.left = false;
  movement.right = false;
  movement.fly = false;
  movement.jump = false;
  movement.sprint = false;
  movement.toggleCamera = false;
  movement.bomb = false;

  mMovement.forwardM = 0;
  mMovement.backwardM = 0;
  mMovement.leftM = 0;
  mMovement.rightM = 0;
}

export function setMovement(type: TMovementFields, value: boolean) {
  movement[type] = value;
}

export function getMovement(): IMovement {
  return movement;
}

const keys: Record<string, TMovementFields> = {
  KeyW: "forward",
  KeyS: "backward",
  KeyA: "left",
  KeyD: "right",
  KeyF: "fly",
  Space: "jump",
  ShiftLeft: "sprint",
  KeyQ: "toggleCamera",
  KeyG: "bomb",
};

export const usePlayerControls = () => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent, isKeyDown: boolean) => {
      const { code } = e;
      if (keys[code]) {
        // If certain UI elements are not active, prevent default key behavior
        if (
          !SGG.getChatFocus() &&
          !SGG.getMenuDisplay() &&
          !SGG.getIsInGame()
        ) {
          e.stopPropagation();
          e.preventDefault();
        }
        movement[keys[code]] = isKeyDown;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => handleKey(e, true);
    const onKeyUp = (e: KeyboardEvent) => handleKey(e, false);

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, []);
};
