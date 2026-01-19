const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

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

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

/**
 * Haalt voorzieningen op binnen een bounding box via de Overpass API
 */
export async function fetchVoorzieningen(
  bbox: [number, number, number, number]
): Promise<Voorziening[]> {
  const [south, west, north, east] = bbox;

  // Overpass query voor alle voorzieningen
  const query = `
    [out:json][timeout:60];
    (
      // Alle scholen - we filteren later in JavaScript
      node["amenity"="school"](${south},${west},${north},${east});
      way["amenity"="school"](${south},${west},${north},${east});
      relation["amenity"="school"](${south},${west},${north},${east});

      // Kinderdagverblijven
      node["amenity"="kindergarten"](${south},${west},${north},${east});
      way["amenity"="kindergarten"](${south},${west},${north},${east});
      relation["amenity"="kindergarten"](${south},${west},${north},${east});

      // Supermarkten
      node["shop"="supermarket"](${south},${west},${north},${east});
      way["shop"="supermarket"](${south},${west},${north},${east});
      relation["shop"="supermarket"](${south},${west},${north},${east});

      // Huisartsen
      node["amenity"="doctors"](${south},${west},${north},${east});
      way["amenity"="doctors"](${south},${west},${north},${east});
      relation["amenity"="doctors"](${south},${west},${north},${east});

      // Religieuze centra
      node["amenity"="place_of_worship"](${south},${west},${north},${east});
      way["amenity"="place_of_worship"](${south},${west},${north},${east});
      relation["amenity"="place_of_worship"](${south},${west},${north},${east});

      // Sportverenigingen en sportcentra (alleen centres, geen individuele velden)
      node["leisure"="sports_centre"](${south},${west},${north},${east});
      way["leisure"="sports_centre"](${south},${west},${north},${east});
      relation["leisure"="sports_centre"](${south},${west},${north},${east});

      // Speelterreinen en sportvelden
      node["leisure"="pitch"](${south},${west},${north},${east});
      way["leisure"="pitch"](${south},${west},${north},${east});
      relation["leisure"="pitch"](${south},${west},${north},${east});

      // Wijkcentra
      node["amenity"="community_centre"](${south},${west},${north},${east});
      way["amenity"="community_centre"](${south},${west},${north},${east});
      relation["amenity"="community_centre"](${south},${west},${north},${east});
    );
    out center;
  `;

  // Maak een AbortController voor timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 seconden timeout

  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      body: query,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data: OverpassResponse = await response.json();

    return data.elements
      .map((element) => parseElement(element))
      .filter((v): v is Voorziening => v !== null);
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Overpass API timeout na 45 seconden');
      throw new Error('Timeout: Overpass API reageerde niet binnen 45 seconden');
    }

    console.error('Error fetching voorzieningen:', error);
    throw error; // Gooi error door zodat retry logica in store kan werken
  }
}

/**
 * Converteert een Overpass element naar een Voorziening object
 */
function parseElement(element: OverpassElement): Voorziening | null {
  const tags = element.tags || {};

  // Bepaal coördinaten
  let lat: number;
  let lon: number;

  if (element.lat && element.lon) {
    lat = element.lat;
    lon = element.lon;
  } else if (element.center) {
    lat = element.center.lat;
    lon = element.center.lon;
  } else {
    return null;
  }

  // Bepaal voorziening type
  const type = determineVoorzieningType(tags);
  if (!type) return null;

  // Bepaal naam
  const name = tags.name || tags['name:nl'] || `${getTypeLabel(type)} (geen naam)`;

  return {
    id: `${element.type}-${element.id}`,
    type,
    name,
    lat,
    lon,
    tags,
  };
}

/**
 * Bepaalt het voorziening type op basis van OSM tags
 */
function determineVoorzieningType(tags: Record<string, string>): VoorzieningType | null {
  const amenity = tags.amenity;
  const shop = tags.shop;
  const leisure = tags.leisure;

  // Scholen
  if (amenity === 'school') {
    const schoolType = tags['school:type'];
    const iscedLevel = tags['isced:level'];
    const name = (tags.name || tags['name:nl'] || '').toLowerCase();

    // Check voor middelbare school
    if (schoolType === 'secondary' || iscedLevel?.match(/^3/)) {
      return 'middelbare_school';
    }

    // Check naam voor hints over middelbare school
    if (name.includes('vmbo') || name.includes('havo') || name.includes('vwo') ||
        name.includes('mavo') || name.includes('gymnasium') || name.includes('lyceum') ||
        name.includes('college') || name.includes('scholengemeenschap')) {
      return 'middelbare_school';
    }

    // Check voor basisschool
    if (schoolType === 'primary' || iscedLevel?.match(/^[0-2]$/)) {
      return 'basisschool';
    }

    // Check naam voor hints over basisschool
    if (name.includes('basisschool') || name.includes('obs') || name.includes('cbs') ||
        name.includes('openbare school') || name.includes('katholieke school')) {
      return 'basisschool';
    }

    // Als type onduidelijk blijft, return null zodat het niet automatisch als basisschool wordt aangemerkt
    return null;
  }

  // Kinderdagverblijf
  if (amenity === 'kindergarten') {
    return 'kinderdagverblijf';
  }

  // Supermarkt
  if (shop === 'supermarket') {
    return 'supermarkt';
  }

  // Huisarts
  if (amenity === 'doctors') {
    return 'huisarts';
  }

  // Religieus centrum
  if (amenity === 'place_of_worship') {
    return 'religieus_centrum';
  }

  // Sport
  if (leisure === 'sports_centre') {
    return 'sportvereniging';
  }

  // Speelterrein
  if (leisure === 'pitch') {
    return 'speelterrein';
  }

  // Wijkcentrum
  if (amenity === 'community_centre') {
    return 'wijkcentrum';
  }

  return null;
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
