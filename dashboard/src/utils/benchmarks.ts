import type { BenchmarkSet } from '../types/scoring';
import type { GebiedData } from '../types/gebied';
import type { ZorgWelzijnData } from '../types/zorgWelzijn';
import type { LeefomgevingData } from '../types/leefomgeving';

// NL benchmarks - hardcoded landelijke gemiddelden en standaarddeviaties
// Bronnen: CBS StatLine (85039NED/85984NED), RIVM Gezondheidsmonitor, CBS 86211NED
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
  // Zorg & Welzijn (bron: RIVM GGD Gezondheidsmonitor 2022, dataset 50120NED, NL01, 18+)
  eenzaamheid: { gemiddelde: 49.2, stdDev: 12 },
  ernstigeEenzaamheid: { gemiddelde: 14.4, stdDev: 5 },
  emotioneelEenzaam: { gemiddelde: 30.1, stdDev: 10 },
  sociaalEenzaam: { gemiddelde: 35.3, stdDev: 10 },
  angstDepressie: { gemiddelde: 10.2, stdDev: 4 },
  psychischeKlachten: { gemiddelde: 22.2, stdDev: 8 },
  stress: { gemiddelde: 20.7, stdDev: 8 },
  emotioneleSteun: { gemiddelde: 6.4, stdDev: 4 },
  veerkracht: { gemiddelde: 17.3, stdDev: 6 },
  mantelzorger: { gemiddelde: 13.5, stdDev: 5 },
  langdurigeAandoeningen: { gemiddelde: 33.4, stdDev: 10 },
  beperkt: { gemiddelde: 33.8, stdDev: 10 },
  ervarenGezondheid: { gemiddelde: 69, stdDev: 10 },
  moeiteRondkomen: { gemiddelde: 20.5, stdDev: 8 },
  vrijwilligerswerk: { gemiddelde: 23.8, stdDev: 8 },
  wmoPer1000: { gemiddelde: 60, stdDev: 25 },
  // Werk & Inkomen (bron: CBS Kerncijfers 85984NED + 86052NED + 85618NED)
  gemiddeldInkomen: { gemiddelde: 37200, stdDev: 8000 },
  // CBS quintiel-definities: laagInkomen = % personen in landelijke onderste 40%, hoogInkomen = bovenste 20%
  // Landelijk gemiddelde is per definitie ~40% resp. ~20% (het is een quintiel-verdeling)
  laagInkomen: { gemiddelde: 40, stdDev: 8 },   // stdDev 8: striktere differentiatie tussen buurten
  hoogInkomen: { gemiddelde: 20, stdDev: 8 },
  arbeidsparticipatie: { gemiddelde: 71, stdDev: 8 },
  opleidingLaag: { gemiddelde: 26.3, stdDev: 10 },
  opleidingMidden: { gemiddelde: 41.2, stdDev: 10 },
  opleidingHoog: { gemiddelde: 32.5, stdDev: 10 },
  bijstandPer1000: { gemiddelde: 23, stdDev: 12 },
  wwPer1000: { gemiddelde: 9, stdDev: 6 },
  aoPer1000: { gemiddelde: 44, stdDev: 18 },
  // Leefomgeving (bron: CBS 86211NED bodemgebruik + bevolking)
  m2GroenPerPersoon: { gemiddelde: 418, stdDev: 0.5 }, // log-schaal: stdDev in log10 eenheden
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
  // Start met NL als basis: élke metric is in beginsel een NL-fallback.
  // markeer alle metrics expliciet als fallback; setGemeente() haalt dat weg
  // zodra er een echt gemeentecijfer wordt ingevuld.
  const benchmarks: BenchmarkSet = { ...NL_BENCHMARKS, type: 'gemeente', naam: gebiedData.gemeenteNaam || 'Gemeente' };
  for (const key of Object.keys(benchmarks) as (keyof BenchmarkSet)[]) {
    const metric = benchmarks[key];
    if (typeof metric === 'object' && metric !== null && 'gemiddelde' in metric) {
      benchmarks[key] = { ...metric, isFallback: true } as never;
    }
  }

  // Zet een echt gemeentecijfer; behoud NL-stdDev (we laden niet alle buurten van de gemeente).
  const setGemeente = (key: keyof BenchmarkSet, waarde: number | null | undefined) => {
    if (waarde === null || waarde === undefined) return;
    const nlMetric = NL_BENCHMARKS[key];
    if (typeof nlMetric !== 'object') return;
    benchmarks[key] = { gemiddelde: waarde, stdDev: nlMetric.stdDev, isFallback: false } as never;
  };

  if (!gemeenteData) return benchmarks;

  // Bewoners - dichtheid
  if (gemeenteData.bevolking.dichtheid > 0) setGemeente('dichtheid', gemeenteData.bevolking.dichtheid);

  // Wonen
  if (gemeenteData.woningen.koopPercentage > 0) setGemeente('koopPercentage', gemeenteData.woningen.koopPercentage);
  if (gemeenteData.woningen.huurParticulierPercentage > 0) setGemeente('huurParticulier', gemeenteData.woningen.huurParticulierPercentage);
  if (gemeenteData.woningen.huurSociaalPercentage > 0) setGemeente('huurSociaal', gemeenteData.woningen.huurSociaalPercentage);

  // Veiligheid - bereken gewogen misdrijven per 1000 voor gemeente
  if (gemeenteData.bevolking.totaal > 0 && gemeenteData.criminaliteit.totaal > 0) {
    const highImpact = gemeenteData.criminaliteit.geweld + gemeenteData.criminaliteit.inbraakWoningen;
    const veelvoorkomend = gemeenteData.criminaliteit.vermogen - gemeenteData.criminaliteit.inbraakWoningen + gemeenteData.criminaliteit.vernieling;
    const gewogenTotaal = (highImpact * 2.5) + veelvoorkomend;
    const gewogenPer1000 = (gewogenTotaal / gemeenteData.bevolking.totaal) * 1000;
    setGemeente('gewogenMisdrijvenPer1000', gewogenPer1000);
  }

  // Werk & Inkomen
  setGemeente('gemiddeldInkomen', gemeenteData.inkomen.gemiddeld);
  if (gemeenteData.inkomen.laagInkomenPercentage !== null && gemeenteData.inkomen.laagInkomenPercentage > 0) {
    setGemeente('laagInkomen', gemeenteData.inkomen.laagInkomenPercentage);
  }
  if (gemeenteData.inkomen.hoogInkomenPercentage !== null && gemeenteData.inkomen.hoogInkomenPercentage > 0) {
    setGemeente('hoogInkomen', gemeenteData.inkomen.hoogInkomenPercentage);
  }
  setGemeente('arbeidsparticipatie', gemeenteData.werkInkomen?.werkgelegenheid.arbeidsparticipatie);
  setGemeente('opleidingLaag', gemeenteData.werkInkomen?.opleiding.laag);
  setGemeente('opleidingMidden', gemeenteData.werkInkomen?.opleiding.midden);
  setGemeente('opleidingHoog', gemeenteData.werkInkomen?.opleiding.hoog);
  setGemeente('bijstandPer1000', gemeenteData.werkInkomen?.uitkeringen.bijstandPer1000);
  setGemeente('wwPer1000', gemeenteData.werkInkomen?.uitkeringen.wwPer1000);
  setGemeente('aoPer1000', gemeenteData.werkInkomen?.uitkeringen.aoPer1000);

  // Zorg & Welzijn - gemeente level uit vergelijking.
  // ZorgVergelijkingNiveau draagt momenteel alleen deze 6 velden; de overige
  // zorg-metrics (psychischeKlachten, stress, etc.) blijven NL-fallback.
  if (zorgData?.vergelijking.gemeente) {
    const gem = zorgData.vergelijking.gemeente;
    setGemeente('eenzaamheid', gem.eenzaam);
    setGemeente('ernstigeEenzaamheid', gem.ernstigEenzaam);
    setGemeente('angstDepressie', gem.angstDepressie);
    setGemeente('ervarenGezondheid', gem.ervarenGezondheid);
    setGemeente('moeiteRondkomen', gem.moeiteRondkomen);
    setGemeente('vrijwilligerswerk', gem.vrijwilligerswerk);
  }

  // Jeugdzorg/WMO
  setGemeente('wmoPer1000', gemeenteData.jeugdzorgWmo?.wmoPer1000);

  // Leefomgeving - gemeente level uit vergelijking
  if (leefomgevingData?.vergelijking.gemeente) {
    const gem = leefomgevingData.vergelijking.gemeente;
    setGemeente('m2GroenPerPersoon', gem.m2PerPersoon);
    setGemeente('groenPercentage', gem.groenPercentage);
  }

  return benchmarks;
}
