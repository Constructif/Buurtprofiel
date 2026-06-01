/**
 * Import criminaliteit (CBS 47018NED) voor alle gebieden, 5 jaar (2020-2024).
 * Bron: dataderden.cbs.nl OData API (TypedDataSet).
 * Haalt per jaar ALLE misdrijfcategorieën op en groepeert per gebied.
 */
const { supabase } = require('./supabase-client');

const CBS_CRIME_URL = 'https://dataderden.cbs.nl/ODataApi/OData/47018NED';

const PERIODEN = ['2020JJ00', '2021JJ00', '2022JJ00', '2023JJ00', '2024JJ00'];

// CBS misdrijfcodes die we nodig hebben
const CRIME_CODES = [
  '0.0.0',   // Totaal
  '1.1.1',   // Diefstal/inbraak woning
  '1.1.2',   // Diefstal/inbraak schuur
  '1.2.1',   // Diefstal uit/van motorvoertuigen
  '1.2.2',   // Diefstal van motorvoertuigen
  '1.2.3',   // Diefstal fietsen
  '1.2.4',   // Zakkenrollerij
  '1.2.5',   // Diefstal overige voertuigen
  '2.5.1',   // Diefstal/inbraak bedrijven
  '2.5.2',   // Winkeldiefstal
  '1.6.2',   // Overige vermogensdelicten
  '1.4.1',   // Zedenmisdrijf
  '1.4.2',   // Moord/doodslag
  '1.4.3',   // Openlijk geweld
  '1.4.4',   // Bedreiging
  '1.4.5',   // Mishandeling
  '1.4.6',   // Straatroof
  '1.4.7',   // Overval
  '2.2.1',   // Vernieling
  '2.1.1',   // Drugs/drankoverlast
  '2.4.1',   // Burengerucht
  '2.4.2',   // Huisvredebreuk
  '1.3.1',   // Verkeersongevallen
  '3.5.2',   // Rijden onder invloed
  '3.9.1',   // Horizontale fraude
  '3.9.2',   // Verticale fraude
  '3.9.3',   // Fraude overig
  '1.6.1',   // Brand/ontploffing
  '3.6.4',   // Aantasting openbare orde
  '3.7.4',   // Cybercrime
];

// Helperfunctie om alle gebieden uit Supabase te halen (paginerend)
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

async function fetchCrimeDataForPeriod(periode) {
  console.log(`\n--- ${periode} ---`);
  let allData = [];
  let skip = 0;
  const TOP = 5000;

  // Haal alle data voor deze periode in bulk (pagina's van 10k)
  const filter = `Perioden eq '${periode}'`;

  while (true) {
    const url = `${CBS_CRIME_URL}/TypedDataSet?$filter=${encodeURIComponent(filter)}&$top=${TOP}&$skip=${skip}&$format=json`;
    const response = await fetch(url);
    if (!response.ok) {
      // Soms geeft de API een 500 bij grote skip waarden, probeer kleinere pages
      if (skip > 0) {
        console.log(`  Waarschuwing: API error bij skip=${skip}, stoppen met ${allData.length} rijen`);
        break;
      }
      throw new Error(`CBS Crime API error: ${response.status}`);
    }
    const json = await response.json();
    const items = json.value || [];
    allData = allData.concat(items);

    if (items.length < TOP) break;
    skip += TOP;
    process.stdout.write(`  ${allData.length} rijen opgehaald...\r`);
  }

  console.log(`  ${allData.length} rijen opgehaald voor ${periode}`);
  return allData;
}

function buildCriminaliteitData(crimesByCode) {
  const g = (code) => crimesByCode[code] ?? 0;

  const inbraakWoningen = g('1.1.1');
  const inbraakSchuur = g('1.1.2');
  const dieftalUitAutos = g('1.2.1');
  const dieftalAutos = g('1.2.2');
  const dieftalFietsen = g('1.2.3');
  const zakkenrollerij = g('1.2.4');
  const dieftalOverigeVoertuigen = g('1.2.5');
  const inbraakBedrijven = g('2.5.1');
  const winkeldiefstal = g('2.5.2');
  const overigeVermogen = g('1.6.2');

  const zedenmisdrijf = g('1.4.1');
  const moordDoodslag = g('1.4.2');
  const openlijkGeweld = g('1.4.3');
  const bedreiging = g('1.4.4');
  const mishandeling = g('1.4.5');
  const straatroof = g('1.4.6');
  const overval = g('1.4.7');

  const vernieling = g('2.2.1');
  const drugsOverlast = g('2.1.1');
  const burengerucht = g('2.4.1');
  const huisvredebreuk = g('2.4.2');

  const verkeersOngevallen = g('1.3.1');
  const rijdenOnderInvloed = g('3.5.2');

  const fraude = g('3.9.1') + g('3.9.2') + g('3.9.3');
  const brandOntploffing = g('1.6.1');
  const aantastingOpenbareOrde = g('3.6.4');
  const cybercrime = g('3.7.4');

  const geweld = zedenmisdrijf + moordDoodslag + mishandeling + bedreiging + openlijkGeweld + straatroof + overval;
  const vermogen = inbraakWoningen + inbraakSchuur + dieftalAutos + dieftalUitAutos + dieftalFietsen +
                   zakkenrollerij + dieftalOverigeVoertuigen + inbraakBedrijven + winkeldiefstal + overigeVermogen;
  const verkeer = verkeersOngevallen + rijdenOnderInvloed;

  return {
    totaal: g('0.0.0'),
    geweld, vermogen, vernieling, verkeer,
    inbraakWoningen, inbraakSchuur, dieftalAutos, dieftalUitAutos, dieftalFietsen,
    zakkenrollerij, dieftalOverigeVoertuigen, inbraakBedrijven, winkeldiefstal, overigeVermogen,
    zedenmisdrijf, moordDoodslag, mishandeling, bedreiging, openlijkGeweld, straatroof, overval,
    drugsOverlast, burengerucht, huisvredebreuk,
    verkeersOngevallen, rijdenOnderInvloed,
    fraude, brandOntploffing, aantastingOpenbareOrde, cybercrime,
  };
}

async function main() {
  console.log('=== Criminaliteit Import (5 jaar) ===');

  const validCodes = await fetchAllGebiedCodes();
  console.log(`${validCodes.size} geldige gebiedscodes`);

  let totaal = 0;

  for (const periode of PERIODEN) {
    const jaar = parseInt(periode.substring(0, 4));
    const rawData = await fetchCrimeDataForPeriod(periode);

    // Groepeer per gebied
    const grouped = {};
    for (const row of rawData) {
      const code = row.WijkenEnBuurten?.trim();
      const crimeCode = row.SoortMisdrijf?.trim();
      if (!code || !crimeCode) continue;

      if (!grouped[code]) grouped[code] = {};
      grouped[code][crimeCode] = row.GeregistreerdeMisdrijven_1 ?? 0;
    }

    // Bouw rijen
    const rows = [];
    let skipped = 0;
    for (const code of Object.keys(grouped)) {
      if (!validCodes.has(code)) { skipped++; continue; }
      rows.push({
        code,
        jaar,
        data: buildCriminaliteitData(grouped[code]),
      });
    }
    console.log(`  ${rows.length} gebieden met data, ${skipped} overgeslagen`);

    // Batch upsert
    const BATCH_SIZE = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('criminaliteit')
        .upsert(batch, { onConflict: 'code,jaar' });
      if (error) {
        console.error(`  Fout:`, error.message);
        throw error;
      }
      inserted += batch.length;
      process.stdout.write(`  Geimporteerd: ${inserted}/${rows.length}\r`);
    }
    console.log(`  Geimporteerd: ${inserted} gebieden voor ${jaar}`);
    totaal += inserted;
  }

  const { count } = await supabase.from('criminaliteit').select('*', { count: 'exact', head: true });
  console.log(`\n=== Klaar! ${count} criminaliteit rijen in Supabase ===`);
}

main();
