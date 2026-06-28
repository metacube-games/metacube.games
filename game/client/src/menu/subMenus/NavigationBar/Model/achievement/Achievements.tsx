import * as React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Lock, Unlock } from "lucide-react";

import { Card } from "../../../../../components/ui/card";
import { Separator } from "../../../../../components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../../../components/ui/tooltip";
import { cn } from "../../../../../lib/utils";

import achievementsJson from "../../../../../envData/achievements.json";
import { getPlayerStatistics } from "../../../../../API/backendAPI";
import {
  SAgetCurrentPlayer,
  SAresetAchievementsAction,
  SAsetCurrentPlayer,
  SAunlockAchievementsAction,
  useAchievementsStore,
  type IAchievement,
} from "./store";
import {
  ACHIEVEMENT_GROUP_THRESHOLDS,
  ACHIEVEMENT_GROUP_TYPES,
} from "./achievementGroups";
import { useGStore } from "../../../../useGeneralStore";
import { METACUBE_COIN_SVG2 } from "../../../../HUD/CoinSvg";
const images = import.meta.glob("../../../../../assets/achievements/**/*.png");
import lockedIcon from "../../../../../assets/menuImage/locked.png";
import { LoginOverlay } from "../../LoginOverlay";
import { useBombStore } from "../../../../../stores/bombStore";
import {
  BOMB_CONFIG,
  BOMB_ORDER,
  BombType,
} from "../../../../../constants/bombTypes";

// Must match the literal relative paths used as `import.meta.glob` keys.
const ACHIEVEMENT_IMAGE_DIR = "../../../../../assets/achievements";

// Grid render/iteration order: thresholds are listed before types.
const ACHIEVEMENT_GROUPS = [
  ACHIEVEMENT_GROUP_THRESHOLDS,
  ACHIEVEMENT_GROUP_TYPES,
] as const;

const TOTAL_ACHIEVEMENTS = achievementsJson.categories.reduce(
  (sum, cat) =>
    sum +
    ACHIEVEMENT_GROUPS.reduce((s, group) => {
      const items = (cat as Record<string, unknown>)[group];
      return s + (items ? Object.keys(items).length : 0);
    }, 0),
  0,
);

export const descKey = (catName: string, key: string) =>
  `achievements.descriptions.${catName}.${key}`;

export const AchievementMenu = React.memo(function AchievementMenu() {
  const { t } = useTranslation();
  const address = useGStore((state) => state.address);
  const isLogin = useGStore((state) => state.isConnected);

  useEffect(() => {
    if (!address || !isLogin) {
      SAresetAchievementsAction();
      return;
    }
    if (address === SAgetCurrentPlayer()) return;

    SAresetAchievementsAction();
    let cancelled = false;
    (async () => {
      try {
        const data = await getPlayerStatistics();
        if (cancelled) return;
        SAsetCurrentPlayer(address);
        SAunlockAchievementsAction(
          data.achievements as Parameters<typeof SAunlockAchievementsAction>[0],
        );
        useBombStore
          .getState()
          .setTotalAchievements(
            useAchievementsStore.getState().totalAchievementsCount,
          );
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn(err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, isLogin]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col gap-3">
        {!isLogin && <LoginOverlay text={t("achievements.loginRequired")} />}
        <BombUnlockCard />
        <AchievementGrid />
      </div>
    </TooltipProvider>
  );
});

function AchievementGrid() {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {achievementsJson.categories.flatMap((cat) =>
        ACHIEVEMENT_GROUPS.flatMap((group) => {
          const items = (cat as Record<string, unknown>)[group] as
            | Record<string, IAchievement>
            | undefined;
          if (!items) return [];
          return Object.values(items).map((achievement) => (
            <AchievementItem
              key={`${cat.name}-${achievement.key}`}
              achievement={achievement}
              catName={cat.name}
            />
          ));
        }),
      )}
    </div>
  );
}

function AchievementItem({
  achievement,
  catName,
}: {
  achievement: IAchievement;
  catName: string;
}) {
  const { t } = useTranslation();
  const { key, reward } = achievement;
  const unlocked = useAchievementsStore(
    (state) => state?.achievements?.[catName]?.[key] ?? false,
  );
  // Derived during render so a lock/unlock change never shows a stale frame;
  // only the asynchronously-loaded unlocked image needs to live in state.
  const [unlockedIcon, setUnlockedIcon] = useState<string | null>(null);
  const icon = unlocked && unlockedIcon ? unlockedIcon : lockedIcon;

  useEffect(() => {
    if (!unlocked) return;
    let cancelled = false;
    const imagePath = `${ACHIEVEMENT_IMAGE_DIR}/${catName}/${key}.png`;
    const loader = images[imagePath];
    if (!loader) {
      if (import.meta.env.DEV) {
        console.warn(`Achievement image missing: ${imagePath}`);
      }
      return;
    }
    loader()
      .then((mod) => {
        if (cancelled) return;
        setUnlockedIcon((mod as { default: string }).default);
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.error("Failed to load achievement image:", err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [unlocked, catName, key]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <img
          src={icon}
          alt={achievement.name}
          className={cn(
            "h-14 w-auto cursor-default rounded-sm border-2 [image-rendering:pixelated] transition-all duration-300 sm:h-16",
            unlocked
              ? "border-primary/40 brightness-100 hover:scale-105 hover:brightness-125"
              : "border-muted/30 brightness-50 grayscale-[80%] hover:brightness-75",
          )}
        />
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-xs space-y-2 border-border bg-popover/95 p-3 backdrop-blur"
      >
        <div className="flex items-end gap-2">
          <img
            src={icon}
            alt={achievement.name}
            className="h-10 w-auto rounded-sm [image-rendering:pixelated]"
          />
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold">
              {unlocked ? achievement.name : t("achievements.locked")}
            </p>
            {unlocked ? (
              <Unlock
                className="size-3.5 text-primary"
                aria-label={t("achievements.unlocked")}
              />
            ) : (
              <Lock
                className="size-3.5 text-muted-foreground"
                aria-label={t("achievements.locked")}
              />
            )}
          </div>
        </div>
        <Separator />
        <p className="text-xs italic">
          {unlocked ? t(descKey(catName, key)) : t("achievements.locked")}
        </p>
        <p className="flex items-center gap-1 text-xs font-semibold">
          <span className="text-primary">{t("achievements.reward")}:</span>
          {unlocked ? reward : t("achievements.locked")}
          {unlocked && METACUBE_COIN_SVG2}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function BombUnlockCard() {
  const { t } = useTranslation();
  const { unlockedBombs, totalAchievements, getNextUnlockThreshold } =
    useBombStore();
  const nextUnlock = getNextUnlockThreshold();

  // Persist hydration may yield either a Set or a JSON-array; accept either.
  const isUnlocked = (bombType: BombType) =>
    Array.isArray(unlockedBombs)
      ? (unlockedBombs as BombType[]).includes(bombType)
      : unlockedBombs.has(bombType);

  return (
    <Card className="flex flex-col gap-3 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-foreground">
          {t("achievements.bombLevel", "Bomb Level")}
        </p>
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold tabular-nums text-primary">
            {totalAchievements} / {TOTAL_ACHIEVEMENTS}
          </span>
          {" · "}
          {nextUnlock !== null
            ? t("achievements.nextBombAt", "Next bomb at {{n}} achievements", {
                n: nextUnlock,
              })
            : t("achievements.allBombsUnlocked", "All bombs unlocked!")}
        </span>
      </div>

      <ul className="grid grid-cols-5 gap-3">
        {BOMB_ORDER.map((bombType) => {
          const config = BOMB_CONFIG[bombType];
          const unlocked = isUnlocked(bombType);
          return (
            <li key={bombType}>
              <Card
                size="nested"
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 p-3 text-center transition-colors",
                  unlocked && "border-primary/60 bg-primary/10",
                )}
              >
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {t(`bombs.${BombType[bombType].toLowerCase()}.name`)}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-sm font-semibold tabular-nums",
                    unlocked ? "text-primary" : "text-muted-foreground/60",
                  )}
                >
                  {unlocked ? (
                    <Unlock
                      className="size-3.5"
                      aria-label={t("achievements.unlocked")}
                    />
                  ) : (
                    <Lock
                      className="size-3.5"
                      aria-label={t("achievements.locked")}
                    />
                  )}
                  {config.unlockAchievements}
                </span>
              </Card>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
