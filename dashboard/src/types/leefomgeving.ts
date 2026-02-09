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
// Bron: CBS 86211NED (NL01) + CBS 85984NED (NL00, bevolking 17.942.942)
// Berekening: (stedelijkGroen 44.168 + sport 36.307 + recreatie 120.903 + natuur 548.689) = 750.067 ha
// m2/persoon: 750.067 * 10.000 / 17.942.942 = 418 m2 (alle groentypes)
// Groenpercentage: 750.067 / 4.154.337 * 100 = 18.1%
export const NL_LEEFOMGEVING_REFERENTIES = {
  m2GroenPerPersoon: 418,      // Alle groentypes (stedelijk + sport + recreatie + natuur) per inwoner
  groenPercentage: 18.1,       // Totaal groen als % van totale oppervlakte NL
};
