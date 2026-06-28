import React from "react";

import { useBombStore } from "../../stores/bombStore";
import { type BombType, BOMB_CONFIG, BOMB_ORDER } from "../../constants/bombTypes";
import { CIPlayer, CIPlayerPhys } from "../../players/model/playerPhysic";
import { getIsDesktop } from "../../helpers/getIsDesktop";
import { CIBombManager } from "../../world/managers/bombManager";
import { CISocketMng } from "../../API/socketMessagesManager";
import { BombChipContent } from "./Bomb/BombChipVisuals";

const CLICK_FEEDBACK_MS = 220;

export const BombSelector = React.memo(function BombSelector() {
  const isDesktop = getIsDesktop();
  const unlockedBombsRaw = useBombStore((state) => state.unlockedBombs);

  const [clickedBomb, setClickedBomb] = React.useState<BombType | null>(null);
  const [hasActiveBomb, setHasActiveBomb] = React.useState(false);
  const [currentEndurance, setCurrentEndurance] = React.useState(
    CIPlayer?.endurance?.val?.curr ?? 0,
  );
  const clickResetTimer = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Persist hydration may yield Set or array — normalize.
  const unlockedBombs = React.useMemo(() => {
    if (Array.isArray(unlockedBombsRaw)) {
      return new Set(unlockedBombsRaw as BombType[]);
    }
    if (!(unlockedBombsRaw instanceof Set)) return new Set<BombType>();
    return unlockedBombsRaw;
  }, [unlockedBombsRaw]);

  // Dynamic imports break a circular dep between bomb store, achievement store, and backend.
  React.useEffect(() => {
    Promise.all([
      import("../../menu/subMenus/NavigationBar/Model/achievement/store"),
      import("../useGeneralStore"),
      import("../../API/backendAPI"),
    ])
      .then(
        ([
          {
            useAchievementsStore,
            calculateTotalAchievements,
            SAunlockAchievementsAction,
          },
          { useGStore },
          { getPlayerStatistics },
        ]) => {
          const isConnected = useGStore.getState().isConnected;
          const achievementStore = useAchievementsStore.getState();

          if (isConnected && achievementStore.totalAchievementsCount === 0) {
            getPlayerStatistics()
              .then((data) => {
                const achievements = data.achievements as {
                  [cat: string]: string[];
                } & { [key: string]: { [key: string]: boolean } };
                SAunlockAchievementsAction(achievements);
                useBombStore
                  .getState()
                  .setTotalAchievements(
                    calculateTotalAchievements(achievements),
                  );
              })
              .catch((err: unknown) => {
                if (process.env.NODE_ENV === "development") {
                  console.warn("[BombSelector] achievement fetch failed:", err);
                }
              });
            return;
          }
          const total = achievementStore.totalAchievementsCount;
          const bombStore = useBombStore.getState();
          if (total !== bombStore.totalAchievements || total > 0) {
            bombStore.setTotalAchievements(total);
          }
        },
      )
      .catch((err: unknown) => {
        if (process.env.NODE_ENV === "development") {
          console.warn("[BombSelector] achievement init failed:", err);
        }
      });
  }, []);

  React.useEffect(() => {
    const tick = () => {
      const playerId = CISocketMng.id?.toString() || "";
      setHasActiveBomb(CIBombManager.hasActiveBomb(playerId));
      setCurrentEndurance(CIPlayer?.endurance?.val?.curr ?? 0);
    };
    const interval = setInterval(tick, 16);
    return () => clearInterval(interval);
  }, []);

  const triggerPlacementFeedback = React.useCallback((bombType: BombType) => {
    setClickedBomb(bombType);
    if (clickResetTimer.current) clearTimeout(clickResetTimer.current);
    clickResetTimer.current = setTimeout(() => {
      setClickedBomb(null);
      clickResetTimer.current = null;
    }, CLICK_FEEDBACK_MS);
  }, []);

  React.useEffect(
    () => () => {
      if (clickResetTimer.current) clearTimeout(clickResetTimer.current);
    },
    [],
  );

  // Capture-phase listener so preconditions read state before engine consumes the event.
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.key < "1" || e.key > "5") return;
      const bombType = BOMB_ORDER[parseInt(e.key) - 1];
      if (bombType === undefined) return;

      const playerId = CISocketMng.id?.toString() || "";
      if (CIBombManager.hasActiveBomb(playerId)) return;

      const config = BOMB_CONFIG[bombType];
      if ((CIPlayer?.endurance?.val?.curr ?? 0) < config.enduranceCost) return;

      const unlockedRaw = useBombStore.getState().unlockedBombs;
      const isUnlocked = Array.isArray(unlockedRaw)
        ? (unlockedRaw as BombType[]).includes(bombType)
        : (unlockedRaw as Set<BombType>).has(bombType);
      if (!isUnlocked) return;

      triggerPlacementFeedback(bombType);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [triggerPlacementFeedback]);

  const handleChipClick = React.useCallback(
    (bombType: BombType) => {
      const playerId = CISocketMng.id?.toString() || "";
      if (CIBombManager.hasActiveBomb(playerId)) return;
      const placed = CIBombManager.placeBomb(
        CIPlayerPhys.position,
        playerId,
        bombType,
      );
      if (placed) triggerPlacementFeedback(bombType);
    },
    [triggerPlacementFeedback],
  );

  if (!isDesktop) return null;

  return (
    <div
      className="pointer-events-none fixed right-3 top-1/2 flex -translate-y-1/2 select-none flex-col gap-2"
      style={{ touchAction: "none" }}
    >
      {BOMB_ORDER.map((bombType, index) => {
        const config = BOMB_CONFIG[bombType];
        const isUnlocked = unlockedBombs.has(bombType);
        const enduranceProgress = Math.max(
          0,
          Math.min(1, currentEndurance / config.enduranceCost),
        );
        const isAvailable =
          isUnlocked && enduranceProgress >= 1 && !hasActiveBomb;

        return (
          <BombChip
            key={bombType}
            keyNumber={index + 1}
            scale={config.scale}
            isUnlocked={isUnlocked}
            isAvailable={isAvailable}
            isClicked={clickedBomb === bombType}
            enduranceProgress={enduranceProgress}
            onClick={() => handleChipClick(bombType)}
          />
        );
      })}
    </div>
  );
});

interface BombChipProps {
  keyNumber: number;
  scale: number;
  isUnlocked: boolean;
  isAvailable: boolean;
  isClicked: boolean;
  enduranceProgress: number;
  onClick: () => void;
}

function BombChip({
  keyNumber,
  scale,
  isUnlocked,
  isAvailable,
  isClicked,
  enduranceProgress,
  onClick,
}: BombChipProps) {
  return (
    <button
      type="button"
      aria-disabled={!isUnlocked}
      onClick={isUnlocked ? onClick : undefined}
      className={`pointer-events-auto relative flex size-12 items-center justify-center rounded-md p-0 backdrop-blur-sm transition-transform duration-150 ${
        isUnlocked ? "cursor-pointer" : "cursor-not-allowed"
      }`}
      style={{
        appearance: "none",
        font: "inherit",
        margin: 0,
        backgroundColor: isUnlocked
          ? "rgba(20,20,20,0.85)"
          : "rgba(20,20,20,0.55)",
        border: isUnlocked ? "none" : "1px solid rgba(255,255,255,0.10)",
        opacity: isUnlocked ? 1 : 0.55,
        transform: isClicked ? "scale(0.92)" : "scale(1)",
      }}
    >
      <BombChipContent
        keyNumber={keyNumber}
        scale={scale}
        isUnlocked={isUnlocked}
        isAvailable={isAvailable}
        isClicked={isClicked}
        enduranceProgress={enduranceProgress}
      />
    </button>
  );
}
