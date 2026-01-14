import { create } from 'zustand';
import type { Gebied, GebiedData } from '../types/gebied';
import type { Voorziening } from '../services/overpass';
import { fetchVoorzieningen } from '../services/overpass';
import { fetchGeometry } from '../services/pdok';
import { calculateBBox } from '../services/geo-utils';

interface VoorzieningenCache {
  geometry: GeoJSON.Feature | null;
  voorzieningen: Voorziening[];
  timestamp: number;
}

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

  // Voorzieningen cache per gebied
  voorzieningenCache: Map<string, VoorzieningenCache>;
  setVoorzieningenCache: (gebiedCode: string, data: VoorzieningenCache) => void;
  getVoorzieningenCache: (gebiedCode: string) => VoorzieningenCache | null;
  clearVoorzieningenCache: () => void;
  prefetchVoorzieningen: (gebiedCode: string) => Promise<void>;

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

export const useGebiedStore = create<GebiedStore>((set, get) => ({
  allGebieden: [],
  setAllGebieden: (gebieden) => set({ allGebieden: gebieden }),

  selectedGebied: null,
  setSelectedGebied: (gebied) => set({ selectedGebied: gebied }),
  clearSelectedGebied: () => set({ selectedGebied: null, gebiedData: null }),

  gebiedData: null,
  setGebiedData: (data) => set({ gebiedData: data }),

  voorzieningenCache: new Map(),
  setVoorzieningenCache: (gebiedCode, data) => {
    const cache = new Map(get().voorzieningenCache);
    // Voeg versie toe aan cache key voor buffer update
    cache.set(`${gebiedCode}_v2`, data);
    set({ voorzieningenCache: cache });
  },
  getVoorzieningenCache: (gebiedCode) => {
    // Check nieuwe versie met buffer
    const cached = get().voorzieningenCache.get(`${gebiedCode}_v2`);
    if (!cached) return null;

    // Cache voor 30 minuten
    const maxAge = 30 * 60 * 1000;
    if (Date.now() - cached.timestamp > maxAge) {
      return null;
    }

    return cached;
  },
  clearVoorzieningenCache: () => set({ voorzieningenCache: new Map() }),

  prefetchVoorzieningen: async (gebiedCode: string) => {
    // Skip als al in cache
    const cached = get().voorzieningenCache.get(`${gebiedCode}_v2`);
    if (cached) {
      const maxAge = 30 * 60 * 1000;
      if (Date.now() - cached.timestamp <= maxAge) {
        return; // Geldige cache aanwezig, skip prefetch
      }
    }

    try {
      // Haal geometrie op
      const geo = await fetchGeometry(gebiedCode);
      if (!geo?.geometry) return;

      // Bereken bounding box en haal voorzieningen op
      const bbox = calculateBBox(geo);
      const voorzieningenData = await fetchVoorzieningen(bbox);

      // Sla op in cache
      const cache = new Map(get().voorzieningenCache);
      cache.set(`${gebiedCode}_v2`, {
        geometry: geo,
        voorzieningen: voorzieningenData,
        timestamp: Date.now(),
      });
      set({ voorzieningenCache: cache });
    } catch (error) {
      console.error('Prefetch voorzieningen fout:', error);
    }
  },

  isLoadingGebieden: false,
  setIsLoadingGebieden: (loading) => set({ isLoadingGebieden: loading }),
  isLoadingData: false,
  setIsLoadingData: (loading) => set({ isLoadingData: loading }),

  mainTab: 'ruwe-data',
  setMainTab: (tab) => set({ mainTab: tab }),
  subTab: 'overzicht',
  setSubTab: (tab) => set({ subTab: tab }),
}));
