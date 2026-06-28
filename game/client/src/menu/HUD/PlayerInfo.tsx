import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Wallet } from "lucide-react";

import { CIPlayer, type THealth } from "../../players/model/playerPhysic";
import { CIUpgradeMng } from "../subMenus/NavigationBar/Model/CUpgradeManager";
import { selectedSkinStateGL } from "../subMenus/NavigationBar/CharacterPanel";
import { colorRed, colorRedDark } from "../styles/colors";
import upgradesData from "../../envData/upgrades.json";
import { setDeep } from "../subMenus/NavigationBar/Model/notifTips/store";

import { MetacubeCoinSvg } from "./CoinSvg";
import { STYLES } from "./styles";

export const MoneyDisplay = React.memo(function MoneyDisplay() {
  const cumulSuspendRef = useRef<number>(0);
  const totalMoneyref = useRef<number>(0);
  const suspendMoneyRef = useRef<HTMLDivElement>(null!);
  const moneyJaugeRef = useRef<HTMLDivElement>(null!);
  const hasSentUpgradNotif = useRef(false);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    moneyJaugeRef.current.textContent = `${CIPlayer.money.val}`;
    totalMoneyref.current = CIPlayer.money.val;

    const onListen = (moneyChange: number) => {
      suspendMoneyRef.current.style.opacity = "1";
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);

      cumulSuspendRef.current += moneyChange;
      const positive = cumulSuspendRef.current > 0;
      suspendMoneyRef.current.textContent = positive
        ? `+${cumulSuspendRef.current}`
        : `${cumulSuspendRef.current}`;
      suspendMoneyRef.current.style.color = positive
        ? "hsl(var(--foreground))"
        : colorRed;

      settleTimeoutRef.current = setTimeout(() => {
        if (!suspendMoneyRef.current) return;
        cumulSuspendRef.current -= moneyChange;
        const stillPositive = cumulSuspendRef.current > 0;
        suspendMoneyRef.current.style.color = stillPositive
          ? "hsl(var(--foreground))"
          : colorRed;
        suspendMoneyRef.current.textContent = stillPositive
          ? `+${cumulSuspendRef.current}`
          : `${cumulSuspendRef.current}`;
        totalMoneyref.current = Math.max(
          0,
          totalMoneyref.current + moneyChange,
        );
        if (
          totalMoneyref.current > upgradesData.attackRange.levels[1].cost &&
          !hasSentUpgradNotif.current
        ) {
          setDeep("currentNotification", "upgrade");
          hasSentUpgradNotif.current = true;
        }
        moneyJaugeRef.current.textContent = `${totalMoneyref.current}`;
      }, 1000);

      fadeTimeoutRef.current = setTimeout(() => {
        if (!suspendMoneyRef.current) return;
        suspendMoneyRef.current.style.opacity = "0";
        cumulSuspendRef.current = 0;
        fadeTimeoutRef.current = null;
      }, 1250);
    };

    const listener = CIPlayer.money.addListener(onListen);
    return () => {
      listener.remove();
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
      if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
    };
  }, []);

  return (
    <>
      <div style={STYLES.MONEY_DISPLAY_CONTAINER}>
        <div
          ref={moneyJaugeRef}
          className="moneyCounter"
          tabIndex={-1}
          aria-hidden="true"
        />
        <MetacubeCoinSvg wh={"25"} />
      </div>
      <span
        ref={suspendMoneyRef}
        className="moneyCounterText"
        tabIndex={-1}
        aria-hidden="true"
        style={STYLES.POINTER_EVENTS_NONE}
      />
    </>
  );
});

interface PlayerHPsFlyProps {
  flyJaugeRef: React.RefObject<HTMLDivElement>;
}

const ENDURANCE_SEGMENT_SIZE = 24;

export const PlayerHPsFly = React.memo(function PlayerHPsFly({
  flyJaugeRef,
}: PlayerHPsFlyProps) {
  const [hpBarState, setHpBarState] = useState<number>(
    CIPlayer.health.val.curr,
  );
  const [enduranceSlvl, setEnduranceSlvl] = useState(4);
  const [maxHealth, setMaxHealth] = useState<number>(
    CIUpgradeMng.upgrades.health.currStat,
  );
  const flyContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const listener = CIPlayer.health.addListener((hp: THealth) => {
      setHpBarState(hp.curr);
    });
    return () => listener.remove();
  }, []);

  useEffect(() => {
    const listener = CIUpgradeMng.upgrades.fly.addListener(() => {
      setEnduranceSlvl(
        CIUpgradeMng.upgrades.fly.currLvl + 4 + selectedSkinStateGL.endurance,
      );
    });
    return () => listener.remove();
  }, []);

  useEffect(() => {
    setEnduranceSlvl(
      CIUpgradeMng.upgrades.fly.currLvl + 4 + selectedSkinStateGL.endurance,
    );

    const container = flyContainerRef.current;
    if (!container) return;

    container.style.width = `${enduranceSlvl * ENDURANCE_SEGMENT_SIZE}px`;
    container.querySelectorAll(".vertical-line").forEach((el) => el.remove());
    for (let i = 1; i < enduranceSlvl; i++) {
      const line = document.createElement("div");
      line.classList.add("vertical-line");
      line.style.left = `${i * ENDURANCE_SEGMENT_SIZE - 1}px`;
      container.appendChild(line);
    }
  }, [enduranceSlvl]);

  useEffect(() => {
    const listener = CIUpgradeMng.upgrades.health.addListener(
      (next: number) => {
        setMaxHealth(next);
        setHpBarState(next);
      },
    );
    return () => listener.remove();
  }, []);

  return (
    <div className="HPMPMenu">
      <div style={STYLES.HP_MENU_WRAPPER}>
        <div className="flex flex-col items-center gap-3 px-3 pt-3">
          <HPRow value={hpBarState} max={maxHealth} />
          <div style={STYLES.FLY_BOMB_CONTAINER}>
            <div ref={flyContainerRef} className="containerFly">
              <span ref={flyJaugeRef} className="fillingFly" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

function HPRow({ value, max }: { value: number; max: number }) {
  const icons: React.ReactNode[] = [];
  for (let i = 0; i < max; i++) {
    const fillState = Math.max(0, Math.min(1, value - i));
    const half = fillState >= 0.25 && fillState < 0.75;
    const full = fillState >= 0.75;
    icons.push(
      <span
        key={`hp-slot-${i}`}
        className="relative inline-block size-[22px] [filter:drop-shadow(0_0_1px_rgba(0,0,0,0.8))]"
      >
        <Wallet
          className="absolute inset-0 size-full"
          color={colorRedDark}
          strokeWidth={2}
        />
        {(half || full) && (
          <Wallet
            className="absolute inset-0 size-full"
            color={colorRed}
            strokeWidth={2.25}
            style={half ? { clipPath: "inset(0 50% 0 0)" } : undefined}
          />
        )}
      </span>,
    );
  }
  return <div className="flex h-full items-center gap-1">{icons}</div>;
}

interface CubeHPDisplayProps {
  generalHPRef: React.Ref<HTMLDivElement>;
  hpBarRef: React.Ref<HTMLDivElement>;
  enemyHpRef: React.Ref<HTMLDivElement>;
  enemyNameRef: React.Ref<HTMLDivElement>;
  hpContRef: React.Ref<HTMLDivElement>;
}

export const CubeHPDisplay = React.memo(function CubeHPDisplay({
  generalHPRef,
  hpBarRef,
  enemyHpRef,
  enemyNameRef,
  hpContRef,
}: CubeHPDisplayProps) {
  return (
    <div ref={generalHPRef} className="ELayout">
      <div ref={enemyNameRef} className="ENameLayout" />
      <div ref={hpContRef} className="EHPLayout">
        <span ref={hpBarRef} id="EnemyHp" className="EHPLayoutFill" />
        <span ref={enemyHpRef} className="EHPWRITING" />
      </div>
    </div>
  );
});
