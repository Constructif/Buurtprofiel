/**
 * Import voorzieningen (OSM/Overpass) voor heel Nederland.
 * Haalt alle 9 types op via de Overpass API en slaat ze op in Supabase.
 * PostGIS Point geometrie voor spatial queries.
 *
 * NB: Overpass heeft rate limits, dus we doen dit per type met pauzes.
 * Bbox heel NL: 50.75, 3.37, 53.47, 7.21
 */
const { supabase } = require('./supabase-client');

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// NL bbox
const NL_BBOX = [50.75, 3.37, 53.47, 7.21]; // south, west, north, east

// Queries per type
const QUERIES = [
  {
    type: 'school',
    query: (s, w, n, e) => `
      [out:json][timeout:300];
      (
        node["amenity"="school"](${s},${w},${n},${e});
        way["amenity"="school"](${s},${w},${n},${e});
        relation["amenity"="school"](${s},${w},${n},${e});
      );
      out center;
    `
  },
  {
    type: 'kinderdagverblijf',
    query: (s, w, n, e) => `
      [out:json][timeout:300];
      (
        node["amenity"="kindergarten"](${s},${w},${n},${e});
        way["amenity"="kindergarten"](${s},${w},${n},${e});
        relation["amenity"="kindergarten"](${s},${w},${n},${e});
      );
      out center;
    `
  },
  {
    type: 'supermarkt',
    query: (s, w, n, e) => `
      [out:json][timeout:300];
      (
        node["shop"="supermarket"](${s},${w},${n},${e});
        way["shop"="supermarket"](${s},${w},${n},${e});
        relation["shop"="supermarket"](${s},${w},${n},${e});
      );
      out center;
    `
  },
  {
    type: 'huisarts',
    query: (s, w, n, e) => `
      [out:json][timeout:300];
      (
        node["amenity"="doctors"](${s},${w},${n},${e});
        way["amenity"="doctors"](${s},${w},${n},${e});
        relation["amenity"="doctors"](${s},${w},${n},${e});
      );
      out center;
    `
  },
  {
    type: 'religieus_centrum',
    query: (s, w, n, e) => `
      [out:json][timeout:300];
      (
        node["amenity"="place_of_worship"](${s},${w},${n},${e});
        way["amenity"="place_of_worship"](${s},${w},${n},${e});
        relation["amenity"="place_of_worship"](${s},${w},${n},${e});
      );
      out center;
    `
  },
  {
    type: 'sportvereniging',
    query: (s, w, n, e) => `
      [out:json][timeout:300];
      (
        node["leisure"="sports_centre"](${s},${w},${n},${e});
        way["leisure"="sports_centre"](${s},${w},${n},${e});
        relation["leisure"="sports_centre"](${s},${w},${n},${e});
      );
      out center;
    `
  },
  {
    type: 'speelterrein',
    query: (s, w, n, e) => `
      [out:json][timeout:300];
      (
        node["leisure"="pitch"](${s},${w},${n},${e});
        way["leisure"="pitch"](${s},${w},${n},${e});
        relation["leisure"="pitch"](${s},${w},${n},${e});
      );
      out center;
    `
  },
  {
    type: 'wijkcentrum',
    query: (s, w, n, e) => `
      [out:json][timeout:300];
      (
        node["amenity"="community_centre"](${s},${w},${n},${e});
        way["amenity"="community_centre"](${s},${w},${n},${e});
        relation["amenity"="community_centre"](${s},${w},${n},${e});
      );
      out center;
    `
  },
];

// School type bepaling (zelfde logica als overpass.ts)
function determineSchoolType(tags) {
  const schoolType = tags['school:type'];
  const iscedLevel = tags['isced:level'];
  const name = (tags.name || tags['name:nl'] || '').toLowerCase();

  // Middelbare school
  if (schoolType === 'secondary' || iscedLevel?.match?.(/^3/)) {
    return 'middelbare_school';
  }
  if (name.includes('vmbo') || name.includes('havo') || name.includes('vwo') ||
      name.includes('mavo') || name.includes('gymnasium') || name.includes('lyceum') ||
      name.includes('college') || name.includes('scholengemeenschap')) {
    return 'middelbare_school';
  }

  // Basisschool
  if (schoolType === 'primary' || iscedLevel?.match?.(/^[0-2]$/)) {
    return 'basisschool';
  }
  if (name.includes('basisschool') || name.includes('obs') || name.includes('cbs') ||
      name.includes('openbare school') || name.includes('katholieke school')) {
    return 'basisschool';
  }

  // Onbekend school type — skip
  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchOverpass(query) {
  const response = await fetch(OVERPASS_API, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (response.status === 429) {
    console.log('  Rate limited, wacht 60 seconden...');
    await sleep(60000);
    return fetchOverpass(query);
  }

  if (!response.ok) {
    throw new Error(`Overpass error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function main() {
  console.log('=== Voorzieningen Import (Overpass/OSM) ===');
  console.log(`Bbox: ${NL_BBOX.join(', ')}\n`);

  let totalInserted = 0;

  for (const queryDef of QUERIES) {
    console.log(`\n--- ${queryDef.type} ---`);

    try {
      const [s, w, n, e] = NL_BBOX;
      const queryStr = queryDef.query(s, w, n, e);
      const data = await fetchOverpass(queryStr);
      const elements = data.elements || [];
      console.log(`  ${elements.length} elementen opgehaald`);

      const rows = [];
      for (const el of elements) {
        // Bepaal coördinaten
        let lat, lon;
        if (el.lat && el.lon) {
          lat = el.lat;
          lon = el.lon;
        } else if (el.center) {
          lat = el.center.lat;
          lon = el.center.lon;
        } else {
          continue;
        }

        const tags = el.tags || {};

        // Bepaal type
        let type;
        if (queryDef.type === 'school') {
          type = determineSchoolType(tags);
          if (!type) continue; // Skip onbekende scholen
        } else {
          type = queryDef.type;
        }

        // Bepaal naam
        const name = tags.name || tags['name:nl'] || `${type} (geen naam)`;

        // PostGIS Point format: SRID=4326;POINT(lon lat)
        const location = `SRID=4326;POINT(${lon} ${lat})`;

        rows.push({
          id: `${el.type}-${el.id}`,
          type,
          name,
          location,
          tags,
        });
      }

      console.log(`  ${rows.length} geldige voorzieningen`);

      // Batch upsert
      const BATCH_SIZE = 500;
      let inserted = 0;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('voorzieningen').upsert(batch, { onConflict: 'id' });
        if (error) {
          console.error(`  Fout bij batch:`, error.message);
          // Probeer per rij bij fout
          if (error.message.includes('geometry')) {
            console.log('  Probeer per rij...');
            for (const row of batch) {
              const { error: rowError } = await supabase.from('voorzieningen').upsert(row, { onConflict: 'id' });
              if (!rowError) inserted++;
            }
            continue;
          }
          throw error;
        }
        inserted += batch.length;
        process.stdout.write(`  Geimporteerd: ${inserted}/${rows.length}\r`);
      }
      console.log(`  Geimporteerd: ${inserted} ${queryDef.type}`);
      totalInserted += inserted;

      // Wacht even tussen queries om rate limiting te voorkomen
      console.log('  Wacht 10 seconden...');
      await sleep(10000);

    } catch (e) {
      console.error(`  FOUT bij ${queryDef.type}:`, e.message);
    }
  }

  const { count } = await supabase.from('voorzieningen').select('*', { count: 'exact', head: true });
  console.log(`\n=== Klaar! ${count} voorzieningen in Supabase (${totalInserted} nieuw) ===`);
}

main();
