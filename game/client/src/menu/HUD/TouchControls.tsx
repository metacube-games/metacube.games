import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CIPlayer } from "../../players/model/playerPhysic";
import { Joystick } from "react-joystick-component";
import { type IJoystickUpdateEvent } from "react-joystick-component/build/lib/Joystick";
import { setMMovement, setMovement } from "../../players/model/playerControls";
import { onHammerHit } from "../../players/components/CubeHitted";
import { CIPlayerPhys } from "../../players/model/playerPhysic";
import { CIBombManager } from "../../world/managers/bombManager";
import { CISocketMng } from "../../API/socketMessagesManager";
import {
  Camera,
  ChevronUp,
  Footprints,
  Hammer,
  Menu,
  TrendingUp,
} from "lucide-react";
import emitter from "../../helpers/EventEmitter";
import { SAG, useGStore } from "../useGeneralStore";
import { getIsDesktop } from "../../helpers/getIsDesktop";
import { type BombType, BOMB_CONFIG, BOMB_ORDER } from "../../constants/bombTypes";
import { useBombStore } from "../../stores/bombStore";
import { BombChipContent, BRAND_GREEN } from "./Bomb/BombChipVisuals";

const degreConv = 180 / Math.PI;
const Z = 99999;

// Minimal event-like object passed to onHammerHit from the repeat interval.
// The interval fires after the original touchstart has been processed, so we
// cannot safely use that stale event — we only need preventDefault/stopPropagation
// (used in the !canClick fast-path) which are no-ops here since the event is gone.
const hammerIntervalNoop = { preventDefault: () => {}, stopPropagation: () => {} };

// Safe-area-aware screen insets (notches / home indicators).
const SB = "env(safe-area-inset-bottom, 0px)";
const SL = "env(safe-area-inset-left, 0px)";
const SR = "env(safe-area-inset-right, 0px)";

// Accent colours per action — uniform frosted buttons, the icon carries the hue
// so each control is recognisable at a glance without a noisy rainbow of fills.
const ACCENT = {
  neutral: "#e6e9ef",
  hammer: "#ffb454",
  jump: "#5ab0ff",
  fly: "#b48cff",
  camera: "#cfd8e3",
} as const;

// Track orientation so the bomb hotbar can drop to the bottom-centre (between
// the two thumb clusters) in the wide landscape layout, and rise to a raised
// lane above them in the narrow portrait layout. Re-renders only on rotation.
const useIsLandscape = () => {
  const [landscape, setLandscape] = React.useState(() =>
    typeof window === "undefined"
      ? true
      : window.matchMedia("(orientation: landscape)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape)");
    const onChange = (e: MediaQueryListEvent) => setLandscape(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return landscape;
};

export const TouchControlsWrapper = React.memo(() => {
  const isDesktop = getIsDesktop();
  const menuDisplay = useGStore((state) => state.menuDisplay);
  const isInGame = useGStore((state) => state.isInGame);
  const isLandscape = useIsLandscape();

  if (isDesktop || menuDisplay) return null;

  return (
    <>
      <MovementCluster />
      {isInGame && (
        <>
          <ActionCluster />
          <BombBar landscape={isLandscape} />
        </>
      )}
    </>
  );
});

TouchControlsWrapper.displayName = "TouchControlsWrapper";

/* -------------------------------------------------------------------------- */
/*  Shared button                                                             */
/* -------------------------------------------------------------------------- */

interface TouchButtonProps {
  size: number | string;
  iconSize: number;
  accent?: string;
  active?: boolean;
  label: string;
  icon: React.ComponentType<{
    size?: number;
    color?: string;
    className?: string;
    style?: React.CSSProperties;
  }>;
  touchzone?: string;
  onTouchStart?: (e: React.TouchEvent<HTMLButtonElement>) => void;
  onTouchEnd?: (e: React.TouchEvent<HTMLButtonElement>) => void;
  onTouchMove?: (e: React.TouchEvent<HTMLButtonElement>) => void;
}

const TouchButton = ({
  size,
  iconSize,
  accent = ACCENT.neutral,
  active = false,
  label,
  icon: Icon,
  touchzone,
  onTouchStart,
  onTouchEnd,
  onTouchMove,
}: TouchButtonProps) => {
  const ring = active ? BRAND_GREEN : "rgba(255,255,255,0.18)";
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      data-touchzone={touchzone}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchMove={onTouchMove}
      onContextMenu={(e) => e.preventDefault()}
      className="pointer-events-auto flex items-center justify-center rounded-full p-0 backdrop-blur-md transition-transform duration-100 active:scale-90"
      style={{
        appearance: "none",
        margin: 0,
        font: "inherit",
        width: size,
        height: size,
        background:
          "radial-gradient(circle at 50% 32%, rgba(46,46,54,0.74), rgba(12,12,15,0.74))",
        border: `1px solid ${ring}`,
        boxShadow: active
          ? `0 0 12px ${BRAND_GREEN}55, inset 0 1px 0 rgba(255,255,255,0.10)`
          : "0 3px 10px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
        color: accent,
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
      }}
    >
      <Icon
        size={iconSize}
        className="pointer-events-none"
        style={{ filter: `drop-shadow(0 0 2px ${accent}66)` }}
      />
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/*  Movement cluster (bottom-left): joystick + sprint + menu                  */
/* -------------------------------------------------------------------------- */

const joystickSize = 92;

const onJoystickMove = (e: IJoystickUpdateEvent) => {
  const x = e.x ?? 0;
  const y = e.y ?? 0;
  if (x > 0) {
    setMMovement("rightM", x);
    setMMovement("leftM", 0);
  } else {
    setMMovement("rightM", 0);
    setMMovement("leftM", -x);
  }
  if (y > 0) {
    setMMovement("forwardM", y);
    setMMovement("backwardM", 0);
  } else {
    setMMovement("forwardM", 0);
    setMMovement("backwardM", -y);
  }

  setMovement("forward", false);
  setMovement("backward", false);
  setMovement("left", false);
  setMovement("right", false);

  const angle = Math.atan2(y, x) * degreConv;

  if (angle >= -22.5 && angle <= 22.5 && x > 0) {
    setMovement("right", true);
  } else if (angle > 22.5 && angle < 67.5 && x > 0 && y > 0) {
    setMovement("right", true);
    setMovement("forward", true);
  } else if (angle >= 67.5 && angle <= 112.5 && y > 0) {
    setMovement("forward", true);
  } else if (angle > 112.5 && angle < 157.5) {
    setMovement("left", true);
    setMovement("forward", true);
  } else if (angle >= 157.5 || angle <= -157.5) {
    setMovement("left", true);
  } else if (angle > -157.5 && angle < -112.5) {
    setMovement("left", true);
    setMovement("backward", true);
  } else if (angle >= -112.5 && angle <= -67.5 && y < 0) {
    setMovement("backward", true);
  } else if (angle > -67.5 && angle < -22.5 && x > 0) {
    setMovement("right", true);
    setMovement("backward", true);
  }
};

const onJoystickEnd = () => {
  setMovement("right", false);
  setMovement("left", false);
  setMovement("forward", false);
  setMovement("backward", false);
  setMMovement("rightM", 0);
  setMMovement("leftM", 0);
  setMMovement("forwardM", 0);
  setMMovement("backwardM", 0);
};

const MovementCluster = () => {
  return (
    <div
      style={{
        position: "fixed",
        left: `calc(${SL} + 14px)`,
        bottom: `calc(${SB} + 16px)`,
        zIndex: Z,
        display: "flex",
        alignItems: "flex-end",
        gap: "12px",
        pointerEvents: "none",
      }}
    >
      <div style={{ pointerEvents: "auto", touchAction: "none" }}>
        <Joystick
          size={joystickSize}
          baseColor="#1f1f24bb"
          stickColor="#d8dbe2"
          move={onJoystickMove}
          stop={onJoystickEnd}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <BtnSprint />
        <BtnMenu />
      </div>
    </div>
  );
};

const BtnMenu = () => {
  const { t } = useTranslation();
  return (
    <TouchButton
      label={t("ui.touchControls.openMenu")}
      icon={Menu}
      size={46}
      iconSize={22}
      onTouchStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
        SAG.setMenuDisplay(true);
      }}
    />
  );
};

const BtnSprint = () => {
  const { t } = useTranslation();
  const [active, setActive] = React.useState(true);
  useEffect(() => {
    setMovement("sprint", false);
  }, []);

  const onToggle = (e: React.TouchEvent<HTMLElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setMovement("sprint", active);
    setActive((prev) => !prev);
  };

  // `active` starts true; tapping engages sprint and flips it. So sprint is
  // engaged when `!active` — surface that with the green accent ring.
  return (
    <TouchButton
      label={t("ui.touchControls.toggleSprint")}
      icon={Footprints}
      size={46}
      iconSize={22}
      accent={!active ? BRAND_GREEN : ACCENT.neutral}
      active={!active}
      onTouchStart={onToggle}
    />
  );
};

/* -------------------------------------------------------------------------- */
/*  Action cluster (bottom-right): camera / fly over jump / hammer            */
/* -------------------------------------------------------------------------- */

const onJumpStart = (e: React.TouchEvent<HTMLElement>): void => {
  setMovement("jump", true);
  CIPlayerPhys.deActivateJump = false;
  emitter.emit("touchStartAb", e);
};
const onJumpEnd = (): void => {
  CIPlayerPhys.deActivateJump = true;
};
const onJumpMove = (e: React.TouchEvent<HTMLElement>): void => {
  emitter.emit("touchMoveAb", e);
};

const onCameraStart = (): void => {
  setMovement("toggleCamera", true);
};
const onCameraEnd = (): void => {
  setMovement("toggleCamera", false);
};

const onFlyStart = (e: React.TouchEvent<HTMLElement>): void => {
  emitter.emit("touchStartAb", e);
  setMovement("fly", true);
};
const onFlyEnd = (): void => {
  setMovement("fly", false);
};
const onFlyMove = (e: React.TouchEvent<HTMLElement>): void => {
  emitter.emit("touchMoveAb", e);
};

const PRIMARY = "clamp(56px, 15vw, 64px)";
const SECONDARY = "clamp(48px, 12.5vw, 54px)";

const ActionCluster = () => {
  return (
    <div
      style={{
        position: "fixed",
        right: `calc(${SR} + 14px)`,
        bottom: `calc(${SB} + 16px)`,
        zIndex: Z,
        display: "grid",
        gridTemplateColumns: "auto auto",
        alignItems: "end",
        justifyItems: "center",
        gap: "12px",
        pointerEvents: "none",
      }}
    >
      <BtnCamera />
      <BtnFly />
      <BtnTap />
      <BtnJump />
    </div>
  );
};

const BtnCamera = () => {
  const { t } = useTranslation();
  return (
    <TouchButton
      label={t("ui.touchControls.toggleCamera")}
      icon={Camera}
      size={SECONDARY}
      iconSize={22}
      accent={ACCENT.camera}
      touchzone="cameraControl"
      onTouchStart={onCameraStart}
      onTouchEnd={onCameraEnd}
    />
  );
};

const BtnFly = () => {
  const { t } = useTranslation();
  return (
    <TouchButton
      label={t("ui.touchControls.fly")}
      icon={TrendingUp}
      size={SECONDARY}
      iconSize={22}
      accent={ACCENT.fly}
      touchzone="cameraControl"
      onTouchStart={onFlyStart}
      onTouchEnd={onFlyEnd}
      onTouchMove={onFlyMove}
    />
  );
};

const BtnJump = () => {
  const { t } = useTranslation();
  return (
    <TouchButton
      label={t("ui.touchControls.jump")}
      icon={ChevronUp}
      size={PRIMARY}
      iconSize={30}
      accent={ACCENT.jump}
      touchzone="cameraControl"
      onTouchStart={onJumpStart}
      onTouchEnd={onJumpEnd}
      onTouchMove={onJumpMove}
    />
  );
};

const onTapMove = (e: React.TouchEvent<HTMLElement>): void => {
  emitter.emit("touchMoveAb", e);
};

const BtnTap = () => {
  const { t } = useTranslation();
  const repeatIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (repeatIntervalRef.current) {
        clearInterval(repeatIntervalRef.current);
        repeatIntervalRef.current = null;
      }
    };
  }, []);

  const onUp = (): void => {
    if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
  };
  const onTap = (e: React.TouchEvent<HTMLElement>): void => {
    emitter.emit("touchStartAb", e);
    onHammerHit(onUp, e);
    if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current);
    }
    repeatIntervalRef.current = setInterval(() => {
      onHammerHit(onUp, hammerIntervalNoop);
    }, 240);
  };

  return (
    <TouchButton
      label={t("ui.touchControls.hit")}
      icon={Hammer}
      size={PRIMARY}
      iconSize={28}
      accent={ACCENT.hammer}
      touchzone="cameraControl"
      onTouchStart={onTap}
      onTouchMove={onTapMove}
      onTouchEnd={onUp}
    />
  );
};

/* -------------------------------------------------------------------------- */
/*  Bomb bar (raised, centred hotbar that clears both thumb clusters)         */
/* -------------------------------------------------------------------------- */

const BOMB_SIZE = "clamp(42px, 11vw, 52px)";
const BOMB_PRESS_MS = 200;

const BombBar = ({ landscape }: { landscape: boolean }) => {
  const unlockedBombs = useBombStore((state) => state.unlockedBombs);
  const [currentEndurance, setCurrentEndurance] = React.useState(0);
  const [hasActiveBomb, setHasActiveBomb] = React.useState(false);
  const [pressed, setPressed] = React.useState<BombType | null>(null);
  const pressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const checkState = () => {
      setCurrentEndurance(CIPlayer.endurance.val.curr);
      const playerId = CISocketMng.id?.toString() || "";
      setHasActiveBomb(CIBombManager.hasActiveBomb(playerId));
    };

    const interval = setInterval(checkState, 16);
    return () => clearInterval(interval);
  }, []);

  useEffect(
    () => () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
    },
    [],
  );

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        // Landscape is wide enough to seat the hotbar low, in the gap between the
        // two thumb clusters — raised just enough to clear the centred HP /
        // endurance stack (.HPMPMenu sits at bottom 12px, ~74px tall). Portrait
        // is too narrow for that gap, so it rises to a lane above the clusters.
        bottom: landscape
          ? `calc(${SB} + 88px)`
          : `calc(${SB} + clamp(146px, 19vh, 168px))`,
        zIndex: Z,
        display: "flex",
        gap: "clamp(5px, 1.6vw, 8px)",
        padding: "6px",
        borderRadius: "16px",
        maxWidth: "calc(100vw - 24px)",
        background: "rgba(10,10,12,0.42)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        pointerEvents: "none",
      }}
    >
      {BOMB_ORDER.map((bombType, index) => {
        const config = BOMB_CONFIG[bombType];
        const isUnlocked = Array.isArray(unlockedBombs)
          ? (unlockedBombs as BombType[]).includes(bombType)
          : unlockedBombs.has(bombType);
        const enduranceProgress = Math.max(
          0,
          Math.min(1, currentEndurance / config.enduranceCost),
        );
        const hasEnoughEndurance = enduranceProgress >= 1;
        const isAvailable = isUnlocked && hasEnoughEndurance && !hasActiveBomb;

        const onStart = (e: React.TouchEvent<HTMLDivElement>): void => {
          e.preventDefault();
          e.stopPropagation();
          if (!isAvailable) return;

          emitter.emit("touchStartAb", e);
          const playerId = CISocketMng.id?.toString() || "";
          CIBombManager.placeBomb(CIPlayerPhys.position, playerId, bombType);

          setPressed(bombType);
          if (pressTimer.current) clearTimeout(pressTimer.current);
          pressTimer.current = setTimeout(
            () => setPressed(null),
            BOMB_PRESS_MS,
          );
        };

        const onMove = (e: React.TouchEvent<HTMLDivElement>): void => {
          emitter.emit("touchMoveAb", e);
        };

        return (
          <div
            key={bombType}
            data-touchzone="cameraControl"
            onTouchStart={onStart}
            onTouchMove={onMove}
            className="pointer-events-auto relative flex items-center justify-center rounded-xl backdrop-blur-sm transition-transform duration-150"
            style={{
              width: BOMB_SIZE,
              height: BOMB_SIZE,
              backgroundColor: isUnlocked
                ? "rgba(20,20,20,0.85)"
                : "rgba(20,20,20,0.55)",
              border: isUnlocked
                ? "1px solid rgba(255,255,255,0.10)"
                : "1px solid rgba(255,255,255,0.08)",
              opacity: isUnlocked ? 1 : 0.55,
              transform: pressed === bombType ? "scale(0.92)" : "scale(1)",
              userSelect: "none",
              WebkitUserSelect: "none",
              touchAction: "none",
            }}
          >
            <BombChipContent
              keyNumber={index + 1}
              scale={config.scale}
              isUnlocked={isUnlocked}
              isAvailable={isAvailable}
              isClicked={pressed === bombType}
              enduranceProgress={enduranceProgress}
            />
          </div>
        );
      })}
    </div>
  );
};
