import type { Gebied, GebiedData } from '../types/gebied';

const CBS_BASE_URL = 'https://datasets.cbs.nl/odata/v1/CBS';
const CBS_ODATA_URL = 'https://opendata.cbs.nl/ODataApi/odata';

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
  // 1. Kerncijfers (85984NED) - Demografische data
  const response1 = await fetch(
    `${CBS_BASE_URL}/85984NED/Observations?$filter=WijkenEnBuurten eq '${code}'`
  );

  // 2. Criminaliteit (47018NED)
  const response2 = await fetch(
    `${CBS_ODATA_URL}/47018NED/TypedDataSet?$filter=WijkenEnBuurten eq '${code}'`
  );

  if (!response1.ok) {
    throw new Error('Kan Kerncijfers niet ophalen');
  }

  const data1 = await response1.json();
  const buurtkenmerken = data1.value || [];

  let criminaliteit = [];
  if (response2.ok) {
    try {
      const data2 = await response2.json();
      criminaliteit = data2.value || [];
    } catch {
      console.warn('Kon criminaliteit data niet parsen');
    }
  }

  return processCBSData(code, naam, buurtkenmerken, criminaliteit);
}

function processCBSData(
  code: string,
  naam: string,
  buurtkenmerken: Array<{ Measure: string; Value?: number; StringValue?: string }>,
  criminaliteit: Array<Record<string, unknown>>
): GebiedData {
  // Helper om kenmerk te vinden
  const getKenmerk = (measure: string): number | null => {
    const item = buurtkenmerken.find((k) => k.Measure === measure);
    if (!item) return null;
    const val = item.Value ?? item.StringValue;
    return typeof val === 'number' ? val : (parseFloat(val as string) || null);
  };

  const crimData = Array.isArray(criminaliteit) && criminaliteit.length > 0 ? criminaliteit[0] : {};

  return {
    code,
    naam,
    bevolking: {
      totaal: getKenmerk('T001036') ?? 0,
      mannen: getKenmerk('3000') ?? 0,
      vrouwen: getKenmerk('4000') ?? 0,
      dichtheid: getKenmerk('M000114') ?? 0,
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
      totaal: getKenmerk('M000100') ?? 0,
      eenpersoons: getKenmerk('1050015') ?? 0,
      zonderKinderen: getKenmerk('1016040') ?? 0,
      metKinderen: getKenmerk('1016030') ?? 0,
    },
    woningen: {
      totaal: getKenmerk('M000297') ?? 0,
      koopPercentage: getKenmerk('1014800') ?? 0,
      huurPercentage: getKenmerk('1014850_2') ?? 0,
      huurSociaalPercentage: getKenmerk('1014850_1') ?? 0,
      huurParticulierPercentage: getKenmerk('1014850_3') ?? 0,
    },
    inkomen: {
      gemiddeld: (getKenmerk('M000223') ?? 0) * 1000,
      laagInkomenPercentage: getKenmerk('T001345') ?? 0,
      hoogInkomenPercentage: getKenmerk('A025294') ?? 0,
    },
    criminaliteit: {
      totaal: (crimData as Record<string, number>).TotaalGeregistreerdeMisdrijven_1 ?? 0,
      geweld: (crimData as Record<string, number>).Gewelds_EnSeksueleMisdrijvenTot_7 ?? 0,
      vermogen: (crimData as Record<string, number>).VermogensmisdrijvenTotaal_1 ?? 0,
      vernieling: (crimData as Record<string, number>).VernielEnBeschMisdrijvenTotaal_4 ?? 0,
      inbraakWoningen: 0,
      dieftalAutos: 0,
      dieftalUitAutos: 0,
    },
  };
}
