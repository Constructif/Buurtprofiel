export type ObservatieCategorie =
  | 'Gevel/Dak'
  | 'Groenvoorziening'
  | 'Infrastructuur'
  | 'Sociaal/Veiligheid'
  | 'Voorziening'
  | 'Overig';

export type RondeStatus = 'actief' | 'afgerond';

export interface Wijkronde {
  id: string;
  buurtcode: string;
  buurtnaam: string;
  medewerker: string;
  status: RondeStatus;
  aantal_observaties: number;
  started_at: string;
  finished_at: string | null;
}

export interface Wijkobservatie {
  id: string;
  buurtcode: string;
  lat: number;
  lng: number;
  categorie: ObservatieCategorie;
  opmerking: string | null;
  foto_url: string | null;
  foto_path: string | null;
  medewerker: string;
  ronde_id: string;
  created_at: string;
}

export interface WijkrondeAntwoord {
  id: string;
  buurtcode: string;
  ronde_id: string;
  vraag_id: string;
  antwoord: string;
  medewerker: string;
  created_at: string;
}

export type VraagType = 'score' | 'tekst' | 'ja-nee' | 'keuze' | 'datum-tijd' | 'auto-gebruiker';

export interface WijkrondeVraag {
  id: string;
  tekst: string;
  categorie: string;
  type: VraagType;
  /** Opties voor type 'keuze' (bijv. ['goed', 'matig', 'slecht']) */
  opties?: string[];
}

export const CATEGORIE_KLEUREN: Record<ObservatieCategorie, string> = {
  'Gevel/Dak': '#ef4444',
  'Groenvoorziening': '#22c55e',
  'Infrastructuur': '#3b82f6',
  'Sociaal/Veiligheid': '#f59e0b',
  'Voorziening': '#8b5cf6',
  'Overig': '#6b7280',
};

export const CATEGORIEEN: ObservatieCategorie[] = [
  'Gevel/Dak',
  'Groenvoorziening',
  'Infrastructuur',
  'Sociaal/Veiligheid',
  'Voorziening',
  'Overig',
];
