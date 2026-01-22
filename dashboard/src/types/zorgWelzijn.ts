// RIVM Gezondheidsmonitor data (50120NED)

export interface EenzaamheidData {
  totaal: number | null;           // Eenzaam_27 - % eenzaam (score 3+)
  ernstig: number | null;          // ErnstigZeerErnstigEenzaam_28 - % ernstig eenzaam
  emotioneel: number | null;       // EmotioneelEenzaam_29 - % emotioneel eenzaam
  sociaal: number | null;          // SociaalEenzaam_30 - % sociaal eenzaam (vanaf 2016)
}

export interface MentaleGezondheidData {
  angstDepressie: number | null;     // HoogRisicoOpAngstOfDepressie_25
  psychischeKlachten: number | null; // PsychischeKlachten_20 (alleen 2022)
  stress: number | null;             // HeelVeelStressInAfgelopen4Weken_26 (vanaf 2020)
  emotioneleSteun: number | null;    // MistEmotioneleSteun_23 (alleen 2022)
  veerkracht: number | null;         // ZeerLageVeerkracht_21 (alleen 2022)
}

export interface ZorgOndersteuningData {
  mantelzorger: number | null;          // Mantelzorger_31 (vanaf 2016)
  vrijwilligerswerk: number | null;     // Vrijwilligerswerk_32 (vanaf 2016)
  ervarenGezondheid: number | null;     // ErvarenGezondheidGoedZeerGoed_4
  langdurigeAandoeningen: number | null; // EenOfMeerLangdurigeAandoeningen_16
  beperkt: number | null;               // BeperktVanwegeGezondheid_17 (vanaf 2020)
  moeiteRondkomen: number | null;       // MoeiteMetRondkomen_33
}

// Trend data per jaar
export interface ZorgTrendJaar {
  jaar: number;
  eenzaam: number | null;
  ernstigEenzaam: number | null;
  angstDepressie: number | null;
}

export interface ZorgTrend {
  jaren: ZorgTrendJaar[];
}

// Vergelijking op verschillende niveaus
export interface ZorgVergelijkingNiveau {
  naam: string;
  eenzaam: number | null;
}

export interface ZorgVergelijking {
  buurt?: ZorgVergelijkingNiveau;
  wijk?: ZorgVergelijkingNiveau;
  gemeente?: ZorgVergelijkingNiveau;
  nederland: ZorgVergelijkingNiveau;
}

// Complete Zorg & Welzijn data
export interface ZorgWelzijnData {
  eenzaamheid: EenzaamheidData;
  mentaleGezondheid: MentaleGezondheidData;
  zorgOndersteuning: ZorgOndersteuningData;
  trend: ZorgTrend;
  vergelijking: ZorgVergelijking;
  dataJaar: number;
}

// Raw RIVM API response type
export interface RIVMRawData {
  WijkenEnBuurten: string;
  Gemeentenaam_1: string;
  SoortRegio_2: string;
  Codering_3: string;
  Perioden: string;
  // Eenzaamheid
  Eenzaam_27: number | null;
  ErnstigZeerErnstigEenzaam_28: number | null;
  EmotioneelEenzaam_29: number | null;
  SociaalEenzaam_30: number | null;
  // Mentale gezondheid
  HoogRisicoOpAngstOfDepressie_25: number | null;
  PsychischeKlachten_20: number | null;
  HeelVeelStressInAfgelopen4Weken_26: number | null;
  MistEmotioneleSteun_23: number | null;
  ZeerLageVeerkracht_21: number | null;
  // Zorg & Ondersteuning
  Mantelzorger_31: number | null;
  Vrijwilligerswerk_32: number | null;
  ErvarenGezondheidGoedZeerGoed_4: number | null;
  EenOfMeerLangdurigeAandoeningen_16: number | null;
  BeperktVanwegeGezondheid_17: number | null;
  MoeiteMetRondkomen_33: number | null;
}
