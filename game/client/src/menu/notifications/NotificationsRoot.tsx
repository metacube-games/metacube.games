import { useEffect, useRef, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";

import emitter from "../../helpers/EventEmitter";
import i18n from "../../i18n/config";
import { getNextRandom } from "../../helpers/computedRandom";
import { CISettingsMng } from "../subMenus/NavigationBar/Model/CSettingsManager";
import {
  type AchievementCategory,
  AchievementTypes,
  type IAchievement,
  SAunlockAction,
  useAchievementsStore,
} from "../subMenus/NavigationBar/Model/achievement/store";
import achievementsJson from "../../envData/achievements.json";
import { CISoundMng } from "../../sound/soundFX";
import { METACUBE_COIN_SVG2 } from "../HUD/CoinSvg";
import { colorGreen, colorGreenRgb, colorRed } from "../styles/colors";
import nftWinIcon from "../../assets/menuImage/nftCardIcon.png";
import deathIcon from "../../assets/menuImage/deathIcon.png";
import lockedIcon from "../../assets/menuImage/locked.png";

const ACHIEVEMENT_IMAGES = import.meta.glob(
  "../../assets/achievements/**/*.png",
);

const DEATH_MESSAGE_COUNT = 44;
const NFT_MESSAGE_COUNT = 30;
const ACHIEVEMENT_DEBOUNCE_MS = 3800;

export function NotificationsRoot() {
  return (
    <>
      <Toaster
        toastOptions={{
          duration: 5000,
          style: {
            background: "transparent",
            boxShadow: "none",
            padding: 0,
            margin: 0,
            maxWidth: "none",
          },
        }}
        containerStyle={{
          top: 72,
          right: 12,
          left: 12,
          pointerEvents: "none",
        }}
      />
      <EventFeedBridge />
      <AchievementBridge />
    </>
  );
}

function EventFeedBridge() {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(() =>
    CISettingsMng.hud.showEventBar.getVal(),
  );

  useEffect(() => {
    const sub = CISettingsMng.hud.showEventBar.addListener(setEnabled);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onListen = (event: {
      type: "death" | "nftWin";
      playerName: string;
    }) => {
      const isDeath = event.type === "death";
      const count = isDeath ? DEATH_MESSAGE_COUNT : NFT_MESSAGE_COUNT;
      const prefix = isDeath
        ? "snackbar.death.message"
        : "snackbar.nftWin.message";
      const message = t(`${prefix}${Math.floor(getNextRandom() * count) + 1}`);

      toast.custom(
        (tt) => (
          <FeedToast
            visible={tt.visible}
            playerName={event.playerName}
            message={message}
            color={isDeath ? colorRed : colorGreen}
            icon={isDeath ? deathIcon : nftWinIcon}
          />
        ),
        { duration: 5000, position: "top-right" },
      );
    };

    const listener = emitter.addListener("snackBarEvent", onListen);
    return () => listener.remove();
  }, [enabled, t]);

  return null;
}

function FeedToast({
  visible,
  playerName,
  message,
  color,
  icon,
}: {
  visible: boolean;
  playerName: string;
  message: string;
  color: string;
  icon: string;
}) {
  return (
    <div
      className="pointer-events-none flex max-w-[calc(100vw-24px)] items-center gap-2 rounded-md border bg-[rgba(20,20,20,0.85)] px-3 py-1.5 text-[12px] backdrop-blur-sm sm:text-[14px]"
      style={{
        borderColor: `color-mix(in srgb, ${color} 50%, transparent)`,
        fontFamily: '"Nova Square", sans-serif',
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}
    >
      <span>
        <span className="font-bold" style={{ color }}>
          {playerName}
        </span>{" "}
        <span className="text-white/85">{message}</span>
      </span>
      <img
        src={icon}
        alt=""
        className="size-4 shrink-0 [image-rendering:pixelated]"
      />
    </div>
  );
}

function AchievementBridge() {
  const notifEntries = useAchievementsStore((s) => s.notifEntries);
  const lastFireRef = useRef(0);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const [cat, type, key] = notifEntries;
    if (cat === -1) return;
    const delay = Math.max(
      0,
      ACHIEVEMENT_DEBOUNCE_MS - (Date.now() - lastFireRef.current),
    );
    if (pendingRef.current) clearTimeout(pendingRef.current);
    pendingRef.current = setTimeout(() => {
      void fireAchievement(cat, type, key);
      lastFireRef.current = Date.now();
    }, delay);

    return () => {
      if (pendingRef.current) clearTimeout(pendingRef.current);
    };
  }, [notifEntries]);

  return null;
}

async function fireAchievement(cat: number, type: number, key: number) {
  const notifType = AchievementTypes[type ?? 0];
  const category = achievementsJson.categories[cat ?? 0];
  if (!category) return;
  const currType = (category as unknown as Record<string, IAchievement[]>)[
    (notifType as "types" | "thresholds") ?? "types"
  ];
  const data = currType?.[key ?? 0];
  if (!category?.name || !data?.key) return;

  SAunlockAction(category.name as AchievementCategory, data.key);
  CISoundMng?.soundsFx.achievement.updateSound();

  let img = lockedIcon;
  const path = `../../assets/achievements/${category.name}/${data.key}.png`;
  const mod = ACHIEVEMENT_IMAGES[path];
  if (mod) {
    try {
      const loaded = (await mod()) as { default: string };
      img = loaded.default;
    } catch {
      // Fall back to lockedIcon on load failure.
    }
  }

  toast.custom(
    (tt) => (
      <div
        className="pointer-events-none flex max-w-[calc(100vw-24px)] items-center gap-3 rounded-md border bg-[rgba(20,20,20,0.85)] px-3 py-2 text-white backdrop-blur-sm"
        style={{
          borderColor: `rgba(${colorGreenRgb},0.5)`,
          opacity: tt.visible ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      >
        <img
          src={img}
          alt={data.name}
          className="h-10 w-auto rounded-sm [image-rendering:pixelated]"
          style={{ boxShadow: `0 0 6px rgba(${colorGreenRgb},0.35)` }}
        />
        <div className="flex flex-col gap-0.5">
          <span
            className="text-[11px] font-semibold uppercase leading-none tracking-wider"
            style={{ color: colorGreen }}
          >
            {i18n.t("achievements.toastLabel")}
          </span>
          <span className="text-[14px] font-bold leading-tight">
            {data.name}
          </span>
          <span className="flex items-center gap-1 text-[12px] text-white/80">
            +{data.reward}
            <span className="inline-flex items-center">
              {METACUBE_COIN_SVG2}
            </span>
          </span>
        </div>
      </div>
    ),
    { duration: 3500, position: "top-center" },
  );
}
