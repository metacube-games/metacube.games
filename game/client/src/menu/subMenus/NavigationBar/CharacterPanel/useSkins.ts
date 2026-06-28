import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSkins, postSkin } from "../../../../API/backendAPI";
import { useTranslation } from "react-i18next";
import { CISocketMng } from "../../../../API/socketMessagesManager";
import { skinsUrls } from "../../../../GLBImports/skinImports";
import { SGG, useGSelectors } from "../../../useGeneralStore";
import { CIUpgradeMng } from "../Model/CUpgradeManager";

const SKINS_QUERY_KEY = ["skins-selector"] as const;
export const TRANSITION_DURATION = 1000;

export interface SkinStats {
  attack: number;
  attackRange: number;
  health: number;
  critical: number;
  staking: number;
  endurance: number;
}

export interface Skin {
  id: number;
  name: string;
  /** Short tagline shown next to the name on the card. */
  surname: string;
  path: string;
  isLocked?: boolean;
  stats: SkinStats;
}

interface SkinData {
  selected: number;
  skins: number[];
}

/**
 * Static skin config. Display strings are stored as i18n keys and resolved
 * lazily at render time (see `skins` in `useSkins`) so that `t()` is never
 * called during module-load initialization, when i18n may be uninitialized.
 */
type SkinConfig = Omit<Skin, "name" | "surname" | "isLocked"> & {
  nameKey: string;
  surnameKey: string;
};

const BASE_SKINS: SkinConfig[] = [
  {
    id: 0,
    nameKey: "skins.stove.name",
    surnameKey: "skins.stove.surname",
    path: skinsUrls.stoveUrl,
    stats: {
      attack: 0,
      attackRange: 0,
      health: 0,
      critical: 0,
      staking: 0,
      endurance: 0,
    },
  },
  {
    id: 1,
    nameKey: "skins.zombie.name",
    surnameKey: "skins.zombie.surname",
    path: skinsUrls.zombieUrl,
    stats: {
      attack: 0,
      attackRange: 1,
      health: 0,
      critical: 0,
      staking: 0,
      endurance: 1,
    },
  },
  {
    id: 2,
    nameKey: "skins.ogStove.name",
    surnameKey: "skins.ogStove.surname",
    path: skinsUrls.ogStoveUrl,
    stats: {
      attack: 0,
      attackRange: 1,
      health: 0,
      critical: 1,
      staking: 1,
      endurance: 0,
    },
  },
  {
    id: 3,
    nameKey: "skins.brother.name",
    surnameKey: "skins.brother.surname",
    path: skinsUrls.brother,
    stats: {
      attack: 0,
      attackRange: 0,
      health: 0,
      critical: 1,
      staking: 0,
      endurance: 1,
    },
  },
];

/** Game-wide read-only of the selected skin's stat bonuses. */
export let selectedSkinStateGL: SkinStats = BASE_SKINS[0].stats;
export const setSelectedSkinStateGL = (skinId: number) => {
  const stats = BASE_SKINS[skinId]?.stats;
  if (stats) selectedSkinStateGL = stats;
};

export function useSkins() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { isConnected } = useGSelectors("isConnected");
  const [previousSkinId, setPreviousSkinId] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const { data, isLoading, isSuccess } = useQuery<SkinData>({
    queryKey: SKINS_QUERY_KEY,
    queryFn: getSkins,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 2,
  });

  const selectedSkinId = data?.selected ?? 0;
  const unlockedSkinIds = useMemo(
    () => new Set(data?.skins ?? []),
    [data?.skins],
  );

  const skins = useMemo<Skin[]>(
    () =>
      BASE_SKINS.map(({ nameKey, surnameKey, ...skin }) => ({
        ...skin,
        name: t(nameKey),
        surname: t(surnameKey),
        isLocked: !isConnected || !unlockedSkinIds.has(skin.id),
      })),
    [isConnected, unlockedSkinIds, t],
  );

  useEffect(() => {
    const stats = BASE_SKINS[selectedSkinId]?.stats;
    if (stats) selectedSkinStateGL = stats;
    CIUpgradeMng.setAllUpgradeOnSkinChange();
  }, [selectedSkinId]);

  useEffect(() => {
    if (isSuccess && isInitialLoad) {
      setPreviousSkinId(selectedSkinId);
      setIsInitialLoad(false);
    }
  }, [isSuccess, selectedSkinId, isInitialLoad]);

  useEffect(() => {
    if (
      isInitialLoad ||
      previousSkinId === null ||
      previousSkinId === selectedSkinId
    ) {
      return;
    }
    setIsTransitioning(true);
    const timer = setTimeout(
      () => setIsTransitioning(false),
      TRANSITION_DURATION,
    );
    return () => clearTimeout(timer);
  }, [selectedSkinId, previousSkinId, isInitialLoad]);

  const mutation = useMutation({
    mutationFn: postSkin,
    onMutate: async (newSkinId: number) => {
      if (!isInitialLoad) {
        setPreviousSkinId(selectedSkinId);
        setIsTransitioning(true);
      }
      await queryClient.cancelQueries({ queryKey: SKINS_QUERY_KEY });
      const previousData = queryClient.getQueryData<SkinData>(SKINS_QUERY_KEY);
      queryClient.setQueryData<SkinData>(
        SKINS_QUERY_KEY,
        (old = { selected: 0, skins: [] }) => ({ ...old, selected: newSkinId }),
      );
      return { previousData };
    },
    onError: (error, _vars, context) => {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to select skin:", error);
      }
      if (context?.previousData) {
        queryClient.setQueryData(SKINS_QUERY_KEY, context.previousData);
      }
      setIsTransitioning(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SKINS_QUERY_KEY });
      if (SGG.getIsInGame()) CISocketMng.sendSocketUpgrade();
      if (!isInitialLoad) {
        setTimeout(() => setIsTransitioning(false), TRANSITION_DURATION);
      }
    },
  });

  return {
    skins,
    selectedSkinId,
    isTransitioning,
    isLoading,
    isConnected,
    selectSkin: (skinId: number) => mutation.mutate(skinId),
  };
}
