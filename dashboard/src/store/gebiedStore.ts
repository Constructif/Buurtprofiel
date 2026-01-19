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

// Status voor prefetch tracking
type PrefetchStatus = 'idle' | 'loading' | 'success' | 'error';

interface PrefetchState {
  status: PrefetchStatus;
  promise: Promise<VoorzieningenCache | null> | null;
  error?: string;
  retryCount: number;
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

  // Verbeterde prefetch met status tracking
  prefetchState: Map<string, PrefetchState>;
  prefetchVoorzieningen: (gebiedCode: string) => Promise<VoorzieningenCache | null>;
  getPrefetchStatus: (gebiedCode: string) => PrefetchStatus;
  waitForVoorzieningen: (gebiedCode: string) => Promise<VoorzieningenCache | null>;

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
    cache.set(`${gebiedCode}_v2`, data);
    set({ voorzieningenCache: cache });
  },
  getVoorzieningenCache: (gebiedCode) => {
    const cached = get().voorzieningenCache.get(`${gebiedCode}_v2`);
    if (!cached) return null;

    // Cache voor 30 minuten
    const maxAge = 30 * 60 * 1000;
    if (Date.now() - cached.timestamp > maxAge) {
      return null;
    }

    return cached;
  },
  clearVoorzieningenCache: () => set({ voorzieningenCache: new Map(), prefetchState: new Map() }),

  // Prefetch state tracking
  prefetchState: new Map(),

  getPrefetchStatus: (gebiedCode: string) => {
    const state = get().prefetchState.get(gebiedCode);
    return state?.status ?? 'idle';
  },

  // Wacht op voorzieningen data (uit cache of lopende prefetch)
  waitForVoorzieningen: async (gebiedCode: string): Promise<VoorzieningenCache | null> => {
    // Check cache eerst
    const cached = get().getVoorzieningenCache(gebiedCode);
    if (cached) return cached;

    // Check of er al een prefetch bezig is
    const state = get().prefetchState.get(gebiedCode);
    if (state?.promise) {
      // Wacht op lopende prefetch
      return state.promise;
    }

    // Start nieuwe prefetch
    return get().prefetchVoorzieningen(gebiedCode);
  },

  prefetchVoorzieningen: async (gebiedCode: string): Promise<VoorzieningenCache | null> => {
    const MAX_RETRIES = 2;

    // Check cache eerst
    const cached = get().getVoorzieningenCache(gebiedCode);
    if (cached) {
      return cached;
    }

    // Check of er al een prefetch bezig is voor dit gebied
    const existingState = get().prefetchState.get(gebiedCode);
    if (existingState?.status === 'loading' && existingState.promise) {
      // Return de bestaande promise zodat we niet dubbel fetchen
      return existingState.promise;
    }

    // Maak de fetch functie met retry logica
    const doFetch = async (retryCount: number = 0): Promise<VoorzieningenCache | null> => {
      try {
        // Haal geometrie op
        const geo = await fetchGeometry(gebiedCode);
        if (!geo?.geometry) {
          throw new Error('Geen geometrie gevonden');
        }

        // Bereken bounding box en haal voorzieningen op
        const bbox = calculateBBox(geo);
        const voorzieningenData = await fetchVoorzieningen(bbox);

        // Maak cache entry
        const cacheEntry: VoorzieningenCache = {
          geometry: geo,
          voorzieningen: voorzieningenData,
          timestamp: Date.now(),
        };

        // Sla op in cache
        const cache = new Map(get().voorzieningenCache);
        cache.set(`${gebiedCode}_v2`, cacheEntry);

        // Update state naar success
        const prefetchStateMap = new Map(get().prefetchState);
        prefetchStateMap.set(gebiedCode, {
          status: 'success',
          promise: null,
          retryCount,
        });

        set({ voorzieningenCache: cache, prefetchState: prefetchStateMap });

        return cacheEntry;
      } catch (error) {
        console.error(`Prefetch voorzieningen fout (poging ${retryCount + 1}/${MAX_RETRIES + 1}):`, error);

        // Retry als we nog pogingen over hebben
        if (retryCount < MAX_RETRIES) {
          // Wacht even voor retry (exponential backoff: 1s, 2s)
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return doFetch(retryCount + 1);
        }

        // Alle retries gefaald
        const prefetchStateMap = new Map(get().prefetchState);
        prefetchStateMap.set(gebiedCode, {
          status: 'error',
          promise: null,
          error: error instanceof Error ? error.message : 'Onbekende fout',
          retryCount,
        });
        set({ prefetchState: prefetchStateMap });

        return null;
      }
    };

    // Start fetch en sla promise op
    const fetchPromise = doFetch(0);

    // Registreer loading state met promise
    const prefetchStateMap = new Map(get().prefetchState);
    prefetchStateMap.set(gebiedCode, {
      status: 'loading',
      promise: fetchPromise,
      retryCount: 0,
    });
    set({ prefetchState: prefetchStateMap });

    return fetchPromise;
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
