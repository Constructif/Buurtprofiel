import type { BenchmarkSet } from '../types/scoring';
import type { GebiedData } from '../types/gebied';
import type { ZorgWelzijnData } from '../types/zorgWelzijn';
import type { LeefomgevingData } from '../types/leefomgeving';

// NL benchmarks - hardcoded landelijke gemiddelden en standaarddeviaties
export const NL_BENCHMARKS: BenchmarkSet = {
  type: 'nederland',
  naam: 'Nederland',
  // Bewoners
  dichtheid: { gemiddelde: 520, stdDev: 0.8 }, // log-schaal: stdDev in log10 eenheden
  // Wonen
  koopPercentage: { gemiddelde: 57, stdDev: 20 },
  huurParticulier: { gemiddelde: 14, stdDev: 10 },
  huurSociaal: { gemiddelde: 29, stdDev: 12 },
  // Veiligheid
  gewogenMisdrijvenPer1000: { gemiddelde: 60, stdDev: 30 },
  // Voorzieningen
  voorzieningenPer1000: { gemiddelde: 8, stdDev: 4 },
  // Zorg & Welzijn
  eenzaamheid: { gemiddelde: 49.2, stdDev: 12 },
  ernstigeEenzaamheid: { gemiddelde: 14.4, stdDev: 5 },
  angstDepressie: { gemiddelde: 10.2, stdDev: 4 },
  ervarenGezondheid: { gemiddelde: 69, stdDev: 10 },
  moeiteRondkomen: { gemiddelde: 20.5, stdDev: 8 },
  vrijwilligerswerk: { gemiddelde: 23.8, stdDev: 8 },
  wmoPer1000: { gemiddelde: 60, stdDev: 25 },
  // Werk & Inkomen
  gemiddeldInkomen: { gemiddelde: 37200, stdDev: 8000 },
  laagInkomen: { gemiddelde: 40, stdDev: 10 },
  hoogInkomen: { gemiddelde: 20, stdDev: 8 },
  arbeidsparticipatie: { gemiddelde: 71, stdDev: 8 },
  opleidingHoog: { gemiddelde: 32.5, stdDev: 10 },
  bijstandPer1000: { gemiddelde: 23, stdDev: 12 },
  // Leefomgeving
  m2GroenPerPersoon: { gemiddelde: 418, stdDev: 0.5 }, // log-schaal
  groenPercentage: { gemiddelde: 18.1, stdDev: 10 },
};

/**
 * Bouw gemeente-benchmarks op basis van beschikbare data.
 * Gebruikt gemeente-level data als gemiddelde, met dezelfde standaarddeviaties als NL
 * (we laden niet alle buurten van de gemeente, dus echte stdDev is niet beschikbaar).
 * Valt terug op NL-waarden als gemeente-data ontbreekt.
 */
export function getGemeenteBenchmarks(
  gebiedData: GebiedData,
  gemeenteData: GebiedData | null,
  zorgData: ZorgWelzijnData | null,
  leefomgevingData: LeefomgevingData | null,
): BenchmarkSet {
  // Start met NL als basis (fallback)
  const benchmarks: BenchmarkSet = { ...NL_BENCHMARKS, type: 'gemeente', naam: gebiedData.gemeenteNaam || 'Gemeente' };

  if (!gemeenteData) return benchmarks;

  // Bewoners - dichtheid
  if (gemeenteData.bevolking.dichtheid > 0) {
    benchmarks.dichtheid = { gemiddelde: gemeenteData.bevolking.dichtheid, stdDev: NL_BENCHMARKS.dichtheid.stdDev };
  }

  // Wonen
  if (gemeenteData.woningen.koopPercentage > 0) {
    benchmarks.koopPercentage = { gemiddelde: gemeenteData.woningen.koopPercentage, stdDev: NL_BENCHMARKS.koopPercentage.stdDev };
  }
  if (gemeenteData.woningen.huurParticulierPercentage > 0) {
    benchmarks.huurParticulier = { gemiddelde: gemeenteData.woningen.huurParticulierPercentage, stdDev: NL_BENCHMARKS.huurParticulier.stdDev };
  }
  if (gemeenteData.woningen.huurSociaalPercentage > 0) {
    benchmarks.huurSociaal = { gemiddelde: gemeenteData.woningen.huurSociaalPercentage, stdDev: NL_BENCHMARKS.huurSociaal.stdDev };
  }

  // Veiligheid - bereken gewogen misdrijven per 1000 voor gemeente
  if (gemeenteData.bevolking.totaal > 0 && gemeenteData.criminaliteit.totaal > 0) {
    const highImpact = gemeenteData.criminaliteit.geweld + gemeenteData.criminaliteit.inbraakWoningen;
    const veelvoorkomend = gemeenteData.criminaliteit.vermogen - gemeenteData.criminaliteit.inbraakWoningen + gemeenteData.criminaliteit.vernieling;
    const gewogenTotaal = (highImpact * 2.5) + veelvoorkomend;
    const gewogenPer1000 = (gewogenTotaal / gemeenteData.bevolking.totaal) * 1000;
    benchmarks.gewogenMisdrijvenPer1000 = { gemiddelde: gewogenPer1000, stdDev: NL_BENCHMARKS.gewogenMisdrijvenPer1000.stdDev };
  }

  // Werk & Inkomen
  if (gemeenteData.inkomen.gemiddeld !== null) {
    benchmarks.gemiddeldInkomen = { gemiddelde: gemeenteData.inkomen.gemiddeld, stdDev: NL_BENCHMARKS.gemiddeldInkomen.stdDev };
  }
  if (gemeenteData.inkomen.laagInkomenPercentage > 0) {
    benchmarks.laagInkomen = { gemiddelde: gemeenteData.inkomen.laagInkomenPercentage, stdDev: NL_BENCHMARKS.laagInkomen.stdDev };
  }
  if (gemeenteData.inkomen.hoogInkomenPercentage > 0) {
    benchmarks.hoogInkomen = { gemiddelde: gemeenteData.inkomen.hoogInkomenPercentage, stdDev: NL_BENCHMARKS.hoogInkomen.stdDev };
  }
  if (gemeenteData.werkInkomen?.werkgelegenheid.arbeidsparticipatie !== null && gemeenteData.werkInkomen?.werkgelegenheid.arbeidsparticipatie !== undefined) {
    benchmarks.arbeidsparticipatie = { gemiddelde: gemeenteData.werkInkomen.werkgelegenheid.arbeidsparticipatie, stdDev: NL_BENCHMARKS.arbeidsparticipatie.stdDev };
  }
  if (gemeenteData.werkInkomen?.opleiding.hoog !== null && gemeenteData.werkInkomen?.opleiding.hoog !== undefined) {
    benchmarks.opleidingHoog = { gemiddelde: gemeenteData.werkInkomen.opleiding.hoog, stdDev: NL_BENCHMARKS.opleidingHoog.stdDev };
  }
  if (gemeenteData.werkInkomen?.uitkeringen.bijstandPer1000 !== null && gemeenteData.werkInkomen?.uitkeringen.bijstandPer1000 !== undefined) {
    benchmarks.bijstandPer1000 = { gemiddelde: gemeenteData.werkInkomen.uitkeringen.bijstandPer1000, stdDev: NL_BENCHMARKS.bijstandPer1000.stdDev };
  }

  // Zorg & Welzijn - gemeente level uit vergelijking
  if (zorgData?.vergelijking.gemeente) {
    const gem = zorgData.vergelijking.gemeente;
    if (gem.eenzaam !== null) {
      benchmarks.eenzaamheid = { gemiddelde: gem.eenzaam, stdDev: NL_BENCHMARKS.eenzaamheid.stdDev };
    }
  }

  // Jeugdzorg/WMO
  if (gemeenteData.jeugdzorgWmo?.wmoPer1000 !== null && gemeenteData.jeugdzorgWmo?.wmoPer1000 !== undefined) {
    benchmarks.wmoPer1000 = { gemiddelde: gemeenteData.jeugdzorgWmo.wmoPer1000, stdDev: NL_BENCHMARKS.wmoPer1000.stdDev };
  }

  // Leefomgeving - gemeente level uit vergelijking
  if (leefomgevingData?.vergelijking.gemeente) {
    const gem = leefomgevingData.vergelijking.gemeente;
    if (gem.m2PerPersoon !== null) {
      benchmarks.m2GroenPerPersoon = { gemiddelde: gem.m2PerPersoon, stdDev: NL_BENCHMARKS.m2GroenPerPersoon.stdDev };
    }
    if (gem.groenPercentage !== null) {
      benchmarks.groenPercentage = { gemiddelde: gem.groenPercentage, stdDev: NL_BENCHMARKS.groenPercentage.stdDev };
    }
  }

  return benchmarks;
}
