/**
 * Import alle gebieden (buurten, wijken, gemeenten) van CBS naar Supabase.
 * Haalt gebieden uit ALLE kerncijfers datasets (2020-2024) zodat we de unie
 * van alle gebiedscodes hebben — CBS verandert codes jaarlijks.
 */
const { supabase } = require('./supabase-client');

const CBS_BASE_URL = 'https://datasets.cbs.nl/odata/v1/CBS';

// Alle kerncijfers datasets per jaar
const DATASETS = [
  { jaar: 2020, id: '84799NED' },
  { jaar: 2021, id: '85039NED' },
  { jaar: 2022, id: '85318NED' },
  { jaar: 2023, id: '85618NED' },
  { jaar: 2024, id: '85984NED' },
];

function parseGebied(item, dataMap) {
  const code = item.Identifier;
  let wijk_code = null;
  let gemeente_code = null;
  let type;

  if (code.startsWith('BU')) {
    type = 'buurt';
    // Wijk code: WK + gemeente deel (4 cijfers) + wijk deel (2 cijfers)
    // BU16800000 -> WK168000, BU0363AA01 -> WK0363AA
    // Gebruik DimensionGroupId als die een GM code is om gemeente te bepalen
    const gmFromGroup = item.DimensionGroupId?.startsWith('GM') ? item.DimensionGroupId : null;
    if (gmFromGroup) {
      gemeente_code = gmFromGroup;
      // Probeer wijk code te extraheren: WK + resterende deel na BU, eerste 6 chars
      wijk_code = 'WK' + code.substring(2, 8);
    } else {
      wijk_code = 'WK' + code.substring(2, 8);
      gemeente_code = 'GM' + code.substring(2, 6);
    }
  } else if (code.startsWith('WK')) {
    type = 'wijk';
    wijk_code = code;
    gemeente_code = item.DimensionGroupId?.startsWith('GM') ? item.DimensionGroupId : ('GM' + code.substring(2, 6));
  } else if (code.startsWith('GM')) {
    type = 'gemeente';
    gemeente_code = code;
  } else {
    return null; // NL00 etc.
  }

  const wijk_naam = wijk_code && dataMap[wijk_code] ? dataMap[wijk_code] : null;
  const gemeente_naam = gemeente_code && dataMap[gemeente_code] ? dataMap[gemeente_code] : null;

  return {
    code,
    naam: item.Title,
    type,
    wijk_code,
    wijk_naam,
    gemeente_code,
    gemeente_naam,
  };
}

async function fetchGebiedenFromDataset(datasetId, jaar) {
  console.log(`  Ophalen ${jaar} (${datasetId})...`);
  let allItems = [];
  let url = `${CBS_BASE_URL}/${datasetId}/WijkenEnBuurtenCodes?$top=20000`;

  while (url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`CBS API error: ${response.status}`);
    const json = await response.json();
    const items = json.value || [];
    allItems = allItems.concat(items);
    url = json['@odata.nextLink'] || null;
    if (items.length === 0) break;
  }

  console.log(`  ${allItems.length} items opgehaald voor ${jaar}`);
  return allItems;
}

async function importGebieden() {
  try {
    console.log('=== Gebieden Import (unie van 5 jaar) ===\n');

    // Verzamel alle gebieden uit alle jaren
    const allGebieden = new Map(); // code -> gebied object

    for (const ds of DATASETS) {
      const items = await fetchGebiedenFromDataset(ds.id, ds.jaar);

      // Maak lookup map voor namen
      const dataMap = {};
      items.forEach(item => { dataMap[item.Identifier] = item.Title; });

      for (const item of items) {
        const gebied = parseGebied(item, dataMap);
        if (!gebied) continue;

        // Meest recente versie wint (overschrijft oudere)
        allGebieden.set(gebied.code, gebied);
      }
    }

    const gebieden = Array.from(allGebieden.values());
    const buurten = gebieden.filter(g => g.type === 'buurt').length;
    const wijken = gebieden.filter(g => g.type === 'wijk').length;
    const gemeenten = gebieden.filter(g => g.type === 'gemeente').length;
    console.log(`\nTotaal unieke gebieden: ${gebieden.length}`);
    console.log(`  Buurten: ${buurten}, Wijken: ${wijken}, Gemeenten: ${gemeenten}`);

    // Wis bestaande data
    console.log('\nBestaande gebieden verwijderen...');
    // Eerst child tables leegmaken (FK constraints)
    for (const table of ['kerncijfers', 'criminaliteit', 'opleiding', 'werkgelegenheid', 'rivm_gezondheid', 'groenpercentage']) {
      await supabase.from(table).delete().neq('code', '');
    }
    for (const table of ['herkomst_land', 'bevolkings_dynamiek', 'bodemgebruik']) {
      await supabase.from(table).delete().neq('gemeente_code', '');
    }
    await supabase.from('gebieden').delete().neq('code', '');

    // Batch upsert
    const BATCH_SIZE = 500;
    let inserted = 0;

    for (let i = 0; i < gebieden.length; i += BATCH_SIZE) {
      const batch = gebieden.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('gebieden')
        .upsert(batch, { onConflict: 'code' });
      if (error) {
        console.error(`Fout bij batch ${i / BATCH_SIZE + 1}:`, error.message);
        throw error;
      }
      inserted += batch.length;
      process.stdout.write(`  Geimporteerd: ${inserted}/${gebieden.length}\r`);
    }

    // Verifieer
    const { count } = await supabase
      .from('gebieden')
      .select('*', { count: 'exact', head: true });

    console.log(`\n\nKlaar! ${count} gebieden in Supabase.`);

  } catch (error) {
    console.error('Import mislukt:', error.message);
    process.exit(1);
  }
}

importGebieden();
