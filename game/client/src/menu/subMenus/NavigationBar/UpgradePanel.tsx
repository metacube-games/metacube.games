import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { cn } from "../../../lib/utils";

import { getCoins, postUpgrade } from "../../../API/backendAPI";
import {
  CIUpgradeMng,
  MAX_LEVEL_LABEL,
  type CUpgrade,
} from "./Model/CUpgradeManager";
import upgradesJson from "../../../envData/upgrades.json";
import { colorGreen, colorRed } from "../../styles/colors";
import { CIPlayer } from "../../../players/model/playerPhysic";
import emitter from "../../../helpers/EventEmitter";
import { MetacubeCoinSvg } from "../../HUD/CoinSvg";
import {
  caffeine,
  luckPath,
  networkPath,
  rigPath,
  stakingPath,
  walletPath,
} from "../../../assets/menuImage/upgrades/upgrades";
import { CISoundMng } from "../../../sound/soundFX";
import { useGStore } from "../../useGeneralStore";
import { createToastPopup } from "../../notifications/createToastPopup";
import { LoginOverlay } from "./LoginOverlay";

export const MAX_LEVEL = upgradesJson.attackRange.levels.length;

const UPGRADE_META: Record<
  string,
  {
    nameKey: string;
    descKey: string;
    surname: string;
    valueSuffix: string;
    image: string;
  }
> = {
  damage: {
    nameKey: "upgrades.miningRig",
    descKey: "upgrades.miningRigDesc",
    surname: "Attack",
    valueSuffix: " damage",
    image: rigPath,
  },
  health: {
    nameKey: "upgrades.wallet",
    descKey: "upgrades.walletDesc",
    surname: "Health",
    valueSuffix: " health",
    image: walletPath,
  },
  fly: {
    nameKey: "upgrades.caffeine",
    descKey: "upgrades.caffeineDesc",
    surname: "Stamina",
    valueSuffix: " stamina",
    image: caffeine,
  },
  attackRange: {
    nameKey: "upgrades.network",
    descKey: "upgrades.networkDesc",
    surname: "Range",
    valueSuffix: " meters",
    image: networkPath,
  },
  criticalHit: {
    nameKey: "upgrades.proofOfLuck",
    descKey: "upgrades.proofOfLuckDesc",
    surname: "Critical hit",
    valueSuffix: " critical",
    image: luckPath,
  },
  multiplier: {
    nameKey: "upgrades.staking",
    descKey: "upgrades.stakingDesc",
    surname: "Multiplier",
    valueSuffix: " value",
    image: stakingPath,
  },
};

const formatStatValue = (raw: string | undefined, upgradeName: string) => {
  if (!raw) return "";
  if (raw === MAX_LEVEL_LABEL) return raw;
  const suffix = UPGRADE_META[upgradeName]?.valueSuffix;
  return suffix ? raw.replace(suffix, "") : raw;
};

export const UpgradePanelValue = React.memo(() => {
  const { t } = useTranslation();
  const isLogin = useGStore((state) => state.isConnected);

  const { data } = useQuery({
    queryKey: ["moneyFetch"],
    queryFn: async () => {
      const coins = await getCoins();
      CIPlayer.money.val = coins;
      emitter.emit("menuMoney", coins);
      return coins;
    },
    enabled: isLogin,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const [money, setMoney] = useState<number>(() => CIPlayer.money.val);

  useEffect(() => {
    if (!isLogin) return;
    setMoney(data ?? CIPlayer.money.val);
    const listener = emitter.addListener("menuMoney", setMoney);
    return () => listener.remove();
  }, [data, isLogin]);

  return (
    <Card className="flex shrink-0 items-center justify-between gap-3 p-3">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {t("upgrades.balance", "Balance")}
      </span>
      <span className="flex items-center gap-1 text-base font-semibold text-primary">
        {isLogin ? money : 0}
        <MetacubeCoinSvg wh="20" />
      </span>
    </Card>
  );
});
UpgradePanelValue.displayName = "UpgradePanelValue";

export const UpgradePanel = React.memo(() => {
  const { t } = useTranslation();
  const isConnected = useGStore((state) => state.isConnected);

  const upgrades = useMemo(() => Object.values(CIUpgradeMng.upgrades), []);

  return (
    <div className="relative flex flex-col gap-3 md:h-full md:min-h-0">
      {!isConnected && (
        <LoginOverlay text={t("overlays.loginToViewUpgrades")} />
      )}
      <UpgradePanelValue />
      <div className="grid w-full grid-cols-1 gap-3 md:min-h-0 md:flex-1 md:auto-rows-fr md:grid-cols-2">
        {upgrades.map((upgrade) => (
          <UpgradeTile
            key={upgrade.name}
            upgrade={upgrade}
            isConnected={isConnected}
          />
        ))}
      </div>
    </div>
  );
});
UpgradePanel.displayName = "UpgradePanel";

type AnyUpgrade = CUpgrade<number> | CUpgrade<number[]>;

const UpgradeTile = React.memo(
  ({ upgrade, isConnected }: { upgrade: AnyUpgrade; isConnected: boolean }) => {
    const { t } = useTranslation();
    const { name, displayName, statsListDescr, cost } = upgrade;
    const meta = UPGRADE_META[name];

    const [level, setLevel] = useState(upgrade.currLvl);
    const [money, setMoney] = useState<number>(() => CIPlayer.money.val);

    useEffect(() => {
      setMoney(CIPlayer.money.val);
      const listener = emitter.addListener("menuMoney", setMoney);
      return () => listener.remove();
    }, []);

    const atMax = level >= MAX_LEVEL;
    const currentCost = cost[level - 1];
    const canAfford = !atMax && money >= Number(currentCost);

    const { mutate: runUpgrade } = useMutation({
      mutationFn: () => postUpgrade(name),
      onSuccess: (res) => {
        CISoundMng?.soundsFx.upgradeSC.updateSound();
        const newLevel = (res.playerData as unknown as Record<string, number>)[
          `${name}Level`
        ];
        const newMoney = res.playerData.coins;
        const moneyLost = CIPlayer.money.val - newMoney;
        CIPlayer.updateMoney(-moneyLost);
        emitter.emit("menuMoney", newMoney);
        CIUpgradeMng.skillUpgrade(name, newLevel);
        setLevel(newLevel);
        setMoney(CIPlayer.money.val);
        createToastPopup(
          colorGreen,
          `${t(meta?.nameKey ?? displayName)} ${t("upgrades.reachedLevel")} ${newLevel}!`,
          moneyLost,
        );
      },
      onError: (err) => {
        if (import.meta.env.DEV) {
          console.warn("Upgrade error:", err);
        }
      },
    });

    const handleUpgrade = () => {
      if (atMax) {
        createToastPopup(colorRed, t("upgrades.maxLevelReached"));
        CISoundMng?.soundsFx.upgradeOFM.updateSound();
        return;
      }
      if (!canAfford) {
        createToastPopup(colorRed, t("upgrades.notEnoughCoins"));
        CISoundMng?.soundsFx.upgradeOFM.updateSound();
        return;
      }
      runUpgrade();
    };

    return (
      <Card
        className={cn(
          "relative flex flex-col gap-2 overflow-hidden border-2 p-3 transition-colors",
          "md:h-full md:min-h-0",
          atMax
            ? "border-primary shadow-[0_0_18px_-4px_rgba(14,198,48,0.55)]"
            : "border-transparent hover:border-border",
        )}
      >
        <div className="flex shrink-0 items-baseline justify-between gap-2">
          <div className="flex min-w-0 items-baseline gap-2">
            <p
              className={cn(
                "truncate text-base font-semibold",
                atMax ? "text-primary" : "text-foreground",
              )}
              title={t(meta?.descKey ?? displayName)}
            >
              {t(meta?.nameKey ?? displayName)}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {meta?.surname ?? name}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {t("upgrades.level", "Lvl")}{" "}
            <span className="text-primary tabular-nums">
              {level}/{MAX_LEVEL}
            </span>
          </span>
        </div>

        <div className="flex flex-col gap-3 md:min-h-0 md:flex-1 md:flex-row">
          <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-md bg-black/40 md:aspect-auto md:w-2/3 md:min-h-0 md:flex-1">
            <img
              src={meta?.image}
              alt={displayName}
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>

          <div className="flex min-w-0 shrink-0 flex-col gap-3 md:h-full md:min-h-0 md:flex-1">
            <ul className="grid min-h-0 flex-1 grid-cols-2 gap-3">
              <StatCell
                label={t("upgrades.current")}
                value={formatStatValue(statsListDescr[level - 1], name)}
              />
              <StatCell
                label={t("upgrades.next")}
                value={
                  atMax ? "—" : formatStatValue(statsListDescr[level], name)
                }
                valueClass={atMax ? "text-muted-foreground/60" : "text-primary"}
              />
            </ul>
            <Button
              variant="outline"
              onClick={handleUpgrade}
              disabled={!isConnected || atMax || !canAfford}
              className="w-full"
            >
              {atMax ? (
                t("common.max")
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <span>{t("upgrades.upgrade", "Upgrade")}</span>
                  <span className="opacity-50">·</span>
                  <span className="tabular-nums">{currentCost}</span>
                  <MetacubeCoinSvg wh="14" />
                </span>
              )}
            </Button>
          </div>
        </div>
      </Card>
    );
  },
);
UpgradeTile.displayName = "UpgradeTile";

function StatCell({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <li className="md:min-h-0">
      <Card
        size="nested"
        className="flex h-full flex-col items-center justify-center gap-0.5 p-3 text-center"
      >
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            valueClass ?? "text-foreground",
          )}
        >
          {value}
        </span>
      </Card>
    </li>
  );
}
