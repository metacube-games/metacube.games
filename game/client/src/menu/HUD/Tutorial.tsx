import * as React from "react";
import { startTransition, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { SGG, useGStore } from "../useGeneralStore";

const TRACKED_KEYS = [
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyF",
  "KeyQ",
  "Space",
  "ShiftLeft",
] as const;
type TrackedKey = (typeof TRACKED_KEYS)[number];

// TODO: localize for AZERTY/QWERTZ — engine uses layout-independent codes, glyph is cosmetic.
const keyFromQWERT = (inputKey: string) => inputKey;

function Key({ label, isPressed }: { label: string; isPressed: boolean }) {
  return <span className={`key ${isPressed ? "pressed" : ""}`}>{label}</span>;
}

export const ControlsTutorial = () => {
  const isInGame = useGStore((state) => state.isInGame);
  const [pressedKeys, setPressedKeys] = useState<
    Partial<Record<TrackedKey, boolean>>
  >({});
  const [finished, setFinished] = useState(false);

  const allKeysPressed = TRACKED_KEYS.every((key) => pressedKeys[key]);

  useEffect(() => {
    if (!allKeysPressed) return;
    const id = setTimeout(() => setFinished(true), 2000);
    return () => clearTimeout(id);
  }, [allKeysPressed]);

  if (finished || !isInGame) return null;

  return (
    <TutoKey
      setPressedKeys={setPressedKeys}
      allKeysPressed={allKeysPressed}
      pressedKeys={pressedKeys}
    />
  );
};

function TutoKey({
  setPressedKeys,
  allKeysPressed,
  pressedKeys,
}: {
  setPressedKeys: React.Dispatch<
    React.SetStateAction<Partial<Record<TrackedKey, boolean>>>
  >;
  allKeysPressed: boolean;
  pressedKeys: Partial<Record<TrackedKey, boolean>>;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const key = e.code as TrackedKey;
      if (!TRACKED_KEYS.includes(key)) return;
      if (!SGG.getChatFocus() && !SGG.getIsInGame() && !SGG.getMenuDisplay()) {
        e.stopPropagation();
        e.preventDefault();
      }
      startTransition(() => {
        setPressedKeys((prev) => ({ ...prev, [key]: true }));
      });
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [setPressedKeys]);

  return (
    <div className={`controls-ui ${allKeysPressed ? "finished" : ""}`}>
      <div className="group">
        <div className="description">{t("ui.controls.move")}</div>
        <div className="keys">
          <Key label={keyFromQWERT("W")} isPressed={!!pressedKeys.KeyW} />
          <Key label={keyFromQWERT("A")} isPressed={!!pressedKeys.KeyA} />
          <Key label={keyFromQWERT("S")} isPressed={!!pressedKeys.KeyS} />
          <Key label={keyFromQWERT("D")} isPressed={!!pressedKeys.KeyD} />
        </div>
      </div>
      <div className="key-description">
        <Key label={keyFromQWERT("Q")} isPressed={!!pressedKeys.KeyQ} />
        <span className="description">{t("ui.controls.toggleView")}</span>
      </div>
      <div className="key-description">
        <Key label={keyFromQWERT("F")} isPressed={!!pressedKeys.KeyF} />
        <span className="description">{t("ui.controls.fly")}</span>
      </div>
      <div className="key-description">
        <Key label="Space" isPressed={!!pressedKeys.Space} />
        <span className="description">{t("ui.controls.jump")}</span>
      </div>
      <div className="key-description">
        <Key label="Shift" isPressed={!!pressedKeys.ShiftLeft} />
        <span className="description">{t("ui.controls.run")}</span>
      </div>
    </div>
  );
}
