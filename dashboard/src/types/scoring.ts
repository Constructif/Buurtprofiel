// Scoring systeem types voor Buurtprofiel cijfer

export type BenchmarkType = 'nederland' | 'gemeente';

export type Classificatie =
  | 'UITSTEKEND'
  | 'ZEER GOED'
  | 'GOED'
  | 'RUIM VOLDOENDE'
  | 'VOLDOENDE'
  | 'MATIG'
  | 'ONVOLDOENDE';

export interface IndicatorDetail {
  naam: string;
  waarde: number;
  eenheid: string;
  gemiddelde: number;
  zScore: number;
  gewicht: number;      // Proportioneel gewicht (0.0-1.0)
}

export interface TabScore {
  naam: string;
  score: number;                // 1.0 - 10.0
  classificatie: Classificatie;
  gewicht: number;
  isGemeten: boolean;
  confidence: 'high' | 'medium' | 'low';
  isGemeenteData: boolean;
  indicatoren: IndicatorDetail[];
}

export interface BuurtprofielScore {
  totaalCijfer: number;           // 1.0 - 10.0
  classificatie: Classificatie;
  benchmarkType: BenchmarkType;
  benchmarkNaam: string;          // "Nederland" of gemeentenaam
  tabs: {
    bewoners: TabScore;
    wonen: TabScore;
    veiligheid: TabScore;
    voorzieningen: TabScore;
    zorgWelzijn: TabScore;
    werkInkomen: TabScore;
    leefomgeving: TabScore;
  };
  aantalGemetenTabs: number;
  datakwaliteit: 'volledig' | 'gedeeltelijk' | 'beperkt';
}

// Benchmark waarden per metriek
export interface MetriekBenchmark {
  gemiddelde: number;
  stdDev: number;
}

// Alle benchmarks voor een volledige scoreberekening
export interface BenchmarkSet {
  type: BenchmarkType;
  naam: string;
  // Bewoners
  dichtheid: MetriekBenchmark;
  // Wonen
  koopPercentage: MetriekBenchmark;
  huurParticulier: MetriekBenchmark;
  huurSociaal: MetriekBenchmark;
  // Veiligheid
  gewogenMisdrijvenPer1000: MetriekBenchmark;
  // Voorzieningen
  voorzieningenPer1000: MetriekBenchmark;
  // Zorg & Welzijn
  eenzaamheid: MetriekBenchmark;
  ernstigeEenzaamheid: MetriekBenchmark;
  angstDepressie: MetriekBenchmark;
  ervarenGezondheid: MetriekBenchmark;
  moeiteRondkomen: MetriekBenchmark;
  vrijwilligerswerk: MetriekBenchmark;
  wmoPer1000: MetriekBenchmark;
  // Werk & Inkomen
  gemiddeldInkomen: MetriekBenchmark;
  laagInkomen: MetriekBenchmark;
  hoogInkomen: MetriekBenchmark;
  arbeidsparticipatie: MetriekBenchmark;
  opleidingHoog: MetriekBenchmark;
  bijstandPer1000: MetriekBenchmark;
  // Leefomgeving
  m2GroenPerPersoon: MetriekBenchmark;
  groenPercentage: MetriekBenchmark;
}
