import { useState, useCallback, useRef, useEffect } from 'react';
import { useGebiedStore } from '../store/gebiedStore';

/**
 * Hook voor per-Card jaar-switching met caching en trend-modus.
 *
 * Elke Card krijgt zijn eigen instance zodat je individueel kunt switchen.
 *
 * @param defaultYear - Het standaard jaar (uit globale selector of data)
 * @param fetcher - Functie die data ophaalt voor een specifiek jaar: (jaar) => Promise<T>
 * @param trendFetcher - Functie die trend data ophaalt (alle jaren): () => Promise<TrendPoint[]>
 * @param availableYears - Welke jaren in de dropdown verschijnen
 */

export interface TrendPoint {
  jaar: number;
  [key: string]: number | string | null;
}

interface UseCardYearResult<T> {
  /** Huidige modus: een jaar-nummer of 'trend' */
  activeMode: number | 'trend';
  /** Override data voor het gekozen jaar (null = gebruik parent data) */
  overrideData: T | null;
  /** Trend data (alle jaren) */
  trendData: TrendPoint[] | null;
  /** Is er data aan het laden? */
  isLoading: boolean;
  /** Beschikbare jaren */
  availableYears: number[];
  /** Jaren die daadwerkelijk data bevatten (uit trendFetcher) */
  yearsWithData: number[];
  /** Handler voor jaar-wijziging (geef door aan Card.onYearChange) */
  handleYearChange: (jaar: number | 'trend') => void;
}

const DEFAULT_YEARS = [2020, 2021, 2022, 2023, 2024, 2025];

export function useCardYear<T>(
  defaultYear: number,
  fetcher: (jaar: number) => Promise<T>,
  trendFetcher?: () => Promise<TrendPoint[]>,
  availableYears: number[] = DEFAULT_YEARS,
): UseCardYearResult<T> {
  const { selectedJaar, selectedGebied } = useGebiedStore();
  const [activeMode, setActiveMode] = useState<number | 'trend'>(defaultYear);
  const [overrideData, setOverrideData] = useState<T | null>(null);
  const [trendData, setTrendData] = useState<TrendPoint[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [yearsWithData, setYearsWithData] = useState<number[]>([]);

  // Cache per jaar
  const cacheRef = useRef<Map<number, T>>(new Map());
  const trendCacheRef = useRef<TrendPoint[] | null>(null);
  const requestIdRef = useRef(0);
  const prevGebiedRef = useRef(selectedGebied?.code);
  const prevJaarRef = useRef(selectedJaar);
  // Track of de gebruiker handmatig een ander jaar heeft gekozen
  const isManualOverrideRef = useRef(false);

  // Reset bij gebiedswitch
  useEffect(() => {
    if (prevGebiedRef.current !== selectedGebied?.code) {
      prevGebiedRef.current = selectedGebied?.code;
      setActiveMode(defaultYear);
      setOverrideData(null);
      setTrendData(null);
      setYearsWithData([]);
      cacheRef.current = new Map();
      trendCacheRef.current = null;
      requestIdRef.current++;
      isManualOverrideRef.current = false;
    }
  }, [selectedGebied?.code, defaultYear]);

  // Sync activeMode met globale jaar-selector (tenzij handmatig overridden)
  useEffect(() => {
    if (prevJaarRef.current !== selectedJaar) {
      prevJaarRef.current = selectedJaar;
      if (!isManualOverrideRef.current) {
        setActiveMode(selectedJaar);
        setOverrideData(null);
        setTrendData(null);
      }
    }
  }, [selectedJaar]);

  // Prefetch trend data om te weten welke jaren beschikbaar zijn
  useEffect(() => {
    if (!trendFetcher || !selectedGebied?.code) return;
    let cancelled = false;

    trendFetcher().then((data) => {
      if (cancelled) return;
      trendCacheRef.current = data;
      const jaren = data.map((d) => d.jaar as number).filter(Boolean);
      setYearsWithData(jaren);
    }).catch((err) => { console.warn('Trend data laden mislukt:', err); });

    return () => { cancelled = true; };
  }, [trendFetcher, selectedGebied?.code]);

  const handleYearChange = useCallback(async (jaar: number | 'trend') => {
    const requestId = ++requestIdRef.current;

    // Terug naar default (globale jaar)
    if (jaar !== 'trend' && jaar === selectedJaar) {
      isManualOverrideRef.current = false;
      setActiveMode(jaar);
      setOverrideData(null);
      setTrendData(null);
      return;
    }

    // Gebruiker kiest handmatig een ander jaar → niet meer meesyncen met globale selector
    isManualOverrideRef.current = true;
    setActiveMode(jaar);

    if (jaar === 'trend') {
      // Trend modus
      if (trendCacheRef.current) {
        setTrendData(trendCacheRef.current);
        return;
      }
      if (!trendFetcher) return;

      setIsLoading(true);
      try {
        const data = await trendFetcher();
        if (requestId === requestIdRef.current) {
          trendCacheRef.current = data;
          setTrendData(data);
          const jaren = data.map((d) => d.jaar as number).filter(Boolean);
          setYearsWithData(jaren);
        }
      } catch (err) {
        console.error('Fout bij laden trend data:', err);
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
      return;
    }

    // Specifiek jaar
    setTrendData(null);
    const cached = cacheRef.current.get(jaar);
    if (cached) {
      setOverrideData(cached);
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetcher(jaar);
      if (requestId === requestIdRef.current) {
        cacheRef.current.set(jaar, data);
        setOverrideData(data);
      }
    } catch (err) {
      console.error(`Fout bij laden data voor ${jaar}:`, err);
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [selectedJaar, fetcher, trendFetcher]);

  return {
    activeMode,
    overrideData,
    trendData,
    isLoading,
    availableYears,
    yearsWithData,
    handleYearChange,
  };
}
