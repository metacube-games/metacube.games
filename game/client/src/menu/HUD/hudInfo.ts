import { CState } from "../../helpers/CState";
import type { T3DP } from "../../Types/T3DP";
import { CIUpgradeMng } from "../subMenus/NavigationBar/Model/CUpgradeManager";
import { selectedSkinStateGL } from "../subMenus/NavigationBar/CharacterPanel";
import { getNextRandom } from "../../helpers/computedRandom";

// Imperative DOM mutation (no React state) because the engine writes at game-loop rates.
class CHUDInfo {
  private HUDBlood: HTMLElement | null = null;
  fps: CState<number>;
  coordinates: CState<T3DP>;
  eInfo: { name: string; hp: number; maxHp: number; opacity: string };
  private anchor: HTMLElement | null = null;
  bloodDamageTimeout: NodeJS.Timeout | null;
  spanPool: HTMLSpanElement[];
  activeSpans: Set<HTMLSpanElement>;

  constructor() {
    this.fps = new CState<number>("FPS", 0);
    this.coordinates = new CState<T3DP>("coordinates", [0, 0, 0]);
    this.eInfo = { name: "", hp: 0, maxHp: 0, opacity: "0" };
    this.bloodDamageTimeout = null;
    this.spanPool = [];
    this.activeSpans = new Set();
  }

  getSpan() {
    let spanEl = this.spanPool.find((span) => !this.activeSpans.has(span));
    if (!spanEl) {
      spanEl = document.createElement("span");
      spanEl.classList.add("damagerMarker");
      spanEl.setAttribute("tabindex", "-1");
      spanEl.setAttribute("aria-hidden", "true");
      spanEl.style.pointerEvents = "none";
      spanEl.style.touchAction = "none";
      const leftPosition = 50 + Math.floor((getNextRandom() - 0.5) * 10);
      const topPosition = 47 + Math.floor(getNextRandom() * 10);
      spanEl.style.left = `${leftPosition}%`;
      spanEl.style.top = `${topPosition}%`;
      this.spanPool.push(spanEl);
      this.anchor?.appendChild(spanEl);
    }
    this.activeSpans.add(spanEl);
    return spanEl;
  }

  releaseSpan(spanEl: HTMLSpanElement, isCritical: boolean) {
    this.activeSpans.delete(spanEl);
    spanEl.classList.remove(isCritical ? "damageCritical" : "damageNormal");
    spanEl.style.visibility = "hidden";
  }

  damageMarkerTempDiv(critical = 0) {
    if (!this.anchor) {
      this.anchor = document.getElementById("damageMarkerParent");
    }
    const playerAttack =
      CIUpgradeMng.upgrades.damage.currStat + selectedSkinStateGL.attack;
    const nbDamage = critical ? playerAttack * 10 : playerAttack;
    const spanEl = this.getSpan();
    const isCritical = critical === 1;
    const displayText = isCritical
      ? `CRITICAL!\n${nbDamage}`
      : nbDamage.toString();

    requestAnimationFrame(() => {
      spanEl.style.visibility = "visible";
      spanEl.classList.add(isCritical ? "damageCritical" : "damageNormal");
      spanEl.textContent = displayText;
    });

    setTimeout(() => {
      this.releaseSpan(spanEl, isCritical);
    }, 2000);
  }

  bloodDamageDiv() {
    if (!this.HUDBlood) {
      this.HUDBlood = document.getElementById("gameHUD");
    }
    if (!this.HUDBlood) return;

    if (this.HUDBlood.classList.contains("damageBlood")) {
      if (this.bloodDamageTimeout) clearTimeout(this.bloodDamageTimeout);
      this.HUDBlood.classList.remove("damageBlood");
    }

    setTimeout(() => {
      this.HUDBlood!.classList.add("damageBlood");
    }, 1);

    this.bloodDamageTimeout = setTimeout(() => {
      this.HUDBlood!.classList.remove("damageBlood");
      this.bloodDamageTimeout = null;
    }, 1500);
  }
}

export const CIHUD = new CHUDInfo();
