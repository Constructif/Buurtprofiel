/**
 * Import leefomgeving data:
 * 1. Bodemgebruik (CBS 86211NED) — gemeente-niveau, meerdere jaren
 * 2. Groenpercentage (RIVM WFS) — buurt/wijk/gemeente niveau, 2022
 */
const { supabase } = require('./supabase-client');

const CBS_BASE_URL = 'https://datasets.cbs.nl/odata/v1/CBS';
const RIVM_WFS_BASE = 'https://data.rivm.nl/geo/ank/wfs';

// ==========================================
// DEEL 1: Bodemgebruik (86211NED)
// ==========================================

// Measure codes voor bodemgebruik
const BODEM_MEASURES = [
  { code: 'T001455', field: 'totaal_oppervlakte' },   // Totaal Land en water (ha)
  { code: 'A052552', field: 'stedelijk_groen' },       // Stedelijk groen (ha)
  { code: 'A045816', field: 'sportterrein' },          // Sportterrein (ha)
  { code: 'A045814_2', field: 'recreatief_terrein' },  // Recreatief terrein (ha)
  { code: 'A045823_2', field: 'natuurlijk_terrein' },  // Natuurlijk terrein (ha)
];

async function fetchGemeenteCodes() {
  let all = [];
  let from = 0;
  while (true) {
    const { data } = await supabase.from('gebieden').select('code').eq('type', 'gemeente').range(from, from + 999);
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all.map(g => g.code);
}

async function importBodemgebruik() {
  console.log('\n=== Bodemgebruik Import (86211NED) ===');

  const gemeenteCodes = await fetchGemeenteCodes();
  const gemeenteSet = new Set(gemeenteCodes);
  console.log(`${gemeenteCodes.length} gemeenten`);

  // 86211NED is CBS OData v1 API — per measure ophalen om 50k limiet te vermijden
  let allData = [];
  for (let mi = 0; mi < BODEM_MEASURES.length; mi++) {
    const m = BODEM_MEASURES[mi];
    let url = `${CBS_BASE_URL}/86211NED/Observations?$filter=${encodeURIComponent(`Measure eq '${m.code}'`)}&$select=Measure,Value,AlleRegioIndelingen&$top=50000`;

    while (url) {
      const response = await fetch(url);
      if (!response.ok) { console.log(`API error: ${response.status}`); break; }
      const json = await response.json();
      allData = allData.concat(json.value || []);
      url = json['@odata.nextLink'] || null;
    }
    process.stdout.write(`  Measure ${mi + 1}/${BODEM_MEASURES.length} (${allData.length} rijen)\r`);
  }
  console.log(`  ${allData.length} observaties opgehaald`);

  // Groepeer per gemeente
  const grouped = {};
  for (const obs of allData) {
    const code = obs.AlleRegioIndelingen?.trim();
    if (!code || !code.startsWith('GM')) continue;
    if (!grouped[code]) grouped[code] = {};
    const measure = BODEM_MEASURES.find(m => m.code === obs.Measure);
    if (measure) {
      grouped[code][measure.field] = obs.Value ?? null;
    }
  }

  // Dataset 86211NED is 1 peiljaar — check welk jaar
  // Default to 2022 (known)
  const jaar = 2022;

  const rows = [];
  for (const [code, data] of Object.entries(grouped)) {
    if (!gemeenteSet.has(code)) continue;
    rows.push({
      gemeente_code: code,
      jaar,
      ...data,
    });
  }

  console.log(`  ${rows.length} gemeenten met bodemgebruik data`);

  const BATCH_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('bodemgebruik').upsert(batch, { onConflict: 'gemeente_code,jaar' });
    if (error) { console.error('Fout:', error.message); throw error; }
    inserted += batch.length;
  }

  const { count } = await supabase.from('bodemgebruik').select('*', { count: 'exact', head: true });
  console.log(`  Bodemgebruik klaar! ${count} rijen`);
}

// ==========================================
// DEEL 2: Groenpercentage (RIVM WFS)
// ==========================================

async function fetchAllGebiedCodes() {
  let all = [];
  let from = 0;
  while (true) {
    const { data } = await supabase.from('gebieden').select('code,type').range(from, from + 999);
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function importGroenpercentage() {
  console.log('\n=== Groenpercentage Import (RIVM WFS) ===');

  const gebieden = await fetchAllGebiedCodes();
  console.log(`${gebieden.length} gebieden totaal`);

  // Per gebiedstype een andere WFS layer
  const layers = {
    buurt: { layer: 'rivm_2022_groenpercentage_kaart_per_buurt', codeField: 'bu_code' },
    wijk: { layer: 'rivm_2022_groenpercentage_kaart_per_wijk', codeField: 'wk_code' },
    gemeente: { layer: 'rivm_2022_groenpercentage_kaart_per_gemeente', codeField: 'gm_code' },
  };

  const rows = [];

  for (const [type, config] of Object.entries(layers)) {
    console.log(`\nOphalen ${type} groenpercentages...`);

    // WFS GetFeature met alle features in 1 call
    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: `ank:${config.layer}`,
      outputFormat: 'application/json',
      propertyName: `${config.codeField},_mean`,
      count: '50000',
    });

    try {
      const response = await fetch(`${RIVM_WFS_BASE}?${params}`);
      if (!response.ok) {
        console.log(`  WFS error: ${response.status}`);
        continue;
      }

      const geojson = await response.json();
      const features = geojson.features || [];
      console.log(`  ${features.length} features opgehaald`);

      for (const feature of features) {
        const code = feature.properties?.[config.codeField];
        const mean = feature.properties?._mean;
        if (!code) continue;

        rows.push({
          code,
          jaar: 2022,
          percentage: mean !== null && mean !== undefined ? Math.round(mean * 10) / 10 : null,
        });
      }
    } catch (e) {
      console.error(`  Fout bij ${type}:`, e.message);
    }
  }

  console.log(`\n${rows.length} gebieden met groenpercentage data`);

  // Filter op geldige codes
  const validCodes = new Set(gebieden.map(g => g.code));
  const validRows = rows.filter(r => validCodes.has(r.code));
  console.log(`${validRows.length} geldige rijen`);

  // Batch upsert
  const BATCH_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('groenpercentage').upsert(batch, { onConflict: 'code,jaar' });
    if (error) { console.error('Fout:', error.message); throw error; }
    inserted += batch.length;
    process.stdout.write(`  Geimporteerd: ${inserted}/${validRows.length}\r`);
  }

  const { count } = await supabase.from('groenpercentage').select('*', { count: 'exact', head: true });
  console.log(`\n  Groenpercentage klaar! ${count} rijen`);
}

// ==========================================
// MAIN
// ==========================================

async function main() {
  console.log('=== Leefomgeving Import ===');

  await importBodemgebruik();
  await importGroenpercentage();

  console.log('\n=== Alles klaar! ===');
}

main();
