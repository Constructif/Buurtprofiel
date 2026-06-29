import { create } from 'zustand';
import type { Gebied, GebiedData } from '../types/gebied';
import type { Voorziening } from '../services/overpass';
import type { Wijkronde } from '../types/wijkronde';
import type { Favoriet } from '../types/favorieten';
import { fetchVoorzieningen } from '../services/overpass';
import { logger } from '../utils/logger';
import { fetchGeometry } from '../services/pdok';
import { calculateBBox } from '../services/geo-utils';
import { fetchFavorieten, addFavoriet, removeFavoriet } from '../services/favorieten';
import { loadAllGebieden, loadGebiedData } from '../services/cbs';

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
  // Zoek volledig Gebied (incl. wijk-/gemeente-hiërarchie) op code.
  // Laadt allGebieden indien nog leeg (race bij favoriet-klik vóór search-load).
  resolveGebiedByCode: (code: string) => Promise<Gebied | null>;

  // Geselecteerd gebied
  selectedGebied: Gebied | null;
  setSelectedGebied: (gebied: Gebied | null) => void;
  clearSelectedGebied: () => void;
  // Selecteer een gebied én laad de data; past gebiedData/gemeenteData alleen toe
  // als het gebied nog steeds geselecteerd is (race-guard bij snel wisselen).
  selectAndLoadGebied: (gebied: Gebied) => Promise<void>;

  // Data van geselecteerd gebied
  gebiedData: GebiedData | null;
  setGebiedData: (data: GebiedData | null) => void;

  // Gemeente data (voor benchmark vergelijking)
  gemeenteData: GebiedData | null;
  setGemeenteData: (data: GebiedData | null) => void;

  // Jaar selectie
  selectedJaar: number;
  setSelectedJaar: (jaar: number) => void;

  // Data cache per jaar (key: `${code}_${jaar}`)
  dataCache: Map<string, GebiedData>;
  gemeenteDataCache: Map<string, GebiedData>;

  // Benchmark toggle
  benchmarkType: 'nederland' | 'gemeente';
  setBenchmarkType: (type: 'nederland' | 'gemeente') => void;

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

  // Gemeente filter voor zoeken (drill-down)
  selectedGemeenteFilter: Gebied | null;
  setSelectedGemeenteFilter: (gemeente: Gebied | null) => void;

  // Loading states
  isLoadingGebieden: boolean;
  setIsLoadingGebieden: (loading: boolean) => void;
  isLoadingData: boolean;
  setIsLoadingData: (loading: boolean) => void;

  // Active tabs
  mainTab: 'ruwe-data' | 'wijkronde' | 'nader-onderzoek' | 'presentatie';
  setMainTab: (tab: 'ruwe-data' | 'wijkronde' | 'nader-onderzoek' | 'presentatie') => void;
  subTab: string;
  setSubTab: (tab: string) => void;

  // Wijkronde
  actieveRonde: Wijkronde | null;
  setActieveRonde: (ronde: Wijkronde | null) => void;
  /** Toon de oranje buurtgrens op de wijkronde-kaart (bewaard per apparaat). */
  toonBuurtgrens: boolean;
  setToonBuurtgrens: (toon: boolean) => void;

  // Nader onderzoek
  actiefTopicId: string | null;
  setActiefTopicId: (id: string | null) => void;

  // Presentatie selecties (per gebiedCode → geordende array van sectionIds)
  presentatieSelecties: Map<string, string[]>;
  isSelectieModus: boolean;
  setSelectieModus: (active: boolean) => void;
  togglePresentatieSelectie: (gebiedCode: string, sectionId: string) => void;
  isPresentatieGeselecteerd: (gebiedCode: string, sectionId: string) => boolean;
  getPresentatieSelecties: (gebiedCode: string) => string[];
  clearPresentatieSelecties: (gebiedCode: string) => void;
  movePresentatieSelectie: (gebiedCode: string, sectionId: string, direction: 'up' | 'down') => void;

  // Profiel-weergave (los van de gebied-tabs)
  profielOpen: boolean;
  setProfielOpen: (open: boolean) => void;

  // Favorieten (per gebruiker, uit Supabase)
  favorieten: Favoriet[];
  setFavorieten: (f: Favoriet[]) => void;
  loadFavorieten: () => Promise<void>;
  toggleFavoriet: (gebied: Gebied) => Promise<void>;
  isFavoriet: (gebiedCode: string) => boolean;
}

// ── LocalStorage helpers ────────────────────────────────
function loadFromStorage<T>(key: string): T | null {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

function saveToStorage(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

function removeFromStorage(key: string) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

export const useGebiedStore = create<GebiedStore>((set, get) => ({
  allGebieden: [],
  setAllGebieden: (gebieden) => set({ allGebieden: gebieden }),

  resolveGebiedByCode: async (code) => {
    const direct = get().allGebieden.find((g) => g.code === code);
    if (direct) return direct;
    try {
      const gebieden = await loadAllGebieden(); // dedupt op key 'gebieden-all'
      if (get().allGebieden.length === 0) set({ allGebieden: gebieden });
      return gebieden.find((g) => g.code === code) ?? null;
    } catch (error) {
      logger.error('Kan gebied niet resolven op code:', error);
      return null;
    }
  },

  selectedGebied: loadFromStorage('bp_selectedGebied'),
  setSelectedGebied: (gebied) => {
    saveToStorage('bp_selectedGebied', gebied);
    set({ selectedGebied: gebied });
  },
  clearSelectedGebied: () => {
    removeFromStorage('bp_selectedGebied');
    set({
      selectedGebied: null,
      gebiedData: null,
      gemeenteData: null,
      dataCache: new Map(),
      gemeenteDataCache: new Map(),
    });
  },
  selectAndLoadGebied: async (gebied) => {
    // Selecteer direct zodat de UI meteen reageert.
    get().setSelectedGebied(gebied);
    set({ isLoadingData: true });
    try {
      const { gebiedData, gemeenteData } = await loadGebiedData(gebied, get().selectedJaar);
      // Race-guard: alleen toepassen als ditzelfde gebied nog geselecteerd is.
      // Bij snel wisselen keert een trage fetch van een vorig gebied later terug;
      // die mag de data van het huidige gebied niet overschrijven.
      if (get().selectedGebied?.code !== gebied.code) return;
      set({ gebiedData, gemeenteData });
      // Voorzieningen/geometrie vast prefetchen (fire-and-forget, cache op gebiedscode).
      get().prefetchVoorzieningen(gebied.code);
    } catch (error) {
      if (get().selectedGebied?.code === gebied.code) {
        logger.error('Fout bij laden gebied data:', error);
      }
    } finally {
      // Alleen de laadstatus resetten als we nog op dit gebied zitten,
      // anders zet een late fetch de spinner uit terwijl het nieuwe gebied nog laadt.
      if (get().selectedGebied?.code === gebied.code) {
        set({ isLoadingData: false });
      }
    }
  },

  gebiedData: null,
  setGebiedData: (data) => set({ gebiedData: data }),

  gemeenteData: null,
  setGemeenteData: (data) => set({ gemeenteData: data }),

  selectedJaar: 2025,
  setSelectedJaar: (jaar) => {
    const { selectedGebied, gebiedData, gemeenteData } = get();
    // Cache huidige data voordat we wisselen
    if (selectedGebied && gebiedData) {
      const cacheKey = `${selectedGebied.code}_${get().selectedJaar}`;
      const cache = new Map(get().dataCache);
      cache.set(cacheKey, gebiedData);
      const gmCache = new Map(get().gemeenteDataCache);
      if (gemeenteData) {
        gmCache.set(`${selectedGebied.code}_${get().selectedJaar}_gm`, gemeenteData);
      }
      set({ dataCache: cache, gemeenteDataCache: gmCache });
    }
    // Check of nieuwe jaar al gecached is
    if (selectedGebied) {
      const newKey = `${selectedGebied.code}_${jaar}`;
      const cached = get().dataCache.get(newKey);
      const cachedGm = get().gemeenteDataCache.get(`${newKey}_gm`);
      if (cached) {
        set({ selectedJaar: jaar, gebiedData: cached, gemeenteData: cachedGm ?? null });
        return;
      }
    }
    set({ selectedJaar: jaar });
  },

  dataCache: new Map(),
  gemeenteDataCache: new Map(),

  benchmarkType: 'nederland',
  setBenchmarkType: (type) => set({ benchmarkType: type }),

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
        logger.error(`Prefetch voorzieningen fout (poging ${retryCount + 1}/${MAX_RETRIES + 1}):`, error);

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

  selectedGemeenteFilter: null,
  setSelectedGemeenteFilter: (gemeente) => set({ selectedGemeenteFilter: gemeente }),

  isLoadingGebieden: false,
  setIsLoadingGebieden: (loading) => set({ isLoadingGebieden: loading }),
  isLoadingData: false,
  setIsLoadingData: (loading) => set({ isLoadingData: loading }),

  mainTab: (loadFromStorage<string>('bp_mainTab') as 'ruwe-data' | 'wijkronde' | 'nader-onderzoek' | 'presentatie') || 'ruwe-data',
  setMainTab: (tab) => {
    const defaultSubTabs: Record<string, string> = {
      'ruwe-data': 'overzicht',
      'wijkronde': 'observaties',
      'nader-onderzoek': '',
      'presentatie': '',
    };
    const newSubTab = defaultSubTabs[tab] || '';
    saveToStorage('bp_mainTab', tab);
    saveToStorage('bp_subTab', newSubTab);
    set({ mainTab: tab, subTab: newSubTab });
  },
  subTab: loadFromStorage<string>('bp_subTab') || 'overzicht',
  setSubTab: (tab) => {
    saveToStorage('bp_subTab', tab);
    set({ subTab: tab });
  },

  actieveRonde: null,
  setActieveRonde: (ronde) => set({ actieveRonde: ronde }),

  toonBuurtgrens: loadFromStorage<boolean>('bp_toonBuurtgrens') ?? true,
  setToonBuurtgrens: (toon) => {
    saveToStorage('bp_toonBuurtgrens', toon);
    set({ toonBuurtgrens: toon });
  },

  actiefTopicId: null,
  setActiefTopicId: (id) => set({ actiefTopicId: id }),

  presentatieSelecties: new Map(
    Object.entries(
      loadFromStorage<Record<string, string[]>>('bp_presentatie_all') ?? {}
    )
  ),
  isSelectieModus: false,
  setSelectieModus: (active) => set({ isSelectieModus: active }),
  togglePresentatieSelectie: (gebiedCode, sectionId) => {
    const current = new Map(get().presentatieSelecties);
    const sectiesVoorGebied = current.get(gebiedCode) ?? [];
    const idx = sectiesVoorGebied.indexOf(sectionId);
    const nieuw = idx === -1
      ? [...sectiesVoorGebied, sectionId]
      : sectiesVoorGebied.filter((id) => id !== sectionId);
    if (nieuw.length === 0) {
      current.delete(gebiedCode);
    } else {
      current.set(gebiedCode, nieuw);
    }
    saveToStorage('bp_presentatie_all', Object.fromEntries(current));
    set({ presentatieSelecties: current });
  },
  isPresentatieGeselecteerd: (gebiedCode, sectionId) =>
    (get().presentatieSelecties.get(gebiedCode) ?? []).includes(sectionId),
  getPresentatieSelecties: (gebiedCode) =>
    get().presentatieSelecties.get(gebiedCode) ?? [],
  clearPresentatieSelecties: (gebiedCode) => {
    const current = new Map(get().presentatieSelecties);
    current.delete(gebiedCode);
    saveToStorage('bp_presentatie_all', Object.fromEntries(current));
    set({ presentatieSelecties: current });
  },
  movePresentatieSelectie: (gebiedCode, sectionId, direction) => {
    const current = new Map(get().presentatieSelecties);
    const sectiesVoorGebied = [...(current.get(gebiedCode) ?? [])];
    const idx = sectiesVoorGebied.indexOf(sectionId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sectiesVoorGebied.length) return;
    [sectiesVoorGebied[idx], sectiesVoorGebied[newIdx]] = [sectiesVoorGebied[newIdx], sectiesVoorGebied[idx]];
    current.set(gebiedCode, sectiesVoorGebied);
    saveToStorage('bp_presentatie_all', Object.fromEntries(current));
    set({ presentatieSelecties: current });
  },

  profielOpen: false,
  setProfielOpen: (open) => set({ profielOpen: open }),

  favorieten: [],
  setFavorieten: (f) => set({ favorieten: f }),

  loadFavorieten: async () => {
    try {
      const favorieten = await fetchFavorieten();
      set({ favorieten });
    } catch (error) {
      logger.error('Fout bij laden favorieten:', error);
    }
  },

  isFavoriet: (gebiedCode) => get().favorieten.some((f) => f.gebied_code === gebiedCode),

  toggleFavoriet: async (gebied) => {
    const current = get().favorieten;
    const bestaat = current.some((f) => f.gebied_code === gebied.code);

    if (bestaat) {
      // Optimistic remove
      set({ favorieten: current.filter((f) => f.gebied_code !== gebied.code) });
      try {
        await removeFavoriet(gebied.code);
      } catch (error) {
        logger.error('Fout bij verwijderen favoriet:', error);
        set({ favorieten: current }); // rollback
      }
    } else {
      // Optimistic add met tijdelijke placeholder; vervang door server-rij
      try {
        const nieuw = await addFavoriet(gebied);
        set({ favorieten: [nieuw, ...get().favorieten] });
      } catch (error) {
        logger.error('Fout bij toevoegen favoriet:', error);
      }
    }
  },
}));
