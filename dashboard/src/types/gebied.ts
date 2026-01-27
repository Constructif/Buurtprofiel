export type GebiedType = 'buurt' | 'wijk' | 'gemeente';

export interface Gebied {
  code: string;
  naam: string;
  type: GebiedType;
  wijkCode?: string;
  wijkNaam?: string;
  gemeenteCode?: string;
  gemeenteNaam?: string;
}

export interface BevolkingData {
  totaal: number;
  mannen: number;
  vrouwen: number;
  dichtheid: number;
  leeftijd_0_14: number;
  leeftijd_15_24: number;
  leeftijd_25_44: number;
  leeftijd_45_64: number;
  leeftijd_65_plus: number;
  nederlands: number;
  westers: number;
  nietWesters: number;
}

export interface HuishoudensData {
  totaal: number;
  eenpersoons: number;
  zonderKinderen: number;
  metKinderen: number;
  gemiddeldeGrootte: number;  // Gemiddeld aantal personen per huishouden
}

export interface WoningenData {
  totaal: number;
  koopPercentage: number;
  huurPercentage: number;
  huurSociaalPercentage: number;
  huurParticulierPercentage: number;
  // Woningtypes
  meergezinsPercentage: number;
  tussenwoningPercentage: number;
  hoekwoningPercentage: number;
  tweeOnderEenKapPercentage: number;
  vrijstaandPercentage: number;
}

export interface InkomenData {
  gemiddeld: number;
  laagInkomenPercentage: number;
  hoogInkomenPercentage: number;

  // Opleidingsniveau (15-75 jaar)
  laagOpgeleid: number | null;       // Basisonderwijs, vmbo, mbo1
  middelOpgeleid: number | null;     // Havo, vwo, mbo2-4
  hoogOpgeleid: number | null;       // Hbo, wo

  // Arbeidsparticipatie (15-75 jaar)
  arbeidsparticipatie: number | null;  // % van bevolking dat werkt
  werknemers: number | null;           // % in loondienst
  zelfstandigen: number | null;        // % zelfstandig ondernemer
  vastContract: number | null;         // % met vast dienstverband
  flexContract: number | null;         // % met flexibel dienstverband

  // Uitkeringen (aantallen)
  bijstandAantal: number | null;
  wwAantal: number | null;
  aoAantal: number | null;
  aowAantal: number | null;
}

export interface CriminaliteitData {
  totaal: number;
  // Hoofdcategorieën
  geweld: number;
  vermogen: number;
  vernieling: number;
  verkeer: number;
  // Vermogensdelicten detail
  inbraakWoningen: number;
  inbraakSchuur: number;
  dieftalAutos: number;
  dieftalUitAutos: number;
  dieftalFietsen: number;
  zakkenrollerij: number;
  dieftalOverigeVoertuigen: number;
  inbraakBedrijven: number;
  winkeldiefstal: number;
  overigeVermogen: number;
  // Geweldsdelicten detail
  zedenmisdrijf: number;
  moordDoodslag: number;
  mishandeling: number;
  bedreiging: number;
  openlijkGeweld: number;
  straatroof: number;
  overval: number;
  // Overlast categorieën
  drugsOverlast: number;
  burengerucht: number;
  huisvredebreuk: number;
  // Verkeer
  verkeersOngevallen: number;
  rijdenOnderInvloed: number;
  // Overige
  fraude: number;
  brandOntploffing: number;
  aantastingOpenbareOrde: number;
  cybercrime: number;
}

export interface CriminaliteitTrendJaar {
  jaar: number;
  totaal: number;
  vermogen: number;
  geweld: number;
  vernieling: number;
  verkeer?: number;
}

export interface CriminaliteitTrend {
  jaren: CriminaliteitTrendJaar[];
}

export interface VeiligheidsScoreVergelijking {
  buurt?: { score: number; naam: string };
  wijk?: { score: number; naam: string };
  gemeente?: { score: number; naam: string };
  nederland?: { score: number; naam: string };
}

export interface BevolkingsDynamiekJaar {
  jaar: number;
  geboorte: number;
  sterfte: number;
  vestiging?: number;  // Alleen voor gemeenten
  vertrek?: number;    // Alleen voor gemeenten
  saldo: number;       // geboorte - sterfte + vestiging - vertrek
}

export interface BevolkingsDynamiek {
  jaren: BevolkingsDynamiekJaar[];
  // Per 1000 inwoners (relatief)
  geboortePer1000?: number;
  sterftePer1000?: number;
}

// Herkomstland data per gemeente (via PC4 dataset 85640NED)
export interface HerkomstLandItem {
  land: string;
  code: string;
  aantal: number;
}

export interface HerkomstLandData {
  totaal: number;
  landen: HerkomstLandItem[];
  dataJaar?: number;
  // Gemeente bevolkingsdata voor correcte percentages
  gemeenteBevolking?: {
    totaal: number;
    nederlands: number;
    westers: number;
    nietWesters: number;
  };
}

// Jeugdzorg en WMO data (CBS Kerncijfers 85984NED)
export interface JeugdzorgWmoData {
  jeugdzorgAantal: number | null;      // JongerenMetJeugdzorgInNatura_91
  jeugdzorgPercentage: number | null;  // PercentageJongerenMetJeugdzorg_92
  wmoAantal: number | null;            // WmoClienten_93
  wmoPer1000: number | null;           // WmoClientenRelatief_94
}

export interface GebiedData {
  code: string;
  naam: string;
  bevolking: BevolkingData;
  huishoudens: HuishoudensData;
  woningen: WoningenData;
  inkomen: InkomenData;
  criminaliteit: CriminaliteitData;
  criminaliteitTrend?: CriminaliteitTrend;
  veiligheidsVergelijking?: VeiligheidsScoreVergelijking;
  bevolkingsDynamiek?: BevolkingsDynamiek;
  herkomstLandGemeente?: HerkomstLandData;  // Gedetailleerde herkomst per land (alleen gemeente)
  jeugdzorgWmo?: JeugdzorgWmoData;  // Jeugdzorg en WMO data
  gemeenteNaam?: string;  // Voor weergave bij verhuisbewegingen
  dataJaar?: number;  // Criminaliteit jaar
  kerncijfersJaar?: number;  // Kerncijfers jaar (demografisch, woningen, etc.)
}
