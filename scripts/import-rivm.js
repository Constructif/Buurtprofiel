/**
 * Import RIVM Gezondheidsmonitor data (50120NED) voor alle gebieden.
 * Bron: dataderden.cbs.nl (legacy OData API).
 * Beschikbare perioden: 2016JJ00, 2020JJ00, 2022JJ00.
 */
const { supabase } = require('./supabase-client');

const RIVM_BASE = 'https://dataderden.cbs.nl/ODataApi/OData/50120NED';

const PERIODEN = ['2016JJ00', '2020JJ00', '2022JJ00'];

// Alle RIVM velden die we ophalen
const SELECT_FIELDS = [
  'WijkenEnBuurten',
  'Codering_3',
  'Perioden',
  // Eenzaamheid
  'Eenzaam_27',
  'ErnstigZeerErnstigEenzaam_28',
  'EmotioneelEenzaam_29',
  'SociaalEenzaam_30',
  // Mentale gezondheid
  'HoogRisicoOpAngstOfDepressie_25',
  'PsychischeKlachten_20',
  'HeelVeelStressInAfgelopen4Weken_26',
  'MistEmotioneleSteun_23',
  'ZeerLageVeerkracht_21',
  // Zorg & Ondersteuning
  'Mantelzorger_31',
  'Vrijwilligerswerk_32',
  'ErvarenGezondheidGoedZeerGoed_4',
  'EenOfMeerLangdurigeAandoeningen_16',
  'BeperktVanwegeGezondheid_17',
  'MoeiteMetRondkomen_33',
].join(',');

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

async function importRIVMForPeriod(periode) {
  const jaar = parseInt(periode.substring(0, 4));
  console.log(`\n--- ${jaar} (${periode}) ---`);

  // Filter: Leeftijd 18+ (20300), Waarde (MW00000)
  const filter = `Leeftijd eq '20300' and Marges eq 'MW00000' and Perioden eq '${periode}'`;

  let allData = [];
  let skip = 0;

  while (true) {
    const url = `${RIVM_BASE}/TypedDataSet?$filter=${encodeURIComponent(filter)}&$top=5000&$skip=${skip}&$format=json`;
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`  API error: ${response.status}`);
      break;
    }
    const json = await response.json();
    const items = json.value || [];
    allData = allData.concat(items);
    if (items.length < 5000) break;
    skip += 5000;
    process.stdout.write(`  ${allData.length} rijen...\r`);
  }

  console.log(`  ${allData.length} observaties opgehaald`);
  return { jaar, data: allData };
}

function buildRow(code, jaar, item) {
  const g = (field) => item[field] ?? null;

  return {
    code,
    jaar,
    eenzaamheid: {
      totaal: g('Eenzaam_27'),
      ernstig: g('ErnstigZeerErnstigEenzaam_28'),
      emotioneel: g('EmotioneelEenzaam_29'),
      sociaal: g('SociaalEenzaam_30'),
    },
    mentale_gezondheid: {
      angstDepressie: g('HoogRisicoOpAngstOfDepressie_25'),
      psychischeKlachten: g('PsychischeKlachten_20'),
      stress: g('HeelVeelStressInAfgelopen4Weken_26'),
      emotioneleSteun: g('MistEmotioneleSteun_23'),
      veerkracht: g('ZeerLageVeerkracht_21'),
    },
    zorg_ondersteuning: {
      mantelzorger: g('Mantelzorger_31'),
      vrijwilligerswerk: g('Vrijwilligerswerk_32'),
      ervarenGezondheid: g('ErvarenGezondheidGoedZeerGoed_4'),
      langdurigeAandoeningen: g('EenOfMeerLangdurigeAandoeningen_16'),
      beperkt: g('BeperktVanwegeGezondheid_17'),
      moeiteRondkomen: g('MoeiteMetRondkomen_33'),
    },
  };
}

async function main() {
  console.log('=== RIVM Gezondheidsmonitor Import (50120NED) ===');

  const validCodes = await fetchAllGebiedCodes();
  console.log(`${validCodes.size} geldige gebiedscodes`);

  for (const periode of PERIODEN) {
    try {
      const { jaar, data } = await importRIVMForPeriod(periode);

      // Groepeer per gebied (gebruik Codering_3 als code, trim whitespace)
      const rows = [];
      for (const item of data) {
        const code = item.Codering_3?.trim();
        if (!code || code === 'NL01') continue;
        if (!validCodes.has(code)) continue;
        rows.push(buildRow(code, jaar, item));
      }

      console.log(`  ${rows.length} gebieden met RIVM data`);

      // Batch upsert
      const BATCH_SIZE = 500;
      let inserted = 0;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('rivm_gezondheid').upsert(batch, { onConflict: 'code,jaar' });
        if (error) { console.error('Fout:', error.message); throw error; }
        inserted += batch.length;
        process.stdout.write(`  Geimporteerd: ${inserted}/${rows.length}\r`);
      }
      console.log(`  Geimporteerd: ${inserted} gebieden voor ${jaar}`);
    } catch (e) {
      console.error(`FOUT bij ${periode}:`, e.message);
    }
  }

  const { count } = await supabase.from('rivm_gezondheid').select('*', { count: 'exact', head: true });
  console.log(`\n=== Klaar! ${count} RIVM rijen in Supabase ===`);
}

main();
