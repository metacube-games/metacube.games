import { create } from "zustand";

export type TopMenuName =
  | "Skins"
  | "Upgrades"
  | "Market"
  | "Achievements"
  | "Stats"
  | "Settings";

interface TopMenuState {
  open: TopMenuName | null;
  setOpen: (name: TopMenuName | null) => void;
}

export const useTopMenuStore = create<TopMenuState>((set) => ({
  open: null,
  setOpen: (name) => set({ open: name }),
}));
