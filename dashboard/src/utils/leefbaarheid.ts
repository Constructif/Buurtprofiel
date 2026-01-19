import type { GebiedData } from '../types/gebied';

// Types
export type LeefbaarheidClassificatie =
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
}

export interface DimensieScore {
  naam: string;
  score: number;
  classificatie: LeefbaarheidClassificatie;
  gewicht: number;
  indicatoren: IndicatorDetail[];
  isGemeten: boolean;
}

export interface LeefbaarheidScore {
  totaalScore: number;
  classificatie: LeefbaarheidClassificatie;
  dimensies: {
    veiligheid: DimensieScore;
    voorzieningen: DimensieScore;
    woningvoorraad: DimensieScore;
    socialeCohesie: DimensieScore;
    fysiekeOmgeving: DimensieScore;
  };
}

// Hulpfuncties
function zScoreNormal(waarde: number, gemiddelde: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (waarde - gemiddelde) / stdDev;
}

function zScoreInverse(waarde: number, gemiddelde: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return -((waarde - gemiddelde) / stdDev);
}

function normalizeZScore(zScore: number): number {
  // Z-score van -2 = 0, Z-score van 0 = 50, Z-score van +2 = 100
  const normalized = ((zScore + 2) / 4) * 100;
  return Math.max(0, Math.min(100, normalized));
}

// Classificatie gebaseerd op schoolcijfer logica:
// 90+ = uitstekend, 80+ = zeer goed, 70+ = goed, 60+ = ruim voldoende
// 55+ = voldoende, 45+ = matig, <45 = onvoldoende
export function getClassificatie(score: number): LeefbaarheidClassificatie {
  if (score >= 90) return 'UITSTEKEND';
  if (score >= 80) return 'ZEER GOED';
  if (score >= 70) return 'GOED';
  if (score >= 60) return 'RUIM VOLDOENDE';
  if (score >= 55) return 'VOLDOENDE';
  if (score >= 45) return 'MATIG';
  return 'ONVOLDOENDE';
}

export function getClassificatieKleur(classificatie: LeefbaarheidClassificatie): string {
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

function getDefaultScore(naam: string, gewicht: number): DimensieScore {
  return {
    naam,
    score: 50,
    classificatie: 'RUIM VOLDOENDE',
    gewicht,
    indicatoren: [],
    isGemeten: true,
  };
}

// Dimensie berekeningen
// Veiligheid: Gebruik dezelfde gewogen score methode als Veiligheid.tsx
// High-impact delicten wegen 2.5x zwaarder, benchmark: Nederland ~46 misdrijven/1000
function berekenVeiligheidScore(data: GebiedData): DimensieScore {
  const bevolking = data.bevolking.totaal;
  if (bevolking === 0) return getDefaultScore('Veiligheid & Overlast', 0.35);

  // Gewogen score: high-impact delicten wegen 2.5x zwaarder
  const highImpact = data.criminaliteit.geweld + data.criminaliteit.inbraakWoningen;
  const veelvoorkomend = data.criminaliteit.vermogen - data.criminaliteit.inbraakWoningen + data.criminaliteit.vernieling;

  const gewogenTotaal = (highImpact * 2.5) + veelvoorkomend;
  const gewogenPer1000 = (gewogenTotaal / bevolking) * 1000;
  const misdrijvenPer1000 = (data.criminaliteit.totaal / bevolking) * 1000;

  // Score berekening (0-10 schaal, dan * 10 voor 0-100):
  // 10 = 0 gewogen misdrijven per 1000
  // 7.5 = ~30 gewogen (veilig, onder gemiddeld)
  // 5.0 = ~60 gewogen (gemiddeld)
  // 2.5 = ~90 gewogen (onveilig)
  // 0 = 120+ gewogen (zeer onveilig)
  const score10 = Math.max(0, Math.min(10, 10 - (gewogenPer1000 / 12)));
  const score = score10 * 10; // naar 0-100 schaal

  return {
    naam: 'Veiligheid & Overlast',
    score: Math.round(score),
    classificatie: getClassificatie(score),
    gewicht: 0.35,
    isGemeten: true,
    indicatoren: [
      { naam: 'Totaal misdrijven', waarde: Math.round(misdrijvenPer1000), eenheid: 'per 1.000', gemiddelde: 46, zScore: 0 },
      { naam: 'High-impact (gewogen)', waarde: Math.round(gewogenPer1000 * 10) / 10, eenheid: 'per 1.000', gemiddelde: 60, zScore: 0 },
    ],
  };
}

function berekenVoorzieningenScore(bevolking: number, aantalVoorzieningen: number): DimensieScore {
  if (bevolking === 0) return getDefaultScore('Voorzieningen', 0.35);

  const voorzieningenPer1000 = (aantalVoorzieningen / bevolking) * 1000;
  const gemiddelde = 8;
  const stdDev = 4;

  const zScore = zScoreNormal(voorzieningenPer1000, gemiddelde, stdDev);
  const score = normalizeZScore(zScore);

  return {
    naam: 'Voorzieningen',
    score: Math.round(score),
    classificatie: getClassificatie(score),
    gewicht: 0.35,
    isGemeten: true,
    indicatoren: [
      { naam: 'Totaal voorzieningen', waarde: aantalVoorzieningen, eenheid: '', gemiddelde: 0, zScore: 0 },
      { naam: 'Inwoners', waarde: bevolking, eenheid: '', gemiddelde: 0, zScore: 0 },
      { naam: 'Per 1.000 inwoners', waarde: Math.round(voorzieningenPer1000 * 10) / 10, eenheid: '', gemiddelde: gemiddelde, zScore: Math.round(zScore * 100) / 100 },
    ],
  };
}

// Woningvoorraad: Alleen kooppercentage (zonder woningtype als negatieve factor)
// Later uit te breiden met BAG data (oppervlakte, bouwjaar, etc.)
function berekenWoningvoorraadScore(data: GebiedData): DimensieScore {
  const koopPercentage = data.woningen.koopPercentage;

  // Z-score t.o.v. Nederlands gemiddelde (57% koopwoningen)
  const zScore = zScoreNormal(koopPercentage, 57, 20);
  const score = normalizeZScore(zScore);

  return {
    naam: 'Woningvoorraad',
    score: Math.round(score),
    classificatie: getClassificatie(score),
    gewicht: 0.15,
    isGemeten: true,
    indicatoren: [
      { naam: 'Koopwoningen', waarde: Math.round(koopPercentage), eenheid: '%', gemiddelde: 57, zScore: Math.round(zScore * 100) / 100 },
    ],
  };
}

// Sociale Cohesie: Alleen bevolkingsdichtheid (logaritmisch)
// Huishoudsamenstelling is verwijderd uit Leefbaarometer 3.0 als stigmatiserend
// Later uit te breiden met mutatiegraad (verhuisbewegingen)
function berekenSocialeCohesieScore(data: GebiedData): DimensieScore {
  const dichtheid = data.bevolking.dichtheid;

  // Logaritmische schaal voor dichtheid (officiële methodiek)
  // Landelijk gemiddelde ~500/km², log10(500) ≈ 2.7
  // Lagere dichtheid = betere sociale cohesie
  const logDichtheid = Math.log10(Math.max(dichtheid, 1));
  const zScore = zScoreInverse(logDichtheid, 2.7, 0.8);
  const score = normalizeZScore(zScore);

  return {
    naam: 'Sociale Cohesie',
    score: Math.round(score),
    classificatie: getClassificatie(score),
    gewicht: 0.10,
    isGemeten: true,
    indicatoren: [
      { naam: 'Bevolkingsdichtheid', waarde: Math.round(dichtheid), eenheid: '/km²', gemiddelde: 500, zScore: Math.round(zScore * 100) / 100 },
    ],
  };
}

function berekenFysiekeOmgevingScore(): DimensieScore {
  return {
    naam: 'Fysieke Omgeving',
    score: 0,
    classificatie: 'ONVOLDOENDE',
    gewicht: 0.05,
    isGemeten: false,
    indicatoren: [],
  };
}

// Hoofdfunctie
export function berekenLeefbaarheidScore(
  data: GebiedData,
  aantalVoorzieningen: number = 0
): LeefbaarheidScore {
  const veiligheid = berekenVeiligheidScore(data);
  const voorzieningen = berekenVoorzieningenScore(data.bevolking.totaal, aantalVoorzieningen);
  const woningvoorraad = berekenWoningvoorraadScore(data);
  const socialeCohesie = berekenSocialeCohesieScore(data);
  const fysiekeOmgeving = berekenFysiekeOmgevingScore();

  // Totaalscore: gewogen gemiddelde van GEMETEN dimensies
  // Fysieke Omgeving (5%) wordt niet meegenomen
  const gemetenGewicht = 0.35 + 0.35 + 0.15 + 0.10; // = 0.95

  const totaalScore = (
    (veiligheid.score * 0.35) +
    (voorzieningen.score * 0.35) +
    (woningvoorraad.score * 0.15) +
    (socialeCohesie.score * 0.10)
  ) / gemetenGewicht;

  return {
    totaalScore: Math.round(totaalScore),
    classificatie: getClassificatie(totaalScore),
    dimensies: {
      veiligheid,
      voorzieningen,
      woningvoorraad,
      socialeCohesie,
      fysiekeOmgeving,
    },
  };
}
