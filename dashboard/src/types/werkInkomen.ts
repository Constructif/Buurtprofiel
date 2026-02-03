// Opleidingsniveau data (CBS 85984NED)
export interface OpleidingsniveauData {
  laag: number | null;    // Basisonderwijs, vmbo, mbo1 (2018700)
  midden: number | null;  // Havo, vwo, mbo2-4 (2018740)
  hoog: number | null;    // Hbo, wo (2018790)
}

// Werkgelegenheid data (CBS 85984NED)
export interface WerkgelegenheidData {
  arbeidsparticipatie: number | null;  // Netto arbeidsparticipatie % (M001796_2)
  werknemers: number | null;           // % Werknemers (2021320)
  zelfstandigen: number | null;        // % Zelfstandigen (2021380)
  vast: number | null;                 // % Werknemers vast contract (2021330)
  flexibel: number | null;             // % Werknemers flexibel contract (2021340)
}

// Uitkeringen data (CBS 86003NED)
export interface UitkeringenData {
  bijstand: number | null;        // Personen met bijstand
  ww: number | null;              // Personen met WW
  ao: number | null;              // Personen met AO (arbeidsongeschiktheid)
  aow: number | null;             // Personen met AOW
  bijstandPer1000: number | null; // Per 1000 inwoners
  wwPer1000: number | null;       // Per 1000 inwoners
  aoPer1000: number | null;       // Per 1000 inwoners
}

// Gecombineerde Werk & Inkomen data
export interface WerkInkomenData {
  opleiding: OpleidingsniveauData;
  opleidingIsGemeenteData?: boolean;       // true als gemeente-fallback wordt gebruikt
  werkgelegenheid: WerkgelegenheidData;
  werkgelegenheidIsGemeenteData?: boolean; // true als gemeente-fallback wordt gebruikt
  werkgelegenheidGemeenteNaam?: string;    // Naam van de gemeente voor fallback display
  uitkeringen: UitkeringenData;
  dataJaar: number;
}

// Vergelijking tussen gebiedsniveaus
export interface WerkInkomenVergelijking {
  buurt?: {
    naam: string;
    gemiddeldInkomen: number | null;
    laagInkomen: number | null;
    hoogInkomen: number | null;
    arbeidsparticipatie: number | null;
  };
  wijk?: {
    naam: string;
    gemiddeldInkomen: number | null;
    laagInkomen: number | null;
    hoogInkomen: number | null;
    arbeidsparticipatie: number | null;
  };
  gemeente?: {
    naam: string;
    gemiddeldInkomen: number | null;
    laagInkomen: number | null;
    hoogInkomen: number | null;
    arbeidsparticipatie: number | null;
  };
  nederland?: {
    naam: string;
    gemiddeldInkomen: number | null;
    laagInkomen: number | null;
    hoogInkomen: number | null;
    arbeidsparticipatie: number | null;
  };
}
