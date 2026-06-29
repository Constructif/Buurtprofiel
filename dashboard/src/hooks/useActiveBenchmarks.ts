import { useGebiedStore } from '../store/gebiedStore';
import { NL_BENCHMARKS, getGemeenteBenchmarks } from '../utils/benchmarks';
import type { BenchmarkSet } from '../types/scoring';
import type { ZorgWelzijnData } from '../types/zorgWelzijn';
import type { LeefomgevingData } from '../types/leefomgeving';

// Keys van BenchmarkSet die een MetriekBenchmark ({gemiddelde, stdDev, isFallback}) zijn.
export type MetriekKey = {
  [K in keyof BenchmarkSet]: BenchmarkSet[K] extends { gemiddelde: number } ? K : never;
}[keyof BenchmarkSet];

export interface ActiveBenchmarks {
  /** De actieve benchmark-set: gemeente-cijfers (met NL-fallback per metric) of volledig NL. */
  set: BenchmarkSet;
  /** Vergelijken we werkelijk met de gemeente? false zodra het gebied zelf een gemeente is of bij Nederland-modus. */
  isGemeenteVergelijking: boolean;
  /** "Nederland" of de gemeentenaam. */
  benchmarkNaam: string;
  /** Label voor referentievergelijkingen, bv. "t.o.v. Nederland". */
  refLabel: string;
  /** Referentiewaarde (gemiddelde) voor een metric. */
  ref: (key: MetriekKey) => number;
  /**
   * Of deze metric op de NL-waarde terugviel (geen gemeentecijfer beschikbaar).
   * In Nederland-modus altijd false. In gemeente-modus true voor metrics zonder gemeentebron.
   */
  isFallback: (key: MetriekKey) => boolean;
  /** Het label dat per metric bij de referentiewaarde hoort: "Nederland" bij fallback, anders de gemeentenaam. */
  refNaamVoor: (key: MetriekKey) => string;
}

/**
 * Centrale bron voor de actieve vergelijkings-benchmarks die meeschakelt met de
 * Nederland/gemeente-toggle (benchmarkType in de store).
 *
 * Vervangt de lokale hardcoded NL_REFERENTIES die per tab gedefinieerd stonden en
 * de toggle negeerden. Geef zorgData/leefomgevingData mee als die tab ze beschikbaar
 * heeft, zodat getGemeenteBenchmarks de juiste gemeente-cijfers kan opbouwen.
 */
export function useActiveBenchmarks(
  zorgData: ZorgWelzijnData | null = null,
  leefomgevingData: LeefomgevingData | null = null,
): ActiveBenchmarks {
  const { benchmarkType, selectedGebied, gebiedData, gemeenteData } = useGebiedStore();

  // Een gemeente kan niet met zichzelf vergeleken worden -> forceer Nederland.
  const isGemeenteVergelijking =
    benchmarkType === 'gemeente' &&
    selectedGebied?.type !== 'gemeente' &&
    gebiedData !== null;

  const set: BenchmarkSet =
    isGemeenteVergelijking && gebiedData
      ? getGemeenteBenchmarks(gebiedData, gemeenteData, zorgData, leefomgevingData)
      : NL_BENCHMARKS;

  const benchmarkNaam = set.naam;
  const refLabel = `t.o.v. ${benchmarkNaam}`;

  const ref = (key: MetriekKey): number => set[key]?.gemiddelde ?? 0;
  const isFallback = (key: MetriekKey): boolean => set[key]?.isFallback === true;
  const refNaamVoor = (key: MetriekKey): string =>
    set[key]?.isFallback === true ? 'Nederland' : benchmarkNaam;

  return { set, isGemeenteVergelijking, benchmarkNaam, refLabel, ref, isFallback, refNaamVoor };
}
