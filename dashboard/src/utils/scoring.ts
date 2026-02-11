import type { GebiedData } from '../types/gebied';
import type { ZorgWelzijnData } from '../types/zorgWelzijn';
import type { LeefomgevingData } from '../types/leefomgeving';
import type { Voorziening, VoorzieningType } from '../services/overpass';
import type {
  Classificatie,
  TabScore,
  BuurtprofielScore,
  BenchmarkSet,
  IndicatorDetail,
} from '../types/scoring';

// --- Hulpfuncties ---

/** Z-score berekenen: (waarde - gemiddelde) / stdDev */
function zScore(waarde: number, gemiddelde: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (waarde - gemiddelde) / stdDev;
}

/**
 * Z-score omzetten naar Nederlands schoolcijfer (1-10).
 * Z=0 (gemiddelde) → 6.0, Z=+1 → 7.5, Z=+2 → 9.0, Z=-1 → 4.5
 */
function zScoreToGrade(z: number): number {
  const grade = 6.0 + z * 1.5;
  return Math.max(1.0, Math.min(10.0, Math.round(grade * 10) / 10));
}

/** Shannon entropy voor een array van waarden, genormaliseerd naar 0-1 */
function shannonEntropy(values: number[]): number {
  const total = values.reduce((s, v) => s + v, 0);
  if (total === 0) return 0;
  const props = values.map(v => v / total).filter(p => p > 0);
  const entropy = -props.reduce((s, p) => s + p * Math.log(p), 0);
  const maxEntropy = Math.log(values.length);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

/** Entropy omzetten naar een schoolcijfer (1-10) */
function entropyToGrade(normalizedEntropy: number): number {
  // 1.0 (perfect gebalanceerd) → 8.5, 0.0 (volledig ongelijk) → 1.0
  return Math.max(1.0, Math.min(10.0, 1.0 + normalizedEntropy * 7.5));
}

/** Omgekeerde U-curve score: optimaal rondom een bepaald punt */
function invertedUScore(waarde: number, optimaal: number, range: number): number {
  const afwijking = Math.abs(waarde - optimaal);
  const normalized = Math.max(0, 1 - afwijking / range);
  return 1.0 + normalized * 7.5; // 0→1.0, 1→8.5
}

// --- Classificatie ---

export function getClassificatie(score: number): Classificatie {
  if (score >= 9.0) return 'UITSTEKEND';
  if (score >= 8.0) return 'ZEER GOED';
  if (score >= 7.0) return 'GOED';
  if (score >= 6.0) return 'RUIM VOLDOENDE';
  if (score >= 5.5) return 'VOLDOENDE';
  if (score >= 4.5) return 'MATIG';
  return 'ONVOLDOENDE';
}

export function getClassificatieKleur(classificatie: Classificatie): string {
  switch (classificatie) {
    case 'UITSTEKEND': return '#10b981';
    case 'ZEER GOED': return '#22c55e';
    case 'GOED': return '#84cc16';
    case 'RUIM VOLDOENDE': return '#eab308';
    case 'VOLDOENDE': return '#f59e0b';
    case 'MATIG': return '#f97316';
    case 'ONVOLDOENDE': return '#ef4444';
  }
}

// --- Tab score berekeningen ---

function makeTabScore(
  naam: string,
  score: number | null,
  gewicht: number,
  indicatoren: IndicatorDetail[],
  opts?: { confidence?: 'high' | 'medium' | 'low'; isGemeenteData?: boolean }
): TabScore {
  const safeScore = score !== null ? Math.round(score * 10) / 10 : 6.0;
  return {
    naam,
    score: safeScore,
    classificatie: getClassificatie(safeScore),
    gewicht,
    isGemeten: score !== null,
    confidence: opts?.confidence ?? 'high',
    isGemeenteData: opts?.isGemeenteData ?? false,
    indicatoren,
  };
}

// --- 1. BEWONERS ---

export function berekenBewonersScore(data: GebiedData, benchmarks: BenchmarkSet): TabScore {
  const bev = data.bevolking;
  const hh = data.huishoudens;

  const scores: { score: number; weight: number }[] = [];
  const indicatoren: IndicatorDetail[] = [];

  // 1. Leeftijdsbalans (Shannon entropy van 5 leeftijdsgroepen)
  const leeftijdEntropy = shannonEntropy([
    bev.leeftijd_0_14, bev.leeftijd_15_24, bev.leeftijd_25_44,
    bev.leeftijd_45_64, bev.leeftijd_65_plus,
  ]);
  const leeftijdScore = entropyToGrade(leeftijdEntropy);
  scores.push({ score: leeftijdScore, weight: 0.30 });
  indicatoren.push({ naam: 'Leeftijdsbalans', waarde: Math.round(leeftijdEntropy * 100) / 100, eenheid: 'entropy', gemiddelde: 0.95, zScore: 0, gewicht: 0.30 });

  // 2. Bevolkingsdichtheid (omgekeerde U-curve, optimaal 1000-3000/km²)
  if (bev.dichtheid > 0) {
    const logD = Math.log10(Math.max(bev.dichtheid, 1));
    const optimal = Math.log10(2000); // ~3.3
    const afwijking = Math.abs(logD - optimal);
    const dichtheidScore = Math.max(1.0, Math.min(10.0, 8.5 - afwijking * 3));
    scores.push({ score: dichtheidScore, weight: 0.20 });
    indicatoren.push({ naam: 'Bevolkingsdichtheid', waarde: Math.round(bev.dichtheid), eenheid: '/km²', gemiddelde: benchmarks.dichtheid.gemiddelde, zScore: 0, gewicht: 0.20 });
  }

  // 3. Huishoudensmix (Shannon entropy van 3 types)
  if (hh.totaal > 0) {
    const hhEntropy = shannonEntropy([hh.eenpersoons, hh.zonderKinderen, hh.metKinderen]);
    const hhScore = entropyToGrade(hhEntropy);
    scores.push({ score: hhScore, weight: 0.25 });
    indicatoren.push({ naam: 'Huishoudensmix', waarde: Math.round(hhEntropy * 100) / 100, eenheid: 'entropy', gemiddelde: 0.95, zScore: 0, gewicht: 0.25 });
  }

  // 4. Bevolkingsdynamiek (netto migratie)
  if (data.bevolkingsDynamiek && data.bevolkingsDynamiek.jaren.length > 0) {
    const recentJaar = data.bevolkingsDynamiek.jaren[data.bevolkingsDynamiek.jaren.length - 1];
    // Mild positief saldo = best, bereken per 1000 als we bevolking hebben
    const saldoPer1000 = bev.totaal > 0 ? (recentJaar.saldo / bev.totaal) * 1000 : 0;
    // Mild positief (+5/1000) = 7.5, neutraal = 6.0, sterk negatief (-10/1000) = 4.0
    const dynamiekScore = Math.max(1.0, Math.min(9.0, 6.0 + saldoPer1000 * 0.3));
    scores.push({ score: dynamiekScore, weight: 0.25 });
    indicatoren.push({ naam: 'Migratiesaldo', waarde: Math.round(saldoPer1000 * 10) / 10, eenheid: 'per 1.000', gemiddelde: 0, zScore: 0, gewicht: 0.25 });
  }

  if (scores.length === 0) return makeTabScore('Bewoners', null, 0.08, []);

  // Gewogen gemiddelde (normaliseer gewichten)
  const totalWeight = scores.reduce((s, sc) => s + sc.weight, 0);
  const finalScore = scores.reduce((s, sc) => s + sc.score * (sc.weight / totalWeight), 0);

  return makeTabScore('Bewoners', finalScore, 0.08, indicatoren);
}

// --- 2. WONEN ---

export function berekenWonenScore(data: GebiedData, benchmarks: BenchmarkSet): TabScore {
  const w = data.woningen;
  const scores: { score: number; weight: number }[] = [];
  const indicatoren: IndicatorDetail[] = [];

  // 1. Kooppercentage (hoger = beter)
  const koopZ = zScore(w.koopPercentage, benchmarks.koopPercentage.gemiddelde, benchmarks.koopPercentage.stdDev);
  scores.push({ score: zScoreToGrade(koopZ), weight: 0.35 });
  indicatoren.push({ naam: 'Koopwoningen', waarde: Math.round(w.koopPercentage), eenheid: '%', gemiddelde: benchmarks.koopPercentage.gemiddelde, zScore: Math.round(koopZ * 100) / 100, gewicht: 0.35 });

  // 2. Woningtypediversiteit (entropy van 5 types)
  const types = [w.meergezinsPercentage, w.tussenwoningPercentage, w.hoekwoningPercentage, w.tweeOnderEenKapPercentage, w.vrijstaandPercentage];
  const typeTotal = types.reduce((s, v) => s + v, 0);
  if (typeTotal > 0) {
    const typeEntropy = shannonEntropy(types);
    const typeScore = entropyToGrade(typeEntropy);
    scores.push({ score: typeScore, weight: 0.25 });
    indicatoren.push({ naam: 'Woningtypemix', waarde: Math.round(typeEntropy * 100) / 100, eenheid: 'entropy', gemiddelde: 0, zScore: 0, gewicht: 0.25 });
  }

  // 3. Sociaal huur ratio (omgekeerde U-curve, optimaal ~25-35%)
  const sociaalScore = invertedUScore(w.huurSociaalPercentage, 30, 30);
  scores.push({ score: sociaalScore, weight: 0.20 });
  indicatoren.push({ naam: 'Sociale huur', waarde: Math.round(w.huurSociaalPercentage), eenheid: '%', gemiddelde: benchmarks.huurSociaal.gemiddelde, zScore: 0, gewicht: 0.20 });

  // 4. Particulier huur ratio (lager = beter, hoog wijst op betaalbaarheidsproblemen)
  const privZ = zScore(w.huurParticulierPercentage, benchmarks.huurParticulier.gemiddelde, benchmarks.huurParticulier.stdDev);
  scores.push({ score: zScoreToGrade(-privZ), weight: 0.20 });
  indicatoren.push({ naam: 'Particuliere huur', waarde: Math.round(w.huurParticulierPercentage), eenheid: '%', gemiddelde: benchmarks.huurParticulier.gemiddelde, zScore: Math.round(-privZ * 100) / 100, gewicht: 0.20 });

  const totalWeight = scores.reduce((s, sc) => s + sc.weight, 0);
  const finalScore = scores.reduce((s, sc) => s + sc.score * (sc.weight / totalWeight), 0);

  return makeTabScore('Wonen', finalScore, 0.15, indicatoren);
}

// --- 3. VEILIGHEID ---

export function berekenVeiligheidScore(data: GebiedData, benchmarks: BenchmarkSet): TabScore {
  const bevolking = data.bevolking.totaal;
  if (bevolking === 0) return makeTabScore('Veiligheid', null, 0.20, []);

  const scores: { score: number; weight: number }[] = [];
  const indicatoren: IndicatorDetail[] = [];

  // 1. Kern: gewogen misdrijfcijfer (bestaande formule)
  const highImpact = data.criminaliteit.geweld + data.criminaliteit.inbraakWoningen;
  const veelvoorkomend = data.criminaliteit.vermogen - data.criminaliteit.inbraakWoningen + data.criminaliteit.vernieling;
  const gewogenTotaal = (highImpact * 2.5) + veelvoorkomend;
  const gewogenPer1000 = (gewogenTotaal / bevolking) * 1000;
  const misdrijvenPer1000 = (data.criminaliteit.totaal / bevolking) * 1000;

  // Score op basis van benchmark
  const gemBenchmark = benchmarks.gewogenMisdrijvenPer1000.gemiddelde;
  // Formule: als waarde = benchmark → 6.0 (voldoende), lager = beter
  const veiligheidZ = zScore(gewogenPer1000, gemBenchmark, benchmarks.gewogenMisdrijvenPer1000.stdDev);
  const coreScore = zScoreToGrade(-veiligheidZ); // inversed: lager = beter
  scores.push({ score: coreScore, weight: 0.70 });
  indicatoren.push(
    { naam: 'Misdrijven per 1.000', waarde: Math.round(misdrijvenPer1000 * 10) / 10, eenheid: '', gemiddelde: 46, zScore: 0, gewicht: 0 },
    { naam: 'Gewogen per 1.000', waarde: Math.round(gewogenPer1000 * 10) / 10, eenheid: '', gemiddelde: Math.round(gemBenchmark * 10) / 10, zScore: Math.round(-veiligheidZ * 100) / 100, gewicht: 0.70 },
  );

  // 2. Trend (3 jaar)
  if (data.criminaliteitTrend?.jaren && data.criminaliteitTrend.jaren.length >= 3) {
    const jaren = data.criminaliteitTrend.jaren;
    const recent = jaren[jaren.length - 1].totaal;
    const older = jaren[jaren.length - 3].totaal;
    if (older > 0) {
      const changePercent = ((recent - older) / older) * 100;
      // -20% = 8.0 (sterk dalend), 0% = 6.0 (stabiel), +20% = 4.0 (stijgend)
      const trendScore = Math.max(1.0, Math.min(10.0, 6.0 - changePercent * 0.1));
      scores.push({ score: trendScore, weight: 0.15 });
      indicatoren.push({ naam: 'Trend (3 jaar)', waarde: Math.round(changePercent), eenheid: '%', gemiddelde: 0, zScore: 0, gewicht: 0.15 });
    }
  }

  // 3. High-impact ratio
  if (data.criminaliteit.totaal > 0) {
    const highImpactRatio = (highImpact / data.criminaliteit.totaal) * 100;
    // 10% = 8.0 (laag aandeel), 20% = 6.0, 30% = 4.0 (hoog aandeel)
    const ratioScore = Math.max(1.0, Math.min(10.0, 8.0 - (highImpactRatio - 10) * 0.2));
    scores.push({ score: ratioScore, weight: 0.15 });
    indicatoren.push({ naam: 'High-impact aandeel', waarde: Math.round(highImpactRatio), eenheid: '%', gemiddelde: 20, zScore: 0, gewicht: 0.15 });
  }

  const totalWeight = scores.reduce((s, sc) => s + sc.weight, 0);
  const finalScore = scores.reduce((s, sc) => s + sc.score * (sc.weight / totalWeight), 0);

  return makeTabScore('Veiligheid', finalScore, 0.20, indicatoren);
}

// --- 4. VOORZIENINGEN ---

export function berekenVoorzieningenScore(
  bevolking: number,
  voorzieningen: Voorziening[],
  benchmarks: BenchmarkSet,
): TabScore {
  if (bevolking === 0) return makeTabScore('Voorzieningen', null, 0.12, []);

  const scores: { score: number; weight: number }[] = [];
  const indicatoren: IndicatorDetail[] = [];
  const totaal = voorzieningen.length;

  // 1. Totaal per 1.000 inwoners
  const per1000 = (totaal / bevolking) * 1000;
  const voorzZ = zScore(per1000, benchmarks.voorzieningenPer1000.gemiddelde, benchmarks.voorzieningenPer1000.stdDev);
  scores.push({ score: zScoreToGrade(voorzZ), weight: 0.40 });
  indicatoren.push({ naam: 'Per 1.000 inwoners', waarde: Math.round(per1000 * 10) / 10, eenheid: '', gemiddelde: benchmarks.voorzieningenPer1000.gemiddelde, zScore: Math.round(voorzZ * 100) / 100, gewicht: 0.40 });

  // 2. Essentiële dekking (huisarts, basisschool, supermarkt)
  const types = new Set(voorzieningen.map(v => v.type));
  const essentials = ['huisarts', 'basisschool', 'supermarkt'];
  const essentialCount = essentials.filter(e => types.has(e as VoorzieningType)).length;
  const essentialScore = essentialCount === 3 ? 8.5 : essentialCount === 2 ? 6.5 : essentialCount === 1 ? 4.5 : 2.0;
  scores.push({ score: essentialScore, weight: 0.35 });
  indicatoren.push({ naam: 'Essentieel (3)', waarde: essentialCount, eenheid: 'van 3', gemiddelde: 3, zScore: 0, gewicht: 0.35 });

  // 3. Categoriediversiteit (9 mogelijke types)
  const uniqueTypes = types.size;
  const diversityScore = Math.max(1.0, Math.min(10.0, 1.0 + uniqueTypes));
  scores.push({ score: diversityScore, weight: 0.25 });
  indicatoren.push({ naam: 'Categorieën', waarde: uniqueTypes, eenheid: 'van 9', gemiddelde: 6, zScore: 0, gewicht: 0.25 });

  const totalWeight = scores.reduce((s, sc) => s + sc.weight, 0);
  const finalScore = scores.reduce((s, sc) => s + sc.score * (sc.weight / totalWeight), 0);

  return makeTabScore('Voorzieningen', finalScore, 0.12, indicatoren, {
    confidence: totaal === 0 ? 'low' : 'high',
  });
}

// --- 5. ZORG & WELZIJN ---

export function berekenZorgWelzijnScore(
  zorgData: ZorgWelzijnData | null,
  jeugdzorgWmo: GebiedData['jeugdzorgWmo'],
  benchmarks: BenchmarkSet,
): TabScore {
  if (!zorgData) return makeTabScore('Zorg & Welzijn', null, 0.20, []);

  const { eenzaamheid, mentaleGezondheid, zorgOndersteuning } = zorgData;
  const scores: { score: number; weight: number }[] = [];
  const indicatoren: IndicatorDetail[] = [];

  // 1. Eenzaamheid (lager = beter)
  if (eenzaamheid.totaal !== null) {
    const z = zScore(eenzaamheid.totaal, benchmarks.eenzaamheid.gemiddelde, benchmarks.eenzaamheid.stdDev);
    scores.push({ score: zScoreToGrade(-z), weight: 0.20 });
    indicatoren.push({ naam: 'Eenzaamheid', waarde: eenzaamheid.totaal, eenheid: '%', gemiddelde: benchmarks.eenzaamheid.gemiddelde, zScore: Math.round(-z * 100) / 100, gewicht: 0.20 });
  }

  // 2. Ernstige eenzaamheid (lager = beter)
  if (eenzaamheid.ernstig !== null) {
    const z = zScore(eenzaamheid.ernstig, benchmarks.ernstigeEenzaamheid.gemiddelde, benchmarks.ernstigeEenzaamheid.stdDev);
    scores.push({ score: zScoreToGrade(-z), weight: 0.10 });
    indicatoren.push({ naam: 'Ernstig eenzaam', waarde: eenzaamheid.ernstig, eenheid: '%', gemiddelde: benchmarks.ernstigeEenzaamheid.gemiddelde, zScore: Math.round(-z * 100) / 100, gewicht: 0.10 });
  }

  // 3. Angst/depressie risico (lager = beter)
  if (mentaleGezondheid.angstDepressie !== null) {
    const z = zScore(mentaleGezondheid.angstDepressie, benchmarks.angstDepressie.gemiddelde, benchmarks.angstDepressie.stdDev);
    scores.push({ score: zScoreToGrade(-z), weight: 0.20 });
    indicatoren.push({ naam: 'Angst/depressie', waarde: mentaleGezondheid.angstDepressie, eenheid: '%', gemiddelde: benchmarks.angstDepressie.gemiddelde, zScore: Math.round(-z * 100) / 100, gewicht: 0.20 });
  }

  // 4. Ervaren gezondheid (hoger = beter)
  if (zorgOndersteuning.ervarenGezondheid !== null) {
    const z = zScore(zorgOndersteuning.ervarenGezondheid, benchmarks.ervarenGezondheid.gemiddelde, benchmarks.ervarenGezondheid.stdDev);
    scores.push({ score: zScoreToGrade(z), weight: 0.15 });
    indicatoren.push({ naam: 'Ervaren gezondheid', waarde: zorgOndersteuning.ervarenGezondheid, eenheid: '%', gemiddelde: benchmarks.ervarenGezondheid.gemiddelde, zScore: Math.round(z * 100) / 100, gewicht: 0.15 });
  }

  // 5. Moeite met rondkomen (lager = beter)
  if (zorgOndersteuning.moeiteRondkomen !== null) {
    const z = zScore(zorgOndersteuning.moeiteRondkomen, benchmarks.moeiteRondkomen.gemiddelde, benchmarks.moeiteRondkomen.stdDev);
    scores.push({ score: zScoreToGrade(-z), weight: 0.15 });
    indicatoren.push({ naam: 'Moeite rondkomen', waarde: zorgOndersteuning.moeiteRondkomen, eenheid: '%', gemiddelde: benchmarks.moeiteRondkomen.gemiddelde, zScore: Math.round(-z * 100) / 100, gewicht: 0.15 });
  }

  // 6. Vrijwilligerswerk (hoger = beter)
  if (zorgOndersteuning.vrijwilligerswerk !== null) {
    const z = zScore(zorgOndersteuning.vrijwilligerswerk, benchmarks.vrijwilligerswerk.gemiddelde, benchmarks.vrijwilligerswerk.stdDev);
    scores.push({ score: zScoreToGrade(z), weight: 0.10 });
    indicatoren.push({ naam: 'Vrijwilligerswerk', waarde: zorgOndersteuning.vrijwilligerswerk, eenheid: '%', gemiddelde: benchmarks.vrijwilligerswerk.gemiddelde, zScore: Math.round(z * 100) / 100, gewicht: 0.10 });
  }

  // 7. WMO per 1.000 (lager = beter)
  if (jeugdzorgWmo?.wmoPer1000 !== null && jeugdzorgWmo?.wmoPer1000 !== undefined) {
    const z = zScore(jeugdzorgWmo.wmoPer1000, benchmarks.wmoPer1000.gemiddelde, benchmarks.wmoPer1000.stdDev);
    scores.push({ score: zScoreToGrade(-z), weight: 0.10 });
    indicatoren.push({ naam: 'WMO per 1.000', waarde: jeugdzorgWmo.wmoPer1000, eenheid: '', gemiddelde: benchmarks.wmoPer1000.gemiddelde, zScore: Math.round(-z * 100) / 100, gewicht: 0.10 });
  }

  if (scores.length === 0) return makeTabScore('Zorg & Welzijn', null, 0.20, []);

  const confidence = scores.length >= 5 ? 'high' as const : scores.length >= 3 ? 'medium' as const : 'low' as const;
  const totalWeight = scores.reduce((s, sc) => s + sc.weight, 0);
  const finalScore = scores.reduce((s, sc) => s + sc.score * (sc.weight / totalWeight), 0);

  return makeTabScore('Zorg & Welzijn', finalScore, 0.20, indicatoren, { confidence });
}

// --- 6. WERK & INKOMEN ---

export function berekenWerkInkomenScore(data: GebiedData, benchmarks: BenchmarkSet): TabScore {
  const { inkomen, werkInkomen } = data;
  const scores: { score: number; weight: number }[] = [];
  const indicatoren: IndicatorDetail[] = [];
  let isGemeenteData = false;

  // 1. Gemiddeld besteedbaar inkomen (hoger = beter)
  if (inkomen.gemiddeld !== null) {
    const z = zScore(inkomen.gemiddeld, benchmarks.gemiddeldInkomen.gemiddelde, benchmarks.gemiddeldInkomen.stdDev);
    scores.push({ score: zScoreToGrade(z), weight: 0.25 });
    indicatoren.push({ naam: 'Gem. inkomen', waarde: inkomen.gemiddeld, eenheid: '€', gemiddelde: benchmarks.gemiddeldInkomen.gemiddelde, zScore: Math.round(z * 100) / 100, gewicht: 0.25 });
  }

  // 2. Laag inkomen % (lager = beter)
  if (inkomen.laagInkomenPercentage > 0) {
    const z = zScore(inkomen.laagInkomenPercentage, benchmarks.laagInkomen.gemiddelde, benchmarks.laagInkomen.stdDev);
    scores.push({ score: zScoreToGrade(-z), weight: 0.15 });
    indicatoren.push({ naam: 'Laag inkomen', waarde: inkomen.laagInkomenPercentage, eenheid: '%', gemiddelde: benchmarks.laagInkomen.gemiddelde, zScore: Math.round(-z * 100) / 100, gewicht: 0.15 });
  }

  // 3. Hoog inkomen % (hoger = beter)
  if (inkomen.hoogInkomenPercentage > 0) {
    const z = zScore(inkomen.hoogInkomenPercentage, benchmarks.hoogInkomen.gemiddelde, benchmarks.hoogInkomen.stdDev);
    scores.push({ score: zScoreToGrade(z), weight: 0.10 });
    indicatoren.push({ naam: 'Hoog inkomen', waarde: inkomen.hoogInkomenPercentage, eenheid: '%', gemiddelde: benchmarks.hoogInkomen.gemiddelde, zScore: Math.round(z * 100) / 100, gewicht: 0.10 });
  }

  // 4. Arbeidsparticipatie (hoger = beter)
  if (werkInkomen?.werkgelegenheid.arbeidsparticipatie !== null && werkInkomen?.werkgelegenheid.arbeidsparticipatie !== undefined) {
    const z = zScore(werkInkomen.werkgelegenheid.arbeidsparticipatie, benchmarks.arbeidsparticipatie.gemiddelde, benchmarks.arbeidsparticipatie.stdDev);
    scores.push({ score: zScoreToGrade(z), weight: 0.20 });
    indicatoren.push({ naam: 'Arbeidsparticipatie', waarde: werkInkomen.werkgelegenheid.arbeidsparticipatie, eenheid: '%', gemiddelde: benchmarks.arbeidsparticipatie.gemiddelde, zScore: Math.round(z * 100) / 100, gewicht: 0.20 });
    if (werkInkomen.werkgelegenheidIsGemeenteData) isGemeenteData = true;
  }

  // 5. Opleidingsniveau hoog (hoger = beter)
  if (werkInkomen?.opleiding.hoog !== null && werkInkomen?.opleiding.hoog !== undefined) {
    const z = zScore(werkInkomen.opleiding.hoog, benchmarks.opleidingHoog.gemiddelde, benchmarks.opleidingHoog.stdDev);
    scores.push({ score: zScoreToGrade(z), weight: 0.15 });
    indicatoren.push({ naam: 'Hoog opgeleid', waarde: werkInkomen.opleiding.hoog, eenheid: '%', gemiddelde: benchmarks.opleidingHoog.gemiddelde, zScore: Math.round(z * 100) / 100, gewicht: 0.15 });
    if (werkInkomen.opleidingIsGemeenteData) isGemeenteData = true;
  }

  // 6. Bijstand per 1.000 (lager = beter)
  if (werkInkomen?.uitkeringen.bijstandPer1000 !== null && werkInkomen?.uitkeringen.bijstandPer1000 !== undefined) {
    const z = zScore(werkInkomen.uitkeringen.bijstandPer1000, benchmarks.bijstandPer1000.gemiddelde, benchmarks.bijstandPer1000.stdDev);
    scores.push({ score: zScoreToGrade(-z), weight: 0.15 });
    indicatoren.push({ naam: 'Bijstand per 1.000', waarde: werkInkomen.uitkeringen.bijstandPer1000, eenheid: '', gemiddelde: benchmarks.bijstandPer1000.gemiddelde, zScore: Math.round(-z * 100) / 100, gewicht: 0.15 });
  }

  if (scores.length === 0) return makeTabScore('Werk & Inkomen', null, 0.15, []);

  const confidence = scores.length >= 4 ? 'high' as const : scores.length >= 2 ? 'medium' as const : 'low' as const;
  const totalWeight = scores.reduce((s, sc) => s + sc.weight, 0);
  const finalScore = scores.reduce((s, sc) => s + sc.score * (sc.weight / totalWeight), 0);

  return makeTabScore('Werk & Inkomen', finalScore, 0.15, indicatoren, { confidence, isGemeenteData });
}

// --- 7. LEEFOMGEVING ---

export function berekenLeefomgevingScore(leefomgevingData: LeefomgevingData | null, benchmarks: BenchmarkSet): TabScore {
  if (!leefomgevingData) return makeTabScore('Leefomgeving', null, 0.10, []);

  const { metrics, bodemgebruik } = leefomgevingData;
  const scores: { score: number; weight: number }[] = [];
  const indicatoren: IndicatorDetail[] = [];

  // 1. m² groen per persoon (log-schaal, hoger = beter)
  if (metrics.m2GroenPerPersoon !== null) {
    const logValue = Math.log10(Math.max(metrics.m2GroenPerPersoon, 1));
    const logBenchmark = Math.log10(Math.max(benchmarks.m2GroenPerPersoon.gemiddelde, 1));
    const z = zScore(logValue, logBenchmark, benchmarks.m2GroenPerPersoon.stdDev);
    scores.push({ score: zScoreToGrade(z), weight: 0.50 });
    indicatoren.push({ naam: 'm² groen/persoon', waarde: Math.round(metrics.m2GroenPerPersoon), eenheid: 'm²', gemiddelde: benchmarks.m2GroenPerPersoon.gemiddelde, zScore: Math.round(z * 100) / 100, gewicht: 0.50 });
  }

  // 2. Groenpercentage (hoger = beter)
  if (metrics.groenPercentage !== null) {
    const z = zScore(metrics.groenPercentage, benchmarks.groenPercentage.gemiddelde, benchmarks.groenPercentage.stdDev);
    scores.push({ score: zScoreToGrade(z), weight: 0.30 });
    indicatoren.push({ naam: 'Groenpercentage', waarde: Math.round(metrics.groenPercentage * 10) / 10, eenheid: '%', gemiddelde: benchmarks.groenPercentage.gemiddelde, zScore: Math.round(z * 100) / 100, gewicht: 0.30 });
  }

  // 3. Groentypediversiteit (entropy van 4 types)
  const greenTypes = [
    bodemgebruik.stedelijkGroen || 0,
    bodemgebruik.sportterrein || 0,
    bodemgebruik.recreatiefTerrein || 0,
    bodemgebruik.natuurlijkTerrein || 0,
  ];
  const totalGreen = greenTypes.reduce((s, v) => s + v, 0);
  if (totalGreen > 0) {
    const greenEntropy = shannonEntropy(greenTypes);
    const diversityScore = entropyToGrade(greenEntropy);
    scores.push({ score: diversityScore, weight: 0.20 });
    indicatoren.push({ naam: 'Groendiversiteit', waarde: Math.round(greenEntropy * 100) / 100, eenheid: 'entropy', gemiddelde: 0, zScore: 0, gewicht: 0.20 });
  }

  if (scores.length === 0) return makeTabScore('Leefomgeving', null, 0.10, []);

  const totalWeight = scores.reduce((s, sc) => s + sc.weight, 0);
  const finalScore = scores.reduce((s, sc) => s + sc.score * (sc.weight / totalWeight), 0);

  return makeTabScore('Leefomgeving', finalScore, 0.10, indicatoren, {
    isGemeenteData: leefomgevingData.isGemeenteNiveau ?? false,
  });
}

// --- OVERALL BUURTPROFIEL CIJFER ---

const TAB_WEIGHTS: Record<string, number> = {
  veiligheid: 0.20,
  zorgWelzijn: 0.20,
  werkInkomen: 0.15,
  wonen: 0.15,
  voorzieningen: 0.12,
  leefomgeving: 0.10,
  bewoners: 0.08,
};

export function berekenBuurtprofielScore(
  gebiedData: GebiedData,
  voorzieningen: Voorziening[],
  zorgData: ZorgWelzijnData | null,
  leefomgevingData: LeefomgevingData | null,
  benchmarks: BenchmarkSet,
): BuurtprofielScore {
  // Bereken elke tab score
  const tabs = {
    bewoners: berekenBewonersScore(gebiedData, benchmarks),
    wonen: berekenWonenScore(gebiedData, benchmarks),
    veiligheid: berekenVeiligheidScore(gebiedData, benchmarks),
    voorzieningen: berekenVoorzieningenScore(gebiedData.bevolking.totaal, voorzieningen, benchmarks),
    zorgWelzijn: berekenZorgWelzijnScore(zorgData, gebiedData.jeugdzorgWmo, benchmarks),
    werkInkomen: berekenWerkInkomenScore(gebiedData, benchmarks),
    leefomgeving: berekenLeefomgevingScore(leefomgevingData, benchmarks),
  };

  // Gewogen gemiddelde van gemeten tabs
  let totalScore = 0;
  let totalWeight = 0;
  let aantalGemeten = 0;

  for (const [key, tab] of Object.entries(tabs)) {
    if (tab.isGemeten) {
      const weight = TAB_WEIGHTS[key] ?? 0;
      totalScore += tab.score * weight;
      totalWeight += weight;
      aantalGemeten++;
    }
  }

  const totaalCijfer = totalWeight > 0
    ? Math.round((totalScore / totalWeight) * 10) / 10
    : 5.5;

  const datakwaliteit = aantalGemeten >= 6 ? 'volledig' as const
    : aantalGemeten >= 4 ? 'gedeeltelijk' as const
    : 'beperkt' as const;

  return {
    totaalCijfer,
    classificatie: getClassificatie(totaalCijfer),
    benchmarkType: benchmarks.type,
    benchmarkNaam: benchmarks.naam,
    tabs,
    aantalGemetenTabs: aantalGemeten,
    datakwaliteit,
  };
}
