/**
 * Import opleidingsniveau (CBS 86052NED) voor alle gebieden.
 * Bron: opendata.cbs.nl OData v4 API (TypedDataSet).
 * Let op: 86052NED heeft data voor 1 peiljaar, niet per jaar.
 */
const { supabase } = require('./supabase-client');

const CBS_URL = 'https://opendata.cbs.nl/ODataApi/odata/86052NED';

// Opleidingsniveau codes (uit 86052NED dimensie)
const NIVEAUS = [
  { code: '2018700', label: 'laag' },   // Basisonderwijs, vmbo, mbo1
  { code: '2018740', label: 'midden' }, // Havo, vwo, mbo2-4
  { code: '2018790', label: 'hoog' },   // Hbo, wo
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

async function main() {
  console.log('=== Opleiding Import (CBS 86052NED) ===');

  const validCodes = await fetchAllGebiedCodes();
  console.log(`${validCodes.size} geldige gebiedscodes`);

  // Haal data op per opleidingsniveau
  const gebiedData = {}; // code -> { laag, midden, hoog }

  for (const niveau of NIVEAUS) {
    console.log(`\nOphalen ${niveau.label} (${niveau.code})...`);
    let skip = 0;
    let total = 0;

    while (true) {
      const filter = `Opleidingsniveau eq '${niveau.code}' and Marges eq 'MW00000'`;
      const url = `${CBS_URL}/TypedDataSet?$filter=${encodeURIComponent(filter)}&$top=5000&$skip=${skip}&$format=json`;
      const response = await fetch(url);
      if (!response.ok) {
        console.log(`  API error: ${response.status} bij skip=${skip}`);
        break;
      }
      const json = await response.json();
      const items = json.value || [];

      for (const item of items) {
        const code = item.WijkenEnBuurten?.trim();
        if (!code) continue;
        if (!gebiedData[code]) gebiedData[code] = { laag: null, midden: null, hoog: null };
        gebiedData[code][niveau.label] = item.Bevolking15Tot75Jaar_2 ?? null;
      }

      total += items.length;
      if (items.length < 5000) break;
      skip += 5000;
      process.stdout.write(`  ${total} rijen...\r`);
    }
    console.log(`  ${total} rijen opgehaald`);
  }

  // Bouw rows en insert
  const codes = Object.keys(gebiedData);
  console.log(`\n${codes.length} gebieden met opleidingsdata`);

  // Dataset 86052NED is peiljaar 2023
  const jaar = 2023;

  const rows = [];
  for (const code of codes) {
    if (!validCodes.has(code)) continue;
    rows.push({
      code,
      jaar,
      ...gebiedData[code],
    });
  }

  console.log(`${rows.length} geldige rijen om te importeren`);

  const BATCH_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('opleiding').upsert(batch, { onConflict: 'code,jaar' });
    if (error) { console.error('Fout:', error.message); throw error; }
    inserted += batch.length;
    process.stdout.write(`  Geimporteerd: ${inserted}/${rows.length}\r`);
  }

  const { count } = await supabase.from('opleiding').select('*', { count: 'exact', head: true });
  console.log(`\n=== Klaar! ${count} opleiding rijen in Supabase ===`);
}

main();
