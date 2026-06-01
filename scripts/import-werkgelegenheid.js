/**
 * Import werkgelegenheid data voor alle gebieden, meerdere jaren.
 * Haalt arbeidsparticipatie, werknemers, zelfstandigen, vast/flexibel op.
 * Bron: CBS Kerncijfers datasets (zelfde als kerncijfers, andere measures).
 */
const { supabase } = require('./supabase-client');

const CBS_BASE_URL = 'https://datasets.cbs.nl/odata/v1/CBS';

// Werkgelegenheid measures
const MEASURES = [
  { code: 'M001796_2', field: 'arbeidsparticipatie' },
  { code: '2021320', field: 'werknemers' },
  { code: '2021380', field: 'zelfstandigen' },
  { code: '2021330', field: 'vast' },
  { code: '2021340', field: 'flexibel' },
];

// Kerncijfers datasets per jaar (werkgelegenheid zit in dezelfde dataset)
const DATASETS = [
  { jaar: 2020, id: '84799NED' },
  { jaar: 2021, id: '85039NED' },
  { jaar: 2022, id: '85318NED' },
  { jaar: 2023, id: '85618NED' },
  { jaar: 2024, id: '85984NED' },
];

async function fetchAllGebiedCodes() {
  let all = [];
  let from = 0;
  while (true) {
    const { data } = await supabase.from('gebieden').select('code').range(from, from + 999);
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return new Set(all.map(g => g.code));
}

async function fetchWerkgelegenheidForYear(datasetId, jaar) {
  console.log(`\n--- ${jaar} (${datasetId}) ---`);

  // Fetch per measure individueel om CBS 50k limiet te vermijden
  let allData = [];
  for (let i = 0; i < MEASURES.length; i++) {
    const m = MEASURES[i];
    let url = `${CBS_BASE_URL}/${datasetId}/Observations?$filter=${encodeURIComponent(`Measure eq '${m.code}'`)}&$select=Measure,Value,WijkenEnBuurten&$top=50000`;

    while (url) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`CBS API error: ${response.status}`);
      const json = await response.json();
      allData = allData.concat(json.value || []);
      url = json['@odata.nextLink'] || null;
    }
    process.stdout.write(`  Measure ${i + 1}/${MEASURES.length} (${allData.length} rijen)\r`);
  }

  console.log(`  ${allData.length} observaties opgehaald`);
  return allData;
}

async function main() {
  console.log('=== Werkgelegenheid Import (5 jaar) ===');

  const validCodes = await fetchAllGebiedCodes();
  console.log(`${validCodes.size} geldige gebiedscodes`);

  for (const ds of DATASETS) {
    try {
      const observations = await fetchWerkgelegenheidForYear(ds.id, ds.jaar);

      // Groepeer per gebied
      const grouped = {};
      for (const obs of observations) {
        const code = obs.WijkenEnBuurten;
        if (!code || code === 'NL00') continue;
        if (!grouped[code]) grouped[code] = {};
        const measure = MEASURES.find(m => m.code === obs.Measure);
        if (measure) {
          grouped[code][measure.field] = obs.Value ?? null;
        }
      }

      // Bouw rows
      const rows = [];
      for (const code of Object.keys(grouped)) {
        if (!validCodes.has(code)) continue;
        rows.push({
          code,
          jaar: ds.jaar,
          ...grouped[code],
        });
      }

      console.log(`  ${rows.length} gebieden met werkgelegenheidsdata`);

      // Batch upsert
      const BATCH_SIZE = 500;
      let inserted = 0;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('werkgelegenheid').upsert(batch, { onConflict: 'code,jaar' });
        if (error) { console.error('Fout:', error.message); throw error; }
        inserted += batch.length;
        process.stdout.write(`  Geimporteerd: ${inserted}/${rows.length}\r`);
      }
      console.log(`  Geimporteerd: ${inserted} gebieden voor ${ds.jaar}`);
    } catch (e) {
      console.error(`FOUT bij ${ds.jaar}:`, e.message);
    }
  }

  const { count } = await supabase.from('werkgelegenheid').select('*', { count: 'exact', head: true });
  console.log(`\n=== Klaar! ${count} werkgelegenheid rijen in Supabase ===`);
}

main();
