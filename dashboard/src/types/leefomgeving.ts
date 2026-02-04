// Leefomgeving data types

// Bodemgebruik data (CBS 86211NED)
export interface BodemgebruikData {
  totaalOppervlakte: number | null;      // Totale oppervlakte in hectares
  stedelijkGroen: number | null;          // Stedelijk groen in hectares
  sportterrein: number | null;            // Sportterreinen in hectares
  recreatiefTerrein: number | null;       // Recreatief terrein in hectares
  natuurlijkTerrein: number | null;       // Natuurlijk terrein (bos etc.) in hectares
}

// Groenpercentage data (RIVM/Atlas Natuurlijk Kapitaal)
export interface GroenpercentageData {
  percentage: number | null;              // Groenpercentage van het oppervlak
}

// Berekende groen metrics
export interface GroenMetrics {
  m2GroenPerPersoon: number | null;       // Vierkante meter groen per inwoner
  groenPercentage: number | null;         // Percentage groen
  totaalGroenHa: number | null;           // Totaal groen in hectares
}

// Vergelijking tussen gebiedsniveaus
export interface LeefomgevingVergelijkingNiveau {
  naam: string;
  m2PerPersoon: number | null;
  groenPercentage: number | null;
}

export interface LeefomgevingVergelijking {
  buurt?: LeefomgevingVergelijkingNiveau;
  wijk?: LeefomgevingVergelijkingNiveau;
  gemeente?: LeefomgevingVergelijkingNiveau;
  nederland: LeefomgevingVergelijkingNiveau;
}

// Complete Leefomgeving data
export interface LeefomgevingData {
  bodemgebruik: BodemgebruikData;
  groenpercentage: GroenpercentageData;
  metrics: GroenMetrics;
  vergelijking: LeefomgevingVergelijking;
  dataJaar: number;
  isGemeenteNiveau?: boolean; // True als bodemgebruik data op gemeente-niveau is (buurt/wijk selectie)
}

// NL referentiewaarden voor vergelijking
export const NL_LEEFOMGEVING_REFERENTIES = {
  m2GroenPerPersoon: 150,      // Gemiddeld m2 groen per persoon in NL (schatting)
  groenPercentage: 18.5,       // Gemiddeld groenpercentage in NL (stedelijk)
};
