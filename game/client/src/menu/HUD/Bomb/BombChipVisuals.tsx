import React from "react";
import { Bomb, Lock } from "lucide-react";
import { colorGreen, colorRed } from "../../styles/colors";

/**
 * Shared visual primitives for bomb chips, used by both the desktop
 * BombSelector (mouse) and the mobile TouchControls bomb bar (touch).
 * Keeping the visuals in one place guarantees the two surfaces stay
 * identical while each owns its own interaction wrapper.
 */

export const BRAND_GREEN = colorGreen;
const BRAND_RED = colorRed;

const bombIconSize = (scale: number, base = 14, offset = 4) =>
  Math.round(scale * base + offset);

const RING_PATH =
  "M 24 1.25 L 41.75 1.25 A 5 5 0 0 1 46.75 6.25 L 46.75 41.75 A 5 5 0 0 1 41.75 46.75 L 6.25 46.75 A 5 5 0 0 1 1.25 41.75 L 1.25 6.25 A 5 5 0 0 1 6.25 1.25 Z";

function EnduranceRing({
  progress,
  ready,
}: {
  progress: number;
  ready: boolean;
}) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 size-full overflow-visible"
      viewBox="0 0 48 48"
    >
      <path
        d={RING_PATH}
        fill="none"
        stroke="rgba(14,198,48,0.18)"
        strokeWidth="2.5"
      />
      <path
        d={RING_PATH}
        pathLength={100}
        fill="none"
        stroke={ready ? BRAND_GREEN : "rgba(14,198,48,0.85)"}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="100"
        strokeDashoffset={100 * (1 - progress)}
        style={{
          filter: ready ? `drop-shadow(0 0 4px ${BRAND_GREEN})` : "none",
          transition:
            "stroke-dashoffset 0.12s linear, stroke 0.2s ease, filter 0.2s ease",
        }}
      />
    </svg>
  );
}

function KeyCap({
  label,
  tone,
  corner,
  pressed = false,
}: {
  label: React.ReactNode;
  tone: "green" | "red";
  corner: "tl" | "br";
  pressed?: boolean;
}) {
  const accent = tone === "green" ? BRAND_GREEN : BRAND_RED;
  const glow =
    tone === "green" ? "rgba(14,198,48,0.45)" : "rgba(230,48,48,0.45)";
  const cornerCls =
    corner === "tl"
      ? "top-0 left-0 -translate-x-1/2 -translate-y-1/2"
      : "bottom-0 right-0 translate-x-1/2 translate-y-1/2";

  return (
    <span
      className={`absolute flex size-[16px] items-center justify-center rounded-[3px] font-mono text-[10px] font-bold leading-none ${cornerCls}`}
      style={{
        backgroundColor: pressed && tone === "green" ? accent : "#1a1a1a",
        border: `1px solid ${accent}`,
        borderRightWidth: pressed ? "1px" : "2px",
        borderBottomWidth: pressed ? "1px" : "2px",
        color: pressed && tone === "green" ? "#0b0b0b" : accent,
        boxShadow: `0 0 6px ${glow}`,
        // Avoid stacking translates with the corner classes — shift via margin.
        marginTop: pressed ? "1px" : 0,
        marginLeft: pressed ? "1px" : 0,
        transition:
          "border-width 0.12s ease, margin 0.12s ease, background-color 0.12s ease, color 0.12s ease",
      }}
    >
      {label}
    </span>
  );
}

/**
 * The inner content of a bomb chip (endurance ring + bomb glyph + key cap +
 * lock badge). Render this inside whatever interactive wrapper the surface
 * needs — a <button> on desktop, a touch <div> on mobile.
 */
export function BombChipContent({
  keyNumber,
  scale,
  isUnlocked,
  isAvailable,
  isClicked,
  enduranceProgress,
}: {
  keyNumber: number;
  scale: number;
  isUnlocked: boolean;
  isAvailable: boolean;
  isClicked: boolean;
  enduranceProgress: number;
}) {
  return (
    <>
      {isUnlocked && (
        <EnduranceRing progress={enduranceProgress} ready={isAvailable} />
      )}

      <Bomb
        size={bombIconSize(scale)}
        color={!isUnlocked ? "#888" : isAvailable ? BRAND_GREEN : "#f1f1f1"}
        strokeWidth={2}
        style={{
          opacity: isUnlocked ? 1 : 0.4,
          filter: isAvailable
            ? `drop-shadow(0 0 3px ${BRAND_GREEN})`
            : "drop-shadow(0 0 1px rgba(0,0,0,0.8))",
          transition: "color 0.2s ease, filter 0.2s ease",
        }}
      />

      <KeyCap
        label={String(keyNumber)}
        tone="green"
        corner="tl"
        pressed={isClicked}
      />

      {!isUnlocked && (
        <KeyCap
          tone="red"
          corner="br"
          label={<Lock size={9} color={BRAND_RED} strokeWidth={2.5} />}
        />
      )}
    </>
  );
}
