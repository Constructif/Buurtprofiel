export type ObservatieCategorie =
  | 'Gevel/Dak'
  | 'Groenvoorziening'
  | 'Infrastructuur'
  | 'Sociaal/Veiligheid'
  | 'Voorziening'
  | 'Overig';

export type RondeStatus = 'actief' | 'afgerond';

/** Het tijdens de ronde afgebakende gebied. Punten in [lat, lng]-volgorde (Leaflet). */
export interface GebiedPolygon {
  punten: [number, number][];
}

export interface Wijkronde {
  id: string;
  buurtcode: string;
  buurtnaam: string;
  medewerker: string;
  status: RondeStatus;
  aantal_observaties: number;
  started_at: string;
  finished_at: string | null;
  vragen_opgeslagen: boolean;
  vragen_observator: string | null;
  vragen_opgeslagen_at: string | null;
  gebied_polygon: GebiedPolygon | null;
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

/** Parse foto_path als JSON array of enkele waarde */
export function parseFotoPaths(fotoPad: string | null): string[] {
  if (!fotoPad) return [];
  try {
    const parsed = JSON.parse(fotoPad);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* niet JSON, enkele waarde */ }
  return [fotoPad];
}

/** Serialize foto paths naar JSON string */
export function serializeFotoPaths(paths: string[]): string | null {
  if (paths.length === 0) return null;
  if (paths.length === 1) return paths[0];
  return JSON.stringify(paths);
}

export interface WijkrondeAntwoord {
  id: string;
  buurtcode: string;
  ronde_id: string;
  vraag_id: string;
  antwoord: string;
  notitie: string | null;
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
