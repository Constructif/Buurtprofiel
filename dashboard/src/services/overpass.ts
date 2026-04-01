import { supabase } from './supabase';
import { logger } from '../utils/logger';

export interface Voorziening {
  id: string;
  type: VoorzieningType;
  name: string;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

export type VoorzieningType =
  | 'basisschool'
  | 'middelbare_school'
  | 'kinderdagverblijf'
  | 'supermarkt'
  | 'huisarts'
  | 'religieus_centrum'
  | 'sportvereniging'
  | 'speelterrein'
  | 'wijkcentrum';

/**
 * Haalt voorzieningen op binnen een bounding box via Supabase (PostGIS)
 */
export async function fetchVoorzieningen(
  bbox: [number, number, number, number]
): Promise<Voorziening[]> {
  const [south, west, north, east] = bbox;

  try {
    // Gebruik de PostGIS functie get_voorzieningen_in_bbox
    const { data, error } = await supabase
      .rpc('get_voorzieningen_in_bbox', {
        south,
        west,
        north,
        east,
      });

    if (error) {
      logger.error('Supabase voorzieningen error:', error);
      throw new Error(`Voorzieningen ophalen mislukt: ${error.message}`);
    }

    if (!data || data.length === 0) return [];

    // Converteer PostGIS response naar Voorziening objecten
    return data
      .map((row: { id: string; type: string; name: string; location: string; tags?: Record<string, string> }) => {
        // PostGIS geeft location terug als GeoJSON of WKT
        // De RPC functie retourneert de hele row incl. geometry
        // We moeten lat/lon extraheren uit de location
        let lat = 0;
        let lon = 0;

        if (typeof row.location === 'string') {
          // WKT format: POINT(lon lat) of SRID=4326;POINT(lon lat)
          const match = row.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
          if (match) {
            lon = parseFloat(match[1]);
            lat = parseFloat(match[2]);
          }
        } else if (row.location && typeof row.location === 'object') {
          // GeoJSON format: { type: "Point", coordinates: [lon, lat] }
          const geojson = row.location as { coordinates?: [number, number] };
          if (geojson.coordinates) {
            lon = geojson.coordinates[0];
            lat = geojson.coordinates[1];
          }
        }

        if (lat === 0 && lon === 0) return null;

        return {
          id: row.id,
          type: row.type as VoorzieningType,
          name: row.name,
          lat,
          lon,
          tags: row.tags ?? undefined,
        };
      })
      .filter((v: Voorziening | null): v is Voorziening => v !== null);
  } catch (error) {
    logger.error('Error fetching voorzieningen:', error);
    throw error;
  }
}

/**
 * Geeft een leesbaar label voor een voorziening type
 */
export function getTypeLabel(type: VoorzieningType): string {
  const labels: Record<VoorzieningType, string> = {
    basisschool: 'Basisschool',
    middelbare_school: 'Middelbare school',
    kinderdagverblijf: 'Kinderdagverblijf',
    supermarkt: 'Supermarkt',
    huisarts: 'Huisarts',
    religieus_centrum: 'Religieus centrum',
    sportvereniging: 'Sportvereniging',
    speelterrein: 'Speelterrein',
    wijkcentrum: 'Wijkcentrum',
  };

  return labels[type];
}

/**
 * Geeft een kleur voor een voorziening type
 */
export function getTypeColor(type: VoorzieningType): string {
  const colors: Record<VoorzieningType, string> = {
    basisschool: '#10b981',      // groen
    middelbare_school: '#3b82f6', // blauw
    kinderdagverblijf: '#f59e0b', // oranje
    supermarkt: '#8b5cf6',        // paars
    huisarts: '#ef4444',          // rood
    religieus_centrum: '#6366f1', // indigo
    sportvereniging: '#14b8a6',   // teal
    speelterrein: '#22c55e',      // lichtgroen
    wijkcentrum: '#ec4899',       // pink
  };

  return colors[type];
}

/**
 * Groepeer voorzieningen per type
 */
export function groupVoorzieningenByType(voorzieningen: Voorziening[]): Record<VoorzieningType, Voorziening[]> {
  const grouped: Record<VoorzieningType, Voorziening[]> = {
    basisschool: [],
    middelbare_school: [],
    kinderdagverblijf: [],
    supermarkt: [],
    huisarts: [],
    religieus_centrum: [],
    sportvereniging: [],
    speelterrein: [],
    wijkcentrum: [],
  };

  voorzieningen.forEach((v) => {
    grouped[v.type].push(v);
  });

  return grouped;
}
