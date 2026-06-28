import * as React from "react";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { useTopMenuStore, type TopMenuName } from "./useTopMenuStore";

const SettingsPanel = React.lazy(() =>
  import("./SettingsPanel").then((m) => ({ default: m.SettingsPanel })),
);
const UpgradePanel = React.lazy(() =>
  import("./UpgradePanel").then((m) => ({ default: m.UpgradePanel })),
);
const AchievementMenu = React.lazy(() =>
  import("./Model/achievement/Achievements").then((m) => ({
    default: m.AchievementMenu,
  })),
);
const NFTGallery = React.lazy(() => import("./NFTSPanel"));
const StatsPanel = React.lazy(() =>
  import("./StatsPanel").then((m) => ({ default: m.StatsPanel })),
);
const CharacterPanel = React.lazy(() => import("./CharacterPanel"));

const MENU_TRANSLATION_KEY: Record<TopMenuName, string> = {
  Skins: "menu.skins",
  Upgrades: "menu.upgrades",
  Market: "menu.market",
  Achievements: "menu.achievements",
  Stats: "menu.stats",
  Settings: "menu.settings",
};

// TODO(metacoins-relocation): re-add `UpgradePanelValue` once new placement is decided.
export const TopMenuModal = React.memo(() => {
  const { t } = useTranslation();
  const open = useTopMenuStore((s) => s.open);
  const setOpen = useTopMenuStore((s) => s.setOpen);

  const isOpen = Boolean(open);
  const title = open ? t(MENU_TRANSLATION_KEY[open]) : "";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) setOpen(null);
      }}
    >
      <DialogContent className="flex h-[80vh] max-h-[720px] w-[95vw] max-w-4xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border p-3">
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            }
          >
            {open === "Skins" && <CharacterPanel />}
            {open === "Upgrades" && <UpgradePanel />}
            {open === "Market" && <NFTGallery />}
            {open === "Settings" && <SettingsPanel />}
            {open === "Achievements" && <AchievementMenu />}
            {open === "Stats" && <StatsPanel />}
          </Suspense>
        </div>
      </DialogContent>
    </Dialog>
  );
});
TopMenuModal.displayName = "TopMenuModal";
