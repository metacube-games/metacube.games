import { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";

import { CISoundMng } from "../../../../sound/soundFX";

import { LoginOverlay } from "../LoginOverlay";
import { SkinCard } from "./SkinCard";
import { useSkins } from "./useSkins";

export {
  selectedSkinStateGL,
  setSelectedSkinStateGL,
  type Skin,
  type SkinStats,
} from "./useSkins";

const CharacterPanel = () => {
  const { t } = useTranslation();
  const {
    skins,
    selectedSkinId,
    isTransitioning,
    isLoading,
    isConnected,
    selectSkin,
  } = useSkins();

  const handleSelect = useCallback(
    (skinId: number) => {
      if (skinId === selectedSkinId || isTransitioning) return;
      const target = skins.find((s) => s.id === skinId);
      if (!target || target.isLocked) return;
      CISoundMng?.soundsFx.electricSound.updateSound();
      selectSkin(skinId);
    },
    [selectedSkinId, isTransitioning, skins, selectSkin],
  );

  return (
    <div className="relative flex flex-col md:h-full md:min-h-0">
      {!isConnected && <LoginOverlay text={t("overlays.loginToViewSkins")} />}

      <div className="grid w-full grid-cols-1 gap-3 md:min-h-0 md:flex-1 md:auto-rows-fr md:grid-cols-2">
        {skins.map((skin) => (
          <SkinCard
            key={skin.id}
            skin={skin}
            isSelected={selectedSkinId === skin.id}
            isLoading={!isConnected || isLoading}
            isTransitioning={isTransitioning}
            onSelect={() => handleSelect(skin.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default memo(CharacterPanel);
