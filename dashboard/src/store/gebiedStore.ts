import { create } from 'zustand';
import type { Gebied, GebiedData } from '../types/gebied';

interface GebiedStore {
  // Alle gebieden (voor zoeken)
  allGebieden: Gebied[];
  setAllGebieden: (gebieden: Gebied[]) => void;

  // Geselecteerd gebied
  selectedGebied: Gebied | null;
  setSelectedGebied: (gebied: Gebied | null) => void;
  clearSelectedGebied: () => void;

  // Data van geselecteerd gebied
  gebiedData: GebiedData | null;
  setGebiedData: (data: GebiedData | null) => void;

  // Loading states
  isLoadingGebieden: boolean;
  setIsLoadingGebieden: (loading: boolean) => void;
  isLoadingData: boolean;
  setIsLoadingData: (loading: boolean) => void;

  // Active tabs
  mainTab: 'ruwe-data' | 'eigen-onderzoek';
  setMainTab: (tab: 'ruwe-data' | 'eigen-onderzoek') => void;
  subTab: string;
  setSubTab: (tab: string) => void;
}

export const useGebiedStore = create<GebiedStore>((set) => ({
  allGebieden: [],
  setAllGebieden: (gebieden) => set({ allGebieden: gebieden }),

  selectedGebied: null,
  setSelectedGebied: (gebied) => set({ selectedGebied: gebied }),
  clearSelectedGebied: () => set({ selectedGebied: null, gebiedData: null }),

  gebiedData: null,
  setGebiedData: (data) => set({ gebiedData: data }),

  isLoadingGebieden: false,
  setIsLoadingGebieden: (loading) => set({ isLoadingGebieden: loading }),
  isLoadingData: false,
  setIsLoadingData: (loading) => set({ isLoadingData: loading }),

  mainTab: 'ruwe-data',
  setMainTab: (tab) => set({ mainTab: tab }),
  subTab: 'overzicht',
  setSubTab: (tab) => set({ subTab: tab }),
}));
