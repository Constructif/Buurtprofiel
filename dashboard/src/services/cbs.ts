import type { Gebied, GebiedData, CriminaliteitTrend, VeiligheidsScoreVergelijking, BevolkingsDynamiek, HerkomstLandData } from '../types/gebied';

const CBS_BASE_URL = 'https://datasets.cbs.nl/odata/v1/CBS';
const CBS_CRIME_URL = 'https://dataderden.cbs.nl/ODataApi/OData/47018NED';
const CBS_PC4_URL = 'https://opendata.cbs.nl/ODataApi/odata/85640NED';  // Herkomstland per PC4

// Cache voor kerncijfers jaar (hoeft maar 1x opgehaald te worden)
let kerncijfersJaarCache: number | null = null;

// Haal het kerncijfers jaar op uit de dataset properties
async function fetchKerncijfersJaar(): Promise<number> {
  if (kerncijfersJaarCache !== null) {
    return kerncijfersJaarCache;
  }

  try {
    const response = await fetch(`${CBS_BASE_URL}/85984NED/Properties`);
    if (response.ok) {
      const data = await response.json();
      // TemporalCoverage bevat het jaar, bijv. "2024"
      const jaar = parseInt(data.TemporalCoverage, 10);
      if (!isNaN(jaar)) {
        kerncijfersJaarCache = jaar;
        return jaar;
      }
    }
  } catch (e) {
    console.warn('Kon kerncijfers jaar niet ophalen:', e);
  }

  // Fallback
  return 2024;
}

// Pad een gebiedscode naar het juiste formaat voor de criminaliteit API
function padGebiedCode(code: string): string {
  // Buurten: BU + 8 cijfers, totaal 10 chars
  // Wijken: WK + 6 cijfers, totaal 8 chars padded to 10
  // Gemeenten: GM + 4 cijfers, totaal 6 chars padded to 10
  return code.padEnd(10, ' ');
}

// Laad alle gebiedscodes (buurten, wijken, gemeenten)
export async function loadAllGebieden(): Promise<Gebied[]> {
  const response = await fetch(`${CBS_BASE_URL}/85318NED/WijkenEnBuurtenCodes`);
  const json = await response.json();
  const rawData = json.value || [];

  // Maak een map voor snelle lookups
  const dataMap: Record<string, string> = {};
  rawData.forEach((item: { Identifier: string; Title: string }) => {
    dataMap[item.Identifier] = item.Title;
  });

  return rawData.map((item: { Identifier: string; Title: string }) => {
    const code = item.Identifier;
    let wijkCode: string | undefined;
    let wijkNaam: string | undefined;
    let gemeenteCode: string | undefined;
    let gemeenteNaam: string | undefined;
    let type: 'buurt' | 'wijk' | 'gemeente';

    if (code.startsWith('BU')) {
      type = 'buurt';
      wijkCode = 'WK' + code.substring(2, 8);
      gemeenteCode = 'GM' + code.substring(2, 6);
    } else if (code.startsWith('WK')) {
      type = 'wijk';
      wijkCode = code;
      gemeenteCode = 'GM' + code.substring(2, 6);
    } else if (code.startsWith('GM')) {
      type = 'gemeente';
      gemeenteCode = code;
    } else {
      type = 'gemeente'; // fallback
    }

    wijkNaam = wijkCode ? dataMap[wijkCode] : undefined;
    gemeenteNaam = gemeenteCode ? dataMap[gemeenteCode] : undefined;

    return {
      code,
      naam: item.Title,
      type,
      wijkCode,
      wijkNaam,
      gemeenteCode,
      gemeenteNaam,
    };
  });
}

// Haal CBS kerncijfers op voor een gebied
export async function fetchCBSData(code: string, naam: string): Promise<GebiedData> {
  // 1. Kerncijfers (85984NED) - Demografische data + jaar parallel ophalen
  const [response1, kerncijfersJaar] = await Promise.all([
    fetch(`${CBS_BASE_URL}/85984NED/Observations?$filter=WijkenEnBuurten eq '${code}'`),
    fetchKerncijfersJaar(),
  ]);

  if (!response1.ok) {
    throw new Error('Kan Kerncijfers niet ophalen');
  }

  const data1 = await response1.json();
  const buurtkenmerken = data1.value || [];

  // 2. Criminaliteit (47018NED) via dataderden.cbs.nl
  // Deze API heeft een complexe structuur met SoortMisdrijf, Perioden, en WijkenEnBuurten
  // We halen alleen totaal misdrijven (0.0.0) voor het meest recente jaar
  const { data: criminaliteit, jaar: dataJaar } = await fetchCriminaliteitData(code);

  return processCBSData(code, naam, buurtkenmerken, criminaliteit, dataJaar, kerncijfersJaar);
}

// Haal criminaliteitsdata op voor een specifiek gebied
async function fetchCriminaliteitData(code: string): Promise<{ data: Record<string, number>; jaar: number }> {
  try {
    const paddedCode = padGebiedCode(code);

    // Eerst ophalen welke perioden beschikbaar zijn
    const periodenResponse = await fetch(`${CBS_CRIME_URL}/Perioden?$format=json`);
    if (!periodenResponse.ok) {
      console.warn('Kon perioden niet ophalen');
      return { data: {}, jaar: 2024 };
    }
    const periodenData = await periodenResponse.json();
    const allPerioden = periodenData.value?.map((p: { Key: string }) => p.Key) || [];

    // Pak de nieuwste jaarperiode
    const latestPeriod = allPerioden
      .filter((p: string) => p.endsWith('JJ00'))
      .sort((a: string, b: string) => b.localeCompare(a))[0] || '2024JJ00';

    // Extract jaar uit periode (bijv. "2024JJ00" -> 2024)
    const jaar = parseInt(latestPeriod.substring(0, 4), 10) || 2024;

    // Haal de misdrijfcategorieën op die we nodig hebben
    // Zie: https://dataderden.cbs.nl/ODataApi/OData/47018NED/SoortMisdrijf
    const crimeTypes = [
      '0.0.0 ',   // Totaal misdrijven
      // Vermogensdelicten
      '1.1.1 ',   // Diefstal/inbraak woning
      '1.1.2 ',   // Diefstal/inbraak box/garage/schuur
      '1.2.1 ',   // Diefstal uit/vanaf motorvoertuigen
      '1.2.2 ',   // Diefstal van motorvoertuigen
      '1.2.3 ',   // Diefstal van brom-, snor-, fietsen
      '1.2.4 ',   // Zakkenrollerij
      '1.2.5 ',   // Diefstal af/uit/van ov. voertuigen
      '2.5.1 ',   // Diefstal/inbraak bedrijven
      '2.5.2 ',   // Winkeldiefstal
      '1.6.2 ',   // Overige vermogensdelicten
      // Geweldsdelicten
      '1.4.1 ',   // Zedenmisdrijf
      '1.4.2 ',   // Moord, doodslag
      '1.4.3 ',   // Openlijk geweld (persoon)
      '1.4.4 ',   // Bedreiging
      '1.4.5 ',   // Mishandeling
      '1.4.6 ',   // Straatroof
      '1.4.7 ',   // Overval
      // Vernieling en overlast
      '2.2.1 ',   // Vernieling cq. zaakbeschadiging
      '2.1.1 ',   // Drugs/drankoverlast
      '2.4.1 ',   // Burengerucht (relatieproblemen)
      '2.4.2 ',   // Huisvredebreuk
      // Verkeer
      '1.3.1 ',   // Ongevallen (weg)
      '3.5.2 ',   // Onder invloed (weg)
      // Fraude
      '3.9.1 ',   // Horizontale fraude
      '3.9.2 ',   // Verticale fraude
      '3.9.3 ',   // Fraude (overig)
      // Overige categorieën
      '1.6.1 ',   // Brand/ontploffing
      '3.6.4 ',   // Aantasting openbare orde
      '3.7.4 ',   // Cybercrime
    ];

    const results: Record<string, number> = {};

    // Haal data op voor elke misdrijfcategorie
    for (const crimeType of crimeTypes) {
      try {
        const url = `${CBS_CRIME_URL}/TypedDataSet?$top=1&$filter=SoortMisdrijf eq '${crimeType}' and Perioden eq '${latestPeriod}' and WijkenEnBuurten eq '${paddedCode}'&$format=json`;
        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json();
          const value = data.value?.[0]?.GeregistreerdeMisdrijven_1;
          if (value !== undefined && value !== null) {
            results[crimeType.trim()] = Number(value) || 0;
          }
        }
      } catch (e) {
        console.warn(`Kon criminaliteit type ${crimeType} niet ophalen:`, e);
      }
    }

    return { data: results, jaar };
  } catch (e) {
    console.warn('Kon criminaliteit data niet ophalen:', e);
    return { data: {}, jaar: 2024 };
  }
}

function processCBSData(
  code: string,
  naam: string,
  buurtkenmerken: Array<{ Measure: string; Value?: number; StringValue?: string }>,
  criminaliteit: Record<string, number>,
  dataJaar: number,
  kerncijfersJaar: number
): GebiedData {
  // Helper om kenmerk te vinden
  const getKenmerk = (measure: string): number | null => {
    const item = buurtkenmerken.find((k) => k.Measure === measure);
    if (!item) return null;
    const val = item.Value ?? item.StringValue;
    return typeof val === 'number' ? val : (parseFloat(val as string) || null);
  };

  // Criminaliteit mapping van CBS codes naar onze velden
  // Totaal
  const totaalMisdrijven = criminaliteit['0.0.0'] ?? 0;

  // Vermogensdelicten detail
  const inbraakWoningen = criminaliteit['1.1.1'] ?? 0;
  const inbraakSchuur = criminaliteit['1.1.2'] ?? 0;
  const dieftalUitAutos = criminaliteit['1.2.1'] ?? 0;
  const dieftalAutos = criminaliteit['1.2.2'] ?? 0;
  const dieftalFietsen = criminaliteit['1.2.3'] ?? 0;
  const zakkenrollerij = criminaliteit['1.2.4'] ?? 0;
  const dieftalOverigeVoertuigen = criminaliteit['1.2.5'] ?? 0;
  const inbraakBedrijven = criminaliteit['2.5.1'] ?? 0;
  const winkeldiefstal = criminaliteit['2.5.2'] ?? 0;
  const overigeVermogen = criminaliteit['1.6.2'] ?? 0;

  // Geweldsdelicten detail
  const zedenmisdrijf = criminaliteit['1.4.1'] ?? 0;
  const moordDoodslag = criminaliteit['1.4.2'] ?? 0;
  const openlijkGeweld = criminaliteit['1.4.3'] ?? 0;
  const bedreiging = criminaliteit['1.4.4'] ?? 0;
  const mishandeling = criminaliteit['1.4.5'] ?? 0;
  const straatroof = criminaliteit['1.4.6'] ?? 0;
  const overval = criminaliteit['1.4.7'] ?? 0;

  // Vernieling en overlast
  const vernieling = criminaliteit['2.2.1'] ?? 0;
  const drugsOverlast = criminaliteit['2.1.1'] ?? 0;
  const burengerucht = criminaliteit['2.4.1'] ?? 0;
  const huisvredebreuk = criminaliteit['2.4.2'] ?? 0;

  // Verkeer
  const verkeersOngevallen = criminaliteit['1.3.1'] ?? 0;
  const rijdenOnderInvloed = criminaliteit['3.5.2'] ?? 0;

  // Fraude (som van alle fraude types)
  const fraudeHorizontaal = criminaliteit['3.9.1'] ?? 0;
  const fraudeVerticaal = criminaliteit['3.9.2'] ?? 0;
  const fraudeOverig = criminaliteit['3.9.3'] ?? 0;
  const fraude = fraudeHorizontaal + fraudeVerticaal + fraudeOverig;

  // Overige
  const brandOntploffing = criminaliteit['1.6.1'] ?? 0;
  const aantastingOpenbareOrde = criminaliteit['3.6.4'] ?? 0;
  const cybercrime = criminaliteit['3.7.4'] ?? 0;

  // Geweldsmisdrijven totaal
  const geweld = zedenmisdrijf + moordDoodslag + mishandeling + bedreiging + openlijkGeweld + straatroof + overval;

  // Vermogensdelicten totaal
  const vermogen = inbraakWoningen + inbraakSchuur + dieftalAutos + dieftalUitAutos + dieftalFietsen +
                   zakkenrollerij + dieftalOverigeVoertuigen + inbraakBedrijven + winkeldiefstal + overigeVermogen;

  // Verkeer totaal
  const verkeer = verkeersOngevallen + rijdenOnderInvloed;

  return {
    code,
    naam,
    bevolking: {
      totaal: getKenmerk('T001036') ?? 0,
      mannen: getKenmerk('3000') ?? 0,
      vrouwen: getKenmerk('4000') ?? 0,
      dichtheid: getKenmerk('M000100') ?? 0,  // Inwoners per km²
      leeftijd_0_14: getKenmerk('10680') ?? 0,
      leeftijd_15_24: getKenmerk('53050') ?? 0,
      leeftijd_25_44: getKenmerk('53310') ?? 0,
      leeftijd_45_64: getKenmerk('53715') ?? 0,
      leeftijd_65_plus: getKenmerk('80200') ?? 0,
      nederlands: getKenmerk('1012600_1') ?? 0,
      westers: getKenmerk('H007933_1') ?? 0,
      nietWesters: getKenmerk('H008859_1') ?? 0,
    },
    huishoudens: {
      totaal: getKenmerk('1050010_2') ?? 0,  // Huishoudens totaal
      eenpersoons: getKenmerk('1050015') ?? 0,
      zonderKinderen: getKenmerk('1016040') ?? 0,
      metKinderen: getKenmerk('1016030') ?? 0,
      gemiddeldeGrootte: getKenmerk('M000114') ?? 0,  // Gem. aantal personen per huishouden
    },
    woningen: {
      totaal: getKenmerk('M000297') ?? 0,
      koopPercentage: getKenmerk('1014800') ?? 0,
      huurPercentage: getKenmerk('1014850_2') ?? 0,
      huurSociaalPercentage: getKenmerk('A047047') ?? 0,  // In bezit woningcorporatie
      huurParticulierPercentage: getKenmerk('A047048') ?? 0,  // In bezit overige verhuurders
      // Woningtypes
      meergezinsPercentage: getKenmerk('ZW10340') ?? 0,
      tussenwoningPercentage: getKenmerk('ZW25805') ?? 0,
      hoekwoningPercentage: getKenmerk('ZW25806') ?? 0,
      tweeOnderEenKapPercentage: getKenmerk('ZW10300') ?? 0,
      vrijstaandPercentage: getKenmerk('ZW10320') ?? 0,
    },
    inkomen: {
      gemiddeld: (getKenmerk('M000223') ?? 0) * 1000,
      laagInkomenPercentage: getKenmerk('T001345') ?? 0,
      hoogInkomenPercentage: getKenmerk('A025294') ?? 0,
    },
    criminaliteit: {
      totaal: totaalMisdrijven,
      // Hoofdcategorieën
      geweld,
      vermogen,
      vernieling,
      verkeer,
      // Vermogensdelicten detail
      inbraakWoningen,
      inbraakSchuur,
      dieftalAutos,
      dieftalUitAutos,
      dieftalFietsen,
      zakkenrollerij,
      dieftalOverigeVoertuigen,
      inbraakBedrijven,
      winkeldiefstal,
      overigeVermogen,
      // Geweldsdelicten detail
      zedenmisdrijf,
      moordDoodslag,
      mishandeling,
      bedreiging,
      openlijkGeweld,
      straatroof,
      overval,
      // Overlast categorieën
      drugsOverlast,
      burengerucht,
      huisvredebreuk,
      // Verkeer
      verkeersOngevallen,
      rijdenOnderInvloed,
      // Overige
      fraude,
      brandOntploffing,
      aantastingOpenbareOrde,
      cybercrime,
    },
    jeugdzorgWmo: {
      jeugdzorgAantal: getKenmerk('T001203'),        // Jongeren met jeugdzorg in natura
      jeugdzorgPercentage: getKenmerk('A045561'),    // Percentage jongeren met jeugdzorg
      wmoAantal: getKenmerk('M001342_1'),            // WMO-cliënten
      wmoPer1000: getKenmerk('M001342_2'),           // WMO-cliënten relatief (per 1000)
    },
    dataJaar,
    kerncijfersJaar,
  };
}

// Haal criminaliteitstrend op voor de laatste 5 jaar
export async function fetchCriminaliteitTrend(code: string): Promise<CriminaliteitTrend> {
  try {
    const paddedCode = padGebiedCode(code);

    // Haal beschikbare perioden op
    const periodenResponse = await fetch(`${CBS_CRIME_URL}/Perioden?$format=json`);
    if (!periodenResponse.ok) {
      return { jaren: [] };
    }
    const periodenData = await periodenResponse.json();
    const allPerioden = periodenData.value?.map((p: { Key: string }) => p.Key) || [];

    // Sorteer perioden op jaar (aflopend) en pak de laatste 5
    const sortedPerioden = allPerioden
      .filter((p: string) => p.endsWith('JJ00')) // Alleen jaarcijfers
      .sort((a: string, b: string) => b.localeCompare(a)) // Nieuwste eerst
      .slice(0, 5); // Laatste 5 jaar

    const perioden = sortedPerioden;

    // Misdrijfcodes die we willen ophalen per jaar
    const crimeCategories = [
      // Vermogen subcategorieën
      { code: '1.1.1 ', field: 'inbraakWoningen' },
      { code: '1.1.2 ', field: 'inbraakSchuur' },
      { code: '1.2.1 ', field: 'dieftalUitAutos' },
      { code: '1.2.2 ', field: 'dieftalAutos' },
      { code: '1.2.3 ', field: 'dieftalFietsen' },
      { code: '1.2.4 ', field: 'zakkenrollerij' },
      { code: '2.5.2 ', field: 'winkeldiefstal' },
      // Geweld subcategorieën
      { code: '1.4.3 ', field: 'openlijkGeweld' },
      { code: '1.4.4 ', field: 'bedreiging' },
      { code: '1.4.5 ', field: 'mishandeling' },
      { code: '1.4.6 ', field: 'straatroof' },
      { code: '1.4.7 ', field: 'overval' },
      // Vernieling
      { code: '2.2.1 ', field: 'vernieling' },
      // Verkeer
      { code: '1.3.1 ', field: 'verkeersOngevallen' },
      { code: '3.5.2 ', field: 'rijdenOnderInvloed' },
    ];

    const trendData: CriminaliteitTrend = { jaren: [] };

    for (const periode of perioden) {
      // Haal jaar uit periode (bv. "2023JJ00" -> 2023)
      const jaar = parseInt(periode.substring(0, 4), 10);
      if (isNaN(jaar)) continue;

      const jaarData: Record<string, number> = { jaar };

      // Haal alle categorieën parallel op voor dit jaar
      const promises = crimeCategories.map(async (cat) => {
        try {
          const url = `${CBS_CRIME_URL}/TypedDataSet?$top=1&$filter=SoortMisdrijf eq '${cat.code}' and Perioden eq '${periode}' and WijkenEnBuurten eq '${paddedCode}'&$format=json`;
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            const value = data.value?.[0]?.GeregistreerdeMisdrijven_1;
            return { field: cat.field, value: value !== undefined && value !== null ? Number(value) || 0 : 0 };
          }
        } catch {
          // Ignore errors for individual categories
        }
        return { field: cat.field, value: 0 };
      });

      const results = await Promise.all(promises);
      results.forEach(r => {
        jaarData[r.field] = r.value;
      });

      // Bereken totalen per categorie
      const vermogen = (jaarData.inbraakWoningen || 0) + (jaarData.inbraakSchuur || 0) +
                       (jaarData.dieftalAutos || 0) + (jaarData.dieftalUitAutos || 0) +
                       (jaarData.dieftalFietsen || 0) + (jaarData.zakkenrollerij || 0) +
                       (jaarData.winkeldiefstal || 0);
      const geweld = (jaarData.mishandeling || 0) + (jaarData.bedreiging || 0) +
                     (jaarData.openlijkGeweld || 0) + (jaarData.straatroof || 0) +
                     (jaarData.overval || 0);
      const verkeer = (jaarData.verkeersOngevallen || 0) + (jaarData.rijdenOnderInvloed || 0);

      trendData.jaren.push({
        jaar,
        totaal: 0, // Niet meer gebruikt maar nog in type
        vermogen,
        geweld,
        vernieling: jaarData.vernieling || 0,
        verkeer,
      });
    }

    // Sorteer op jaar (oudste eerst)
    trendData.jaren.sort((a, b) => a.jaar - b.jaar);

    return trendData;
  } catch (e) {
    console.warn('Kon criminaliteit trend niet ophalen:', e);
    return { jaren: [] };
  }
}

// Bereken veiligheidsscore op basis van gewogen criminaliteit
// High-impact delicten (geweld, woninginbraak) wegen 2.5x zwaarder
function calculateVeiligheidsScore(
  geweld: number,
  inbraakWoningen: number,
  vermogen: number,
  vernieling: number,
  bevolking: number
): number | null {
  if (bevolking === 0) return null;

  // High-impact delicten wegen 2.5x zwaarder
  const highImpact = geweld + inbraakWoningen;
  // Veelvoorkomend: overige vermogensdelicten + vernieling
  const veelvoorkomend = (vermogen - inbraakWoningen) + vernieling;

  // Gewogen totaal
  const gewogenTotaal = (highImpact * 2.5) + veelvoorkomend;
  const gewogenPer1000 = (gewogenTotaal / bevolking) * 1000;

  // Score berekening (zelfde als in Veiligheid.tsx)
  const score = Math.max(0, Math.min(10, 10 - (gewogenPer1000 / 12)));
  return Math.round(score * 10) / 10;
}

// Haal minimale data op voor een gebied (voor gewogen veiligheidsscore)
interface MinimalGebiedData {
  geweld: number;
  inbraakWoningen: number;
  vermogen: number;
  vernieling: number;
  bevolking: number;
}

async function fetchMinimalGebiedData(code: string): Promise<MinimalGebiedData | null> {
  try {
    const paddedCode = padGebiedCode(code);

    // Haal laatste periode op
    const periodenResponse = await fetch(`${CBS_CRIME_URL}/Perioden?$format=json`);
    if (!periodenResponse.ok) return null;
    const periodenData = await periodenResponse.json();
    const allPerioden = periodenData.value?.map((p: { Key: string }) => p.Key) || [];
    const latestPeriod = allPerioden
      .filter((p: string) => p.endsWith('JJ00'))
      .sort((a: string, b: string) => b.localeCompare(a))[0] || '2024JJ00';

    // Crime codes die we nodig hebben voor gewogen score
    const crimeTypes = [
      { code: '1.1.1 ', field: 'inbraakWoningen' },  // Woninginbraak (high-impact)
      { code: '2.2.1 ', field: 'vernieling' },       // Vernieling
      // Geweldsdelicten subcategorieën
      { code: '1.4.1 ', field: 'zedenmisdrijf' },
      { code: '1.4.2 ', field: 'moordDoodslag' },
      { code: '1.4.3 ', field: 'openlijkGeweld' },
      { code: '1.4.4 ', field: 'bedreiging' },
      { code: '1.4.5 ', field: 'mishandeling' },
      { code: '1.4.6 ', field: 'straatroof' },
      { code: '1.4.7 ', field: 'overval' },
      // Vermogensdelicten subcategorieën
      { code: '1.1.2 ', field: 'inbraakSchuur' },
      { code: '1.2.1 ', field: 'dieftalUitAutos' },
      { code: '1.2.2 ', field: 'dieftalAutos' },
      { code: '1.2.3 ', field: 'dieftalFietsen' },
      { code: '1.2.4 ', field: 'zakkenrollerij' },
      { code: '2.5.1 ', field: 'inbraakBedrijven' },
      { code: '2.5.2 ', field: 'winkeldiefstal' },
      { code: '1.6.2 ', field: 'overigeVermogen' },
    ];

    // Haal alle data parallel op
    const [bevolkingResponse, ...crimeResponses] = await Promise.all([
      fetch(`${CBS_BASE_URL}/85984NED/Observations?$filter=WijkenEnBuurten eq '${code}' and Measure eq 'T001036'`),
      ...crimeTypes.map(ct =>
        fetch(`${CBS_CRIME_URL}/TypedDataSet?$top=1&$filter=SoortMisdrijf eq '${ct.code}' and Perioden eq '${latestPeriod}' and WijkenEnBuurten eq '${paddedCode}'&$format=json`)
      ),
    ]);

    // Parse bevolking
    let bevolking = 0;
    if (bevolkingResponse.ok) {
      const bevolkingData = await bevolkingResponse.json();
      bevolking = bevolkingData.value?.[0]?.Value || 0;
    }

    // Parse crime data
    const crimeData: Record<string, number> = {};
    for (let i = 0; i < crimeTypes.length; i++) {
      if (crimeResponses[i].ok) {
        const data = await crimeResponses[i].json();
        const value = data.value?.[0]?.GeregistreerdeMisdrijven_1;
        crimeData[crimeTypes[i].field] = value !== undefined && value !== null ? Number(value) || 0 : 0;
      } else {
        crimeData[crimeTypes[i].field] = 0;
      }
    }

    // Bereken totalen
    const geweld = (crimeData.zedenmisdrijf || 0) + (crimeData.moordDoodslag || 0) +
                   (crimeData.mishandeling || 0) + (crimeData.bedreiging || 0) +
                   (crimeData.openlijkGeweld || 0) + (crimeData.straatroof || 0) +
                   (crimeData.overval || 0);

    const vermogen = (crimeData.inbraakWoningen || 0) + (crimeData.inbraakSchuur || 0) +
                     (crimeData.dieftalAutos || 0) + (crimeData.dieftalUitAutos || 0) +
                     (crimeData.dieftalFietsen || 0) + (crimeData.zakkenrollerij || 0) +
                     (crimeData.inbraakBedrijven || 0) + (crimeData.winkeldiefstal || 0) +
                     (crimeData.overigeVermogen || 0);

    return {
      geweld,
      inbraakWoningen: crimeData.inbraakWoningen || 0,
      vermogen,
      vernieling: crimeData.vernieling || 0,
      bevolking,
    };
  } catch (e) {
    console.warn(`Fout bij ophalen minimale data voor ${code}:`, e);
    return null;
  }
}

// Haal veiligheidsscore vergelijking op voor buurt, wijk, gemeente en Nederland
// Nu met gewogen scores (geweld en woninginbraak wegen 2.5x zwaarder)
export async function fetchVeiligheidsVergelijking(
  gebied: Gebied,
  gebiedDataBevolking: number,
  _gebiedDataCriminaliteit: number, // Behouden voor backwards compatibility
  // Parameters voor gewogen berekening
  gebiedDataGeweld: number,
  gebiedDataInbraakWoningen: number,
  gebiedDataVermogen: number,
  gebiedDataVernieling: number
): Promise<VeiligheidsScoreVergelijking> {
  const vergelijking: VeiligheidsScoreVergelijking = {};

  // Score voor het huidige gebied (buurt of wijk of gemeente) - gewogen berekening
  const currentScore = calculateVeiligheidsScore(
    gebiedDataGeweld,
    gebiedDataInbraakWoningen,
    gebiedDataVermogen,
    gebiedDataVernieling,
    gebiedDataBevolking
  );
  if (currentScore !== null) {
    if (gebied.type === 'buurt') {
      vergelijking.buurt = { score: currentScore, naam: gebied.naam };
    } else if (gebied.type === 'wijk') {
      vergelijking.wijk = { score: currentScore, naam: gebied.naam };
    } else if (gebied.type === 'gemeente') {
      vergelijking.gemeente = { score: currentScore, naam: gebied.naam };
    }
  }

  // Haal parallel de andere niveaus op
  const promises: Promise<void>[] = [];

  // Als het een buurt is, haal wijk data op
  if (gebied.type === 'buurt' && gebied.wijkCode && gebied.wijkNaam) {
    const wijkCode = gebied.wijkCode;
    const wijkNaam = gebied.wijkNaam;
    promises.push(
      fetchMinimalGebiedData(wijkCode).then((data) => {
        if (data) {
          const score = calculateVeiligheidsScore(
            data.geweld,
            data.inbraakWoningen,
            data.vermogen,
            data.vernieling,
            data.bevolking
          );
          if (score !== null) {
            vergelijking.wijk = { score, naam: wijkNaam };
          }
        }
      })
    );
  }

  // Als het een buurt of wijk is, haal gemeente data op
  if ((gebied.type === 'buurt' || gebied.type === 'wijk') && gebied.gemeenteCode && gebied.gemeenteNaam) {
    const gemeenteCode = gebied.gemeenteCode;
    const gemeenteNaam = gebied.gemeenteNaam;
    promises.push(
      fetchMinimalGebiedData(gemeenteCode).then((data) => {
        if (data) {
          const score = calculateVeiligheidsScore(
            data.geweld,
            data.inbraakWoningen,
            data.vermogen,
            data.vernieling,
            data.bevolking
          );
          if (score !== null) {
            vergelijking.gemeente = { score, naam: gemeenteNaam };
          }
        }
      })
    );
  }

  // Nederland gemiddelde (NL00 is de nationale code)
  promises.push(
    fetchMinimalGebiedData('NL00').then((data) => {
      if (data) {
        const score = calculateVeiligheidsScore(
          data.geweld,
          data.inbraakWoningen,
          data.vermogen,
          data.vernieling,
          data.bevolking
        );
        if (score !== null) {
          vergelijking.nederland = { score, naam: 'Nederland' };
        }
      }
    })
  );

  await Promise.all(promises);

  return vergelijking;
}

// Haal verhuisbewegingen op voor een gemeente (laatste 5 jaar)
// Dataset 37230ned: Bevolkingsontwikkeling; regio per maand
export async function fetchVerhuisbewegingen(gemeenteCode: string): Promise<BevolkingsDynamiek> {
  try {
    // Haal de laatste 5 volledige jaren op (jaarcijfers)
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 5, currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1];

    const dynamiek: BevolkingsDynamiek = { jaren: [] };

    for (const year of years) {
      // Haal alle maandcijfers voor dit jaar op en sommeer ze
      // M000155 = Vestiging vanuit andere gemeente
      // M000151 = Vertrek naar andere gemeente
      // M000173_1 = Geboorten (maar die is in kerncijfers)
      // M000179_1 = Sterfte (maar die is in kerncijfers)

      const measures = ['M000155', 'M000151', 'M000173_1', 'M000179_1'];
      const yearData: Record<string, number> = {};

      for (const measure of measures) {
        try {
          // Haal jaarcijfer op (alle maanden van het jaar)
          const url = `${CBS_BASE_URL}/37230ned/Observations?$filter=RegioS eq '${gemeenteCode}' and Measure eq '${measure}' and startswith(Perioden,'${year}')`;
          const response = await fetch(url);

          if (response.ok) {
            const data = await response.json();
            const values = data.value || [];
            // Sommeer alle maandcijfers
            const total = values.reduce((sum: number, item: { Value?: number }) => {
              return sum + (item.Value || 0);
            }, 0);
            yearData[measure] = total;
          }
        } catch (e) {
          console.warn(`Kon ${measure} niet ophalen voor ${year}:`, e);
        }
      }

      const vestiging = yearData['M000155'] || 0;
      const vertrek = yearData['M000151'] || 0;
      const geboorte = yearData['M000173_1'] || 0;
      const sterfte = yearData['M000179_1'] || 0;

      // Alleen toevoegen als we data hebben
      if (vestiging > 0 || vertrek > 0 || geboorte > 0 || sterfte > 0) {
        dynamiek.jaren.push({
          jaar: year,
          geboorte,
          sterfte,
          vestiging,
          vertrek,
          saldo: geboorte - sterfte + vestiging - vertrek,
        });
      }
    }

    // Sorteer op jaar (oudste eerst)
    dynamiek.jaren.sort((a, b) => a.jaar - b.jaar);

    return dynamiek;
  } catch (e) {
    console.warn('Kon verhuisbewegingen niet ophalen:', e);
    return { jaren: [] };
  }
}

// Herkomstland codes en namen voor de PC4 dataset (85640NED)
const HERKOMST_LANDEN = [
  { code: 'H008673', land: 'Marokko' },
  { code: 'H008766', land: 'Turkije' },
  { code: 'H008751', land: 'Suriname' },
  { code: 'H008632', land: 'Indonesië' },
  { code: 'H008592', land: 'Duitsland' },
  { code: 'H008718', land: 'Polen' },
  { code: 'H008552', land: 'België' },
  { code: 'H007119', land: 'Ned. Cariben' },  // Nederlandse Cariben (Aruba, Curaçao, etc.)
  { code: 'H008520', land: 'Afghanistan' },
  { code: 'H008645', land: 'Irak' },
  { code: 'H008651', land: 'Iran' },
  { code: 'H008577', land: 'China' },
  { code: 'H008730', land: 'Roemenië' },
  { code: 'H008556', land: 'Bulgarije' },
  { code: 'H008757', land: 'Syrië' },
  { code: 'H008599', land: 'Eritrea' },
  { code: 'H008740', land: 'Somalië' },
];

// Postcode ranges per gemeente (handmatig gedefinieerd voor grote gemeenten)
// Dit is een vereenvoudigde mapping - CBS heeft geen directe PC4-gemeente API
const GEMEENTE_POSTCODES: Record<string, string[]> = {
  'GM0363': ['1011', '1012', '1013', '1014', '1015', '1016', '1017', '1018', '1019', '1021', '1022', '1023', '1024', '1025', '1026', '1027', '1028', '1031', '1032', '1033', '1034', '1035', '1036', '1037', '1038', '1039', '1041', '1042', '1043', '1044', '1045', '1046', '1047', '1048', '1049', '1051', '1052', '1053', '1054', '1055', '1056', '1057', '1058', '1059', '1061', '1062', '1063', '1064', '1065', '1066', '1067', '1068', '1069', '1071', '1072', '1073', '1074', '1075', '1076', '1077', '1078', '1079', '1081', '1082', '1083', '1086', '1087', '1091', '1092', '1093', '1094', '1095', '1096', '1097', '1098', '1099', '1101', '1102', '1103', '1104', '1105', '1106', '1107', '1108', '1109'],  // Amsterdam
  'GM0599': ['3011', '3012', '3013', '3014', '3015', '3016', '3021', '3022', '3023', '3024', '3025', '3026', '3027', '3028', '3029', '3031', '3032', '3033', '3034', '3035', '3036', '3037', '3038', '3039', '3041', '3042', '3043', '3044', '3045', '3046', '3047', '3051', '3052', '3053', '3054', '3055', '3056', '3059', '3061', '3062', '3063', '3064', '3065', '3066', '3067', '3068', '3069', '3071', '3072', '3073', '3074', '3075', '3076', '3077', '3078', '3079', '3081', '3082', '3083', '3084', '3085', '3086', '3089'],  // Rotterdam
  'GM0518': ['2491', '2492', '2493', '2494', '2495', '2496', '2497', '2498', '2500', '2501', '2502', '2503', '2504', '2505', '2506', '2507', '2508', '2509', '2511', '2512', '2513', '2514', '2515', '2516', '2517', '2518', '2521', '2522', '2523', '2524', '2525', '2526', '2531', '2532', '2533', '2541', '2542', '2543', '2544', '2545', '2546', '2547', '2548', '2551', '2552', '2553', '2554', '2555', '2561', '2562', '2563', '2564', '2565', '2566', '2571', '2572', '2573', '2574', '2581', '2582', '2583', '2584', '2585', '2586', '2587', '2591', '2592', '2593', '2594', '2595', '2596', '2597'],  // Den Haag
  'GM0344': ['3438', '3439', '3500', '3501', '3502', '3503', '3504', '3505', '3506', '3507', '3508', '3509', '3510', '3511', '3512', '3513', '3514', '3515', '3521', '3522', '3523', '3524', '3525', '3526', '3527', '3528', '3531', '3532', '3533', '3534', '3541', '3542', '3543', '3544', '3545', '3551', '3552', '3553', '3554', '3555', '3561', '3562', '3563', '3564', '3565', '3566', '3571', '3572', '3573', '3581', '3582', '3583', '3584'],  // Utrecht
  'GM0014': ['9700', '9701', '9702', '9703', '9704', '9705', '9711', '9712', '9713', '9714', '9715', '9716', '9717', '9718', '9721', '9722', '9723', '9724', '9725', '9726', '9727', '9728', '9731', '9732', '9733', '9734', '9735', '9736', '9737', '9738', '9741', '9742', '9743', '9744', '9745', '9746', '9747'],  // Groningen
  'GM0034': ['1312', '1313', '1314', '1315', '1316', '1317', '1318', '1319', '1321', '1322', '1323', '1324', '1325', '1326', '1327', '1328', '1331', '1332', '1333', '1334', '1335', '1336', '1337', '1338'],  // Almere
  'GM0772': ['5600', '5601', '5602', '5603', '5604', '5605', '5606', '5607', '5608', '5609', '5611', '5612', '5613', '5614', '5615', '5616', '5617', '5621', '5622', '5623', '5624', '5625', '5626', '5627', '5628', '5629', '5631', '5632', '5633', '5641', '5642', '5643', '5644', '5645', '5646'],  // Eindhoven
  'GM0855': ['5000', '5001', '5003', '5004', '5005', '5006', '5011', '5012', '5013', '5014', '5015', '5016', '5017', '5018', '5021', '5022', '5025', '5026', '5031', '5032', '5035', '5036', '5037', '5038'],  // Tilburg
};

// Haal postcodes op voor een gemeente (uit hardcoded mapping of generiek)
function getPostcodesVoorGemeente(gemeenteCode: string): string[] {
  // Gebruik hardcoded mapping voor grote gemeenten
  if (GEMEENTE_POSTCODES[gemeenteCode]) {
    return GEMEENTE_POSTCODES[gemeenteCode];
  }
  // Voor andere gemeenten retourneren we een lege array
  // (deze functionaliteit werkt alleen voor de grote gemeenten)
  return [];
}

// Format postcode voor CBS API (PC + 4 cijfers + spaties tot 8 chars)
function formatPostcode(pc: string): string {
  return `PC${pc}`.padEnd(8, ' ');
}

// Haal herkomstland data op voor een gemeente via PC4 dataset
// Aggregeert data van alle postcodes in de gemeente
// Haalt ook gemeente bevolkingsdata op voor correcte percentages
export async function fetchHerkomstLandData(gemeenteCode: string): Promise<HerkomstLandData> {
  try {
    // Haal postcodes voor deze gemeente op
    const postcodes = getPostcodesVoorGemeente(gemeenteCode);

    if (postcodes.length === 0) {
      console.warn('Geen postcodes mapping voor gemeente:', gemeenteCode);
      return { totaal: 0, landen: [] };
    }

    // Haal gemeente bevolkingsdata op (parallel met herkomstland data)
    const gemeenteBevolkingPromise = fetchGemeenteBevolking(gemeenteCode);

    // Bepaal het meest recente jaar
    const currentYear = new Date().getFullYear();
    const perioden = [`${currentYear}JJ00`, `${currentYear - 1}JJ00`, `${currentYear - 2}JJ00`];

    // Beperk tot max 30 postcodes om performance te behouden
    const postcodesToUse = postcodes.slice(0, 30);

    const landTotalen: Record<string, number> = {};
    let dataJaar: number | undefined;

    // Voor elke herkomst-code, haal data op voor alle postcodes
    for (const { code, land } of HERKOMST_LANDEN) {
      let landTotaal = 0;

      // Probeer jaren (nieuwste eerst) tot we data vinden
      for (const periode of perioden) {
        if (landTotaal > 0) break;

        // Batch postcodes in groepen van 5 voor efficiëntie
        for (let i = 0; i < postcodesToUse.length; i += 5) {
          const batch = postcodesToUse.slice(i, i + 5);
          const filterParts = batch.map(pc => `Postcode eq '${formatPostcode(pc)}'`).join(' or ');

          try {
            const url = `${CBS_PC4_URL}/TypedDataSet?$filter=(${filterParts}) and Herkomstland eq '${code}' and Perioden eq '${periode}' and Geslacht eq 'T001038'&$select=Bevolking_1`;
            const response = await fetch(url);

            if (response.ok) {
              const data = await response.json();
              const values = data.value || [];
              for (const item of values) {
                if (item.Bevolking_1) {
                  landTotaal += item.Bevolking_1;
                  if (!dataJaar) {
                    dataJaar = parseInt(periode.substring(0, 4), 10);
                  }
                }
              }
            }
          } catch {
            // Ignore individual batch errors
          }
        }
      }

      if (landTotaal > 0) {
        landTotalen[land] = landTotaal;
      }
    }

    // Bereken totaal
    const totaal = Object.values(landTotalen).reduce((sum, val) => sum + val, 0);

    // Sorteer landen op aantal (hoogste eerst)
    const landen = Object.entries(landTotalen)
      .map(([land, aantal]) => {
        const landInfo = HERKOMST_LANDEN.find(l => l.land === land);
        return { land, code: landInfo?.code || '', aantal };
      })
      .sort((a, b) => b.aantal - a.aantal);

    // Wacht op gemeente bevolkingsdata
    const gemeenteBevolking = await gemeenteBevolkingPromise;

    return { totaal, landen, dataJaar, gemeenteBevolking };
  } catch (e) {
    console.warn('Kon herkomstland data niet ophalen:', e);
    return { totaal: 0, landen: [] };
  }
}

// Haal bevolkingsdata op voor een gemeente (voor herkomst percentages)
async function fetchGemeenteBevolking(gemeenteCode: string): Promise<{
  totaal: number;
  nederlands: number;
  westers: number;
  nietWesters: number;
} | undefined> {
  try {
    const response = await fetch(
      `${CBS_BASE_URL}/85984NED/Observations?$filter=WijkenEnBuurten eq '${gemeenteCode}'`
    );

    if (!response.ok) return undefined;

    const data = await response.json();
    const kenmerken = data.value || [];

    const getKenmerk = (measure: string): number => {
      const item = kenmerken.find((k: { Measure: string; Value?: number }) => k.Measure === measure);
      return item?.Value ?? 0;
    };

    const totaal = getKenmerk('T001036');
    const nederlands = getKenmerk('1012600_1');
    const westers = getKenmerk('H007933_1');
    const nietWesters = getKenmerk('H008859_1');

    if (totaal === 0) return undefined;

    return { totaal, nederlands, westers, nietWesters };
  } catch (e) {
    console.warn('Kon gemeente bevolking niet ophalen:', e);
    return undefined;
  }
}
