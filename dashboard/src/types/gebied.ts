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
}

export interface WoningenData {
  totaal: number;
  koopPercentage: number;
  huurPercentage: number;
  huurSociaalPercentage: number;
  huurParticulierPercentage: number;
}

export interface InkomenData {
  gemiddeld: number;
  laagInkomenPercentage: number;
  hoogInkomenPercentage: number;
}

export interface CriminaliteitData {
  totaal: number;
  geweld: number;
  vermogen: number;
  vernieling: number;
  inbraakWoningen: number;
  dieftalAutos: number;
  dieftalUitAutos: number;
}

export interface GebiedData {
  code: string;
  naam: string;
  bevolking: BevolkingData;
  huishoudens: HuishoudensData;
  woningen: WoningenData;
  inkomen: InkomenData;
  criminaliteit: CriminaliteitData;
}
