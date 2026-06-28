import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";

import { Card, cardVariants } from "../../../../components/ui/card";
import { cn } from "../../../../lib/utils";
import { METACUBE_MARKET_URL } from "../../../../constants";

import { SkinModel } from "../SkinRotatedPreview";
import { LoadingCanvas, SkinCanvas } from "./Canvas";
import { ElectricityStrikes } from "./ElectricityStrikes";
import { TRANSITION_DURATION, type Skin, type SkinStats } from "./useSkins";

const STAT_ROWS: ReadonlyArray<{ label: string; key: keyof SkinStats }> = [
  { label: "character.attack", key: "attack" },
  { label: "character.health", key: "health" },
  { label: "character.stamina", key: "endurance" },
  { label: "character.range", key: "attackRange" },
  { label: "character.critical", key: "critical" },
  { label: "character.staking", key: "staking" },
];

interface SkinCardProps {
  skin: Skin;
  isSelected: boolean;
  isLoading: boolean;
  isTransitioning: boolean;
  onSelect: () => void;
}

export const SkinCard = memo(
  ({
    skin,
    isSelected,
    isLoading,
    isTransitioning,
    onSelect,
  }: SkinCardProps) => {
    const { t } = useTranslation();
    const isLocked = !!skin.isLocked;
    const showStrikes = isSelected && isTransitioning;

    const activate = () => {
      if (isLocked) {
        window.open(METACUBE_MARKET_URL, "_blank", "noopener");
        return;
      }
      if (isSelected) return;
      onSelect();
    };

    return (
      <button
        type="button"
        aria-label={skin.name}
        aria-pressed={isSelected}
        onClick={activate}
        style={{ appearance: "none", font: "inherit", margin: 0 }}
        className={cn(
          cardVariants(),
          "w-full text-left",
          "relative flex cursor-pointer flex-col gap-2 overflow-hidden border-2 p-3 transition-colors",
          "md:h-full md:min-h-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isSelected
            ? "border-primary shadow-[0_0_18px_-4px_rgba(14,198,48,0.55)]"
            : "border-transparent hover:border-border",
        )}
      >
        <div className="flex shrink-0 items-baseline gap-2 truncate">
          <p
            className={cn(
              "truncate text-base font-semibold",
              isSelected ? "text-primary" : "text-foreground",
            )}
          >
            {skin.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {skin.surname}
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-3 md:min-h-0 md:flex-1 md:flex-row">
          <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-md bg-black/40 md:aspect-auto md:w-2/3 md:min-h-0 md:flex-1">
            <SkinCanvas>
              {isLoading ? (
                <LoadingCanvas />
              ) : (
                <>
                  <SkinModel path={skin.path} />
                  {showStrikes && (
                    <ElectricityStrikes
                      count={15}
                      duration={TRANSITION_DURATION / 1100}
                    />
                  )}
                </>
              )}
            </SkinCanvas>
            {isLocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/65 backdrop-blur-[1px]">
                <Lock className="size-7 text-white/90 drop-shadow" />
              </div>
            )}
          </div>

          <ul className="grid min-w-0 shrink-0 grid-cols-2 gap-3 md:h-full md:min-h-0 md:flex-1 md:auto-rows-fr">
            {STAT_ROWS.map(({ label, key }) => {
              const value = skin.stats[key] || 0;
              return (
                <li key={key} className="md:min-h-0">
                  <Card
                    size="nested"
                    className="flex h-full flex-col items-center justify-center gap-0.5 px-1 py-1 text-center"
                  >
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {t(label)}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        value > 0 ? "text-primary" : "text-muted-foreground/60",
                      )}
                    >
                      +{value}
                    </span>
                  </Card>
                </li>
              );
            })}
          </ul>
        </div>
      </button>
    );
  },
);
SkinCard.displayName = "SkinCard";
