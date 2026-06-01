/**
 * Import herkomstland data uit CBS Kerncijfers Wijken & Buurten.
 *
 * De kerncijfers datasets bevatten migratieachtergrond op buurt/wijk/gemeente niveau:
 * - Westers totaal, Niet-westers totaal
 * - Marokko, Turkije, Suriname, Ned. Antillen & Aruba, Overig niet-westers
 *
 * Dit is beperkt tot 5 herkomstgroepen, maar beschikbaar op alle gebiedsniveaus.
 * De gedetailleerde per-land data (85640NED) is alleen op PC4-niveau beschikbaar.
 *
 * We slaan dit op per gemeente (aggregaat), met de beschikbare herkomstgroepen.
 *
 * Bevolkingsdynamiek is al apart geimporteerd (37230ned).
 */
const { supabase } = require('./supabase-client');

const CBS_BASE_URL = 'https://opendata.cbs.nl/ODataApi/odata';

// Kerncijfers dataset IDs per jaar
const DATASETS = [
  { jaar: 2020, id: '84799NED' },
  { jaar: 2021, id: '85039NED' },
  { jaar: 2022, id: '85318NED' },
  { jaar: 2023, id: '85618NED' },
  { jaar: 2024, id: '85984NED' },
];

// Velden die we ophalen (migratie-gerelateerd)
const HERKOMST_FIELDS = [
  'WijkenEnBuurten',
  'Codering_3',
  'AantalInwoners_5',
  'WestersTotaal_17',
  'NietWestersTotaal_18',
  'Marokko_19',
  'NederlandseAntillenEnAruba_20',
  'Suriname_21',
  'Turkije_22',
  'OverigNietWesters_23',
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
  return new Set(all.map(g => g.code));
}

async function importHerkomstForYear(datasetId, jaar) {
  console.log(`\n--- ${jaar} (${datasetId}) ---`);

  // Haal alleen gemeente-niveau data op (SoortRegio_2 = 'Gemeente')
  // We filteren op Codering_3 starting with 'GM'
  let allData = [];
  let skip = 0;

  while (true) {
    const select = HERKOMST_FIELDS.join(',');
    const url = `${CBS_BASE_URL}/${datasetId}/TypedDataSet?$select=${select}&$top=5000&$skip=${skip}&$format=json`;
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`  API error: ${response.status} bij skip=${skip}`);
      break;
    }
    const json = await response.json();
    const items = json.value || [];
    allData = allData.concat(items);
    if (items.length < 5000) break;
    skip += 5000;
    process.stdout.write(`  ${allData.length} rijen...\r`);
  }

  console.log(`  ${allData.length} rijen opgehaald`);
  return allData;
}

async function main() {
  console.log('=== Herkomstland Import (Kerncijfers) ===');

  const gemeenteSet = await fetchGemeenteCodes();
  console.log(`${gemeenteSet.size} gemeenten`);

  for (const ds of DATASETS) {
    try {
      const data = await importHerkomstForYear(ds.id, ds.jaar);

      // Filter op gemeenten
      const rows = [];
      for (const item of data) {
        const code = item.Codering_3?.trim();
        if (!code || !code.startsWith('GM')) continue;
        if (!gemeenteSet.has(code)) continue;

        const totaalInwoners = item.AantalInwoners_5 || 0;
        const westers = item.WestersTotaal_17 || 0;
        const nietWesters = item.NietWestersTotaal_18 || 0;

        // Bouw landen array (gesorteerd op aantal)
        const landen = [
          { land: 'Marokko', code: 'H008673', aantal: item.Marokko_19 || 0 },
          { land: 'Turkije', code: 'H008766', aantal: item.Turkije_22 || 0 },
          { land: 'Suriname', code: 'H008751', aantal: item.Suriname_21 || 0 },
          { land: 'Ned. Cariben', code: 'H007119', aantal: item.NederlandseAntillenEnAruba_20 || 0 },
          { land: 'Overig niet-westers', code: 'overig_nw', aantal: item.OverigNietWesters_23 || 0 },
          { land: 'Westers totaal', code: 'westers', aantal: westers },
        ]
        .filter(l => l.aantal > 0)
        .sort((a, b) => b.aantal - a.aantal);

        const totaal = westers + nietWesters;

        rows.push({
          gemeente_code: code,
          jaar: ds.jaar,
          totaal,
          landen,
          gemeente_bevolking: {
            totaal: totaalInwoners,
            nederlands: Math.max(0, totaalInwoners - westers - nietWesters),
            westers,
            nietWesters,
          },
        });
      }

      console.log(`  ${rows.length} gemeenten met herkomst data`);

      // Batch upsert
      const BATCH_SIZE = 500;
      let inserted = 0;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('herkomst_land').upsert(batch, { onConflict: 'gemeente_code,jaar' });
        if (error) { console.error('Fout:', error.message); throw error; }
        inserted += batch.length;
      }
      console.log(`  Geimporteerd: ${inserted} gemeenten voor ${ds.jaar}`);
    } catch (e) {
      console.error(`FOUT bij ${ds.jaar}:`, e.message);
    }
  }

  const { count } = await supabase.from('herkomst_land').select('*', { count: 'exact', head: true });
  console.log(`\n=== Klaar! ${count} herkomst_land rijen in Supabase ===`);
}

main();
