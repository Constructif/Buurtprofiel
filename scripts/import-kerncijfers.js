/**
 * Import kerncijfers (CBS) voor alle gebieden, 5 jaar (2020-2024).
 * Per jaar een ander dataset-ID. Haalt alleen de measures op die we nodig hebben.
 */
const { supabase } = require('./supabase-client');

const CBS_BASE_URL = 'https://datasets.cbs.nl/odata/v1/CBS';

// Dataset-IDs per jaar
const DATASETS = [
  { jaar: 2020, id: '84799NED' },
  { jaar: 2021, id: '85039NED' },
  { jaar: 2022, id: '85318NED' },
  { jaar: 2023, id: '85618NED' },
  { jaar: 2024, id: '85984NED' },
  { jaar: 2025, id: '86165NED' },
];

// Alle measure codes die we nodig hebben
const MEASURES = [
  // Bevolking
  'T001036',     // Totaal inwoners
  '3000',        // Mannen
  '4000',        // Vrouwen
  'M000100',     // Inwoners per km²
  '10680',       // Leeftijd 0-14
  '53050',       // Leeftijd 15-24
  '53310',       // Leeftijd 25-44
  '53715',       // Leeftijd 45-64
  '80200',       // Leeftijd 65+
  '1012600_1',   // Nederlands
  'H007933_1',   // Westers
  'H008859_1',   // Niet-westers
  // Huishoudens
  '1050010_2',   // Huishoudens totaal
  '1050015',     // Eenpersoons
  '1016040',     // Zonder kinderen
  '1016030',     // Met kinderen
  'M000114',     // Gem. grootte huishouden
  // Woningen
  'M000297',     // Woningvoorraad
  '1014800',     // Koop %
  '1014850_2',   // Huur %
  'A047047',     // Huur sociaal %
  'A047048',     // Huur particulier %
  'ZW10340',     // Meergezins %
  'ZW25805',     // Tussenwoning %
  'ZW25806',     // Hoekwoning %
  'ZW10300',     // 2-onder-1-kap %
  'ZW10320',     // Vrijstaand %
  // Inkomen
  'M000223',     // Gem. besteedbaar inkomen (x1000)
  'D000187',     // Laag inkomen %
  'D000185',     // Hoog inkomen %
  // Jeugdzorg/WMO
  'T001203',     // Jongeren met jeugdzorg
  'A045561',     // Jeugdzorg %
  'M001342_1',   // WMO cliënten
  'M001342_2',   // WMO per 1000
  // Uitkeringen
  'D006842',     // Bijstand
  'D001827',     // WW
  'D006837',     // AO
  'D000193',     // AOW
];

async function fetchAllObservations(datasetId) {
  let allData = [];

  // Fetch per individuele measure om CBS 50k limiet te vermijden
  // (CBS OData v1 geeft geen nextLink maar kapt af bij $top)
  for (let mi = 0; mi < MEASURES.length; mi++) {
    const m = MEASURES[mi];
    let url = `${CBS_BASE_URL}/${datasetId}/Observations?$filter=${encodeURIComponent(`Measure eq '${m}'`)}&$select=Measure,Value,StringValue,WijkenEnBuurten&$top=50000`;

    while (url) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`CBS API error: ${response.status} for ${datasetId}`);
      const json = await response.json();
      const items = json.value || [];
      allData = allData.concat(items);
      url = json['@odata.nextLink'] || null;
    }
    process.stdout.write(`  Measure ${mi + 1}/${MEASURES.length} (${allData.length} rijen totaal)\r`);
  }

  console.log(`  ${allData.length} observaties opgehaald (${MEASURES.length} measures)`);
  return allData;
}

function groupByGebied(observations) {
  const grouped = {};
  for (const obs of observations) {
    const code = obs.WijkenEnBuurten;
    if (!code) continue;
    if (!grouped[code]) grouped[code] = {};
    const val = obs.Value ?? (obs.StringValue ? parseFloat(obs.StringValue) : null);
    grouped[code][obs.Measure] = typeof val === 'number' && !isNaN(val) ? val : null;
  }
  return grouped;
}

function buildKerncijfersRow(code, jaar, measures) {
  const g = (m) => measures[m] ?? null;
  const g0 = (m) => measures[m] ?? 0;

  return {
    code,
    jaar,
    bevolking: {
      totaal: g0('T001036'),
      mannen: g0('3000'),
      vrouwen: g0('4000'),
      dichtheid: g0('M000100'),
      leeftijd_0_14: g0('10680'),
      leeftijd_15_24: g0('53050'),
      leeftijd_25_44: g0('53310'),
      leeftijd_45_64: g0('53715'),
      leeftijd_65_plus: g0('80200'),
      nederlands: g0('1012600_1'),
      westers: g0('H007933_1'),
      nietWesters: g0('H008859_1'),
    },
    huishoudens: {
      totaal: g0('1050010_2'),
      eenpersoons: g0('1050015'),
      zonderKinderen: g0('1016040'),
      metKinderen: g0('1016030'),
      gemiddeldeGrootte: g0('M000114'),
    },
    woningen: {
      totaal: g0('M000297'),
      koopPercentage: g0('1014800'),
      huurPercentage: g0('1014850_2'),
      huurSociaalPercentage: g0('A047047'),
      huurParticulierPercentage: g0('A047048'),
      meergezinsPercentage: g0('ZW10340'),
      tussenwoningPercentage: g0('ZW25805'),
      hoekwoningPercentage: g0('ZW25806'),
      tweeOnderEenKapPercentage: g0('ZW10300'),
      vrijstaandPercentage: g0('ZW10320'),
    },
    inkomen: {
      gemiddeld: g('M000223') !== null ? g('M000223') * 1000 : null,
      laagInkomenPercentage: g0('D000187'),
      hoogInkomenPercentage: g0('D000185'),
    },
    jeugdzorg_wmo: {
      jeugdzorgAantal: g('T001203'),
      jeugdzorgPercentage: g('A045561'),
      wmoAantal: g('M001342_1'),
      wmoPer1000: g('M001342_2'),
    },
    uitkeringen: {
      bijstand: g('D006842'),
      ww: g('D001827'),
      ao: g('D006837'),
      aow: g('D000193'),
    },
  };
}

async function importKerncijfersForYear(datasetId, jaar) {
  console.log(`\n--- ${jaar} (${datasetId}) ---`);

  const observations = await fetchAllObservations(datasetId);
  const grouped = groupByGebied(observations);
  const codes = Object.keys(grouped);
  console.log(`  ${codes.length} gebieden met data`);

  // Haal bestaande gebieden op om alleen geldige codes te inserten
  // Supabase limiteert op 1000 rijen per request
  let allGebieden = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('gebieden')
      .select('code')
      .range(from, from + 999);
    if (error) throw error;
    allGebieden = allGebieden.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  const validCodes = new Set(allGebieden.map(g => g.code));
  console.log(`  ${validCodes.size} geldige gebiedscodes in Supabase`);

  const rows = [];
  let skipped = 0;
  for (const code of codes) {
    if (!validCodes.has(code)) {
      skipped++;
      continue;
    }
    rows.push(buildKerncijfersRow(code, jaar, grouped[code]));
  }
  if (skipped > 0) console.log(`  ${skipped} codes overgeslagen (niet in gebieden tabel)`);

  // Batch upsert
  const BATCH_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('kerncijfers')
      .upsert(batch, { onConflict: 'code,jaar' });
    if (error) {
      console.error(`  Fout bij batch:`, error.message);
      throw error;
    }
    inserted += batch.length;
    process.stdout.write(`  Geimporteerd: ${inserted}/${rows.length}\r`);
  }
  console.log(`  Geimporteerd: ${inserted}/${rows.length} gebieden voor ${jaar}`);
  return inserted;
}

async function main() {
  console.log('=== Kerncijfers Import (5 jaar) ===');
  let totaal = 0;

  for (const ds of DATASETS) {
    try {
      const count = await importKerncijfersForYear(ds.id, ds.jaar);
      totaal += count;
    } catch (e) {
      console.error(`FOUT bij ${ds.jaar}:`, e.message);
    }
  }

  // Verifieer
  const { count } = await supabase
    .from('kerncijfers')
    .select('*', { count: 'exact', head: true });

  console.log(`\n=== Klaar! ${count} kerncijfers rijen in Supabase (verwacht ~${18000 * 5}) ===`);
}

main();
