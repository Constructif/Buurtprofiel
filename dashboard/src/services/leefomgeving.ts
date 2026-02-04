import type {
  LeefomgevingData,
  BodemgebruikData,
  GroenpercentageData,
  GroenMetrics,
  LeefomgevingVergelijking,
  LeefomgevingVergelijkingNiveau,
} from '../types/leefomgeving';
import { NL_LEEFOMGEVING_REFERENTIES } from '../types/leefomgeving';

// Nieuwe CBS OData v1 API - ondersteunt filters correct (oude API negeerde filters)
const CBS_BODEMGEBRUIK_URL = 'https://datasets.cbs.nl/odata/v1/CBS/86211NED';
const RIVM_WFS_BASE = 'https://data.rivm.nl/geo/ank/wfs';

// Cache voor RIVM groenpercentage data (WFS calls zijn traag)
const groenpercentageCache = new Map<string, { data: GroenpercentageData; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minuten

// Helper: maak lege bodemgebruik data
function createEmptyBodemgebruik(): BodemgebruikData {
  return {
    totaalOppervlakte: null,
    stedelijkGroen: null,
    sportterrein: null,
    recreatiefTerrein: null,
    natuurlijkTerrein: null,
  };
}

/**
 * Haal bodemgebruik data op van CBS (86211NED) via de nieuwe OData v1 API
 *
 * Measure codes mapping:
 * - T001455: Totaal Land en water (ha)
 * - A052552: Stedelijk groen (ha)
 * - A045816: Sportterrein (ha)
 * - A045814_2: Totaal Recreatief terrein (ha)
 * - A045823_2: Totaal Natuurlijk terrein (ha)
 *
 * BELANGRIJK: Dataset 86211NED heeft voornamelijk gemeente-niveau data.
 * Bij buurt/wijk codes wordt automatisch de gemeente code gebruikt.
 */
export async function fetchBodemgebruik(code: string, gemeenteCode?: string): Promise<BodemgebruikData> {
  try {
    // CBS 86211NED heeft voornamelijk gemeente-niveau data
    // Converteer buurt/wijk codes naar gemeente code
    let codeToUse = code;
    if (code.startsWith('BU') || code.startsWith('WK')) {
      if (gemeenteCode) {
        codeToUse = gemeenteCode;
      } else {
        // Extract gemeente uit buurt/wijk code: BU03630980 → GM0363
        codeToUse = 'GM' + code.substring(2, 6);
      }
    }

    // Nieuwe CBS OData v1 API met Measure codes
    const measures = ['T001455', 'A052552', 'A045816', 'A045814_2', 'A045823_2'];
    const measureFilter = measures.map((m) => `Measure eq '${m}'`).join(' or ');

    const url = `${CBS_BODEMGEBRUIK_URL}/Observations?$filter=AlleRegioIndelingen eq '${codeToUse}' and (${measureFilter})`;

    const response = await fetch(url);
    if (!response.ok) {
      console.warn('CBS bodemgebruik response niet ok:', response.status);
      return createEmptyBodemgebruik();
    }

    const data = await response.json();

    if (!data.value || data.value.length === 0) {
      console.warn('Geen bodemgebruik data gevonden voor code:', codeToUse);
      return createEmptyBodemgebruik();
    }

    // Map Measure codes naar waarden
    const valueMap = new Map<string, number>();
    for (const obs of data.value) {
      if (obs.Value !== null && obs.Value !== undefined) {
        valueMap.set(obs.Measure, obs.Value);
      }
    }

    return {
      totaalOppervlakte: valueMap.get('T001455') ?? null,
      stedelijkGroen: valueMap.get('A052552') ?? null,
      sportterrein: valueMap.get('A045816') ?? null,
      recreatiefTerrein: valueMap.get('A045814_2') ?? null,
      natuurlijkTerrein: valueMap.get('A045823_2') ?? null,
    };
  } catch (error) {
    console.error('Fout bij ophalen bodemgebruik:', error);
    return createEmptyBodemgebruik();
  }
}

/**
 * Haal groenpercentage op van RIVM WFS service
 * Dit is het percentage groen gebaseerd op luchtfoto analyse
 */
export async function fetchGroenpercentage(
  gebiedCode: string,
  gebiedType: 'buurt' | 'wijk' | 'gemeente'
): Promise<GroenpercentageData> {
  const cacheKey = `${gebiedCode}_${gebiedType}`;
  const cached = groenpercentageCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    // RIVM WFS layer namen en code veld per gebiedstype
    const layerConfig = {
      buurt: { layer: 'rivm_2022_groenpercentage_kaart_per_buurt', codeField: 'bu_code' },
      wijk: { layer: 'rivm_2022_groenpercentage_kaart_per_wijk', codeField: 'wk_code' },
      gemeente: { layer: 'rivm_2022_groenpercentage_kaart_per_gemeente', codeField: 'gm_code' },
    }[gebiedType];

    // RIVM gebruikt bu_code, wk_code, of gm_code als identifier
    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: `ank:${layerConfig.layer}`,
      outputFormat: 'application/json',
      CQL_FILTER: `${layerConfig.codeField}='${gebiedCode}'`,
    });

    const response = await fetch(`${RIVM_WFS_BASE}?${params}`);

    if (!response.ok) {
      console.warn('RIVM WFS response niet ok:', response.status);
      return { percentage: null };
    }

    const geojson = await response.json();
    const feature = geojson.features?.[0];

    if (!feature) {
      console.warn('Geen RIVM groenpercentage gevonden voor:', gebiedCode);
      return { percentage: null };
    }

    // Groenpercentage zit in _mean property (gemiddelde waarde)
    const percentage = feature.properties?._mean ?? null;

    const result: GroenpercentageData = {
      percentage: percentage !== null ? Math.round(percentage * 10) / 10 : null,
    };

    groenpercentageCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('Fout bij ophalen groenpercentage:', error);
    return { percentage: null };
  }
}

/**
 * Bereken groen metrics uit bodemgebruik en bevolking
 */
export function calculateGroenMetrics(
  bodemgebruik: BodemgebruikData,
  groenpercentage: GroenpercentageData,
  bevolking: number
): GroenMetrics {
  // Tel alle groen oppervlaktes bij elkaar op (in hectares)
  const stedelijk = bodemgebruik.stedelijkGroen ?? 0;
  const sport = bodemgebruik.sportterrein ?? 0;
  const recreatief = bodemgebruik.recreatiefTerrein ?? 0;
  const natuurlijk = bodemgebruik.natuurlijkTerrein ?? 0;

  const totaalGroenHa = stedelijk + sport + recreatief + natuurlijk;

  // Converteer naar m2 (1 ha = 10.000 m2)
  const totaalGroenM2 = totaalGroenHa * 10000;

  // Bereken m2 per persoon
  let m2GroenPerPersoon: number | null = null;
  if (bevolking > 0 && totaalGroenHa > 0) {
    m2GroenPerPersoon = Math.round(totaalGroenM2 / bevolking);
  }

  return {
    m2GroenPerPersoon,
    groenPercentage: groenpercentage.percentage,
    totaalGroenHa: totaalGroenHa > 0 ? Math.round(totaalGroenHa * 10) / 10 : null,
  };
}

/**
 * Maak vergelijkingsdata voor verschillende gebiedsniveaus
 *
 * BELANGRIJK: Aangezien bodemgebruik data alleen op gemeente-niveau beschikbaar is,
 * gebruiken alle niveaus (buurt, wijk, gemeente) dezelfde m² per persoon waarde.
 * Dit voorkomt misleidende vergelijkingen met verkeerde bevolkingsaantallen.
 */
function createVergelijking(
  gebiedType: 'buurt' | 'wijk' | 'gemeente',
  gebiedNaam: string,
  gebiedMetrics: GroenMetrics,
  wijkNaam?: string,
  gemeenteNaam?: string
): LeefomgevingVergelijking {
  // De metrics zijn al op gemeente-niveau berekend
  // Alle niveaus krijgen dezelfde waarde voor consistentie
  const gemeenteMetrics: LeefomgevingVergelijkingNiveau = {
    naam: '',
    m2PerPersoon: gebiedMetrics.m2GroenPerPersoon,
    groenPercentage: gebiedMetrics.groenPercentage,
  };

  const vergelijking: LeefomgevingVergelijking = {
    nederland: {
      naam: 'Nederland',
      m2PerPersoon: NL_LEEFOMGEVING_REFERENTIES.m2GroenPerPersoon,
      groenPercentage: NL_LEEFOMGEVING_REFERENTIES.groenPercentage,
    },
  };

  // Bij buurt selectie: toon buurt, wijk, gemeente (allemaal zelfde gemeente-waarde)
  if (gebiedType === 'buurt') {
    vergelijking.buurt = { ...gemeenteMetrics, naam: gebiedNaam };
    if (wijkNaam) {
      vergelijking.wijk = { ...gemeenteMetrics, naam: wijkNaam };
    }
    if (gemeenteNaam) {
      vergelijking.gemeente = { ...gemeenteMetrics, naam: gemeenteNaam };
    }
  }
  // Bij wijk selectie: toon wijk, gemeente
  else if (gebiedType === 'wijk') {
    vergelijking.wijk = { ...gemeenteMetrics, naam: gebiedNaam };
    if (gemeenteNaam) {
      vergelijking.gemeente = { ...gemeenteMetrics, naam: gemeenteNaam };
    }
  }
  // Bij gemeente selectie: toon alleen gemeente
  else {
    vergelijking.gemeente = { ...gemeenteMetrics, naam: gebiedNaam };
  }

  return vergelijking;
}

/**
 * Haal bevolkingsaantal op voor een gebied
 */
async function fetchBevolking(code: string): Promise<number> {
  try {
    const url = `https://datasets.cbs.nl/odata/v1/CBS/85984NED/Observations?$filter=WijkenEnBuurten eq '${code}' and Measure eq 'T001036'`;
    const response = await fetch(url);

    if (!response.ok) return 0;

    const data = await response.json();
    return data.value?.[0]?.Value ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Hoofdfunctie: haal alle leefomgeving data op voor een gebied
 */
export async function fetchLeefomgevingData(
  gebiedCode: string,
  gebiedType: 'buurt' | 'wijk' | 'gemeente',
  gebiedNaam: string,
  bevolking: number,
  _wijkCode?: string, // Niet meer gebruikt, maar behouden voor API compatibiliteit
  wijkNaam?: string,
  gemeenteCode?: string,
  gemeenteNaam?: string
): Promise<LeefomgevingData | null> {
  try {
    // Bepaal of we gemeente-niveau data gebruiken (CBS 86211NED heeft geen buurt/wijk data)
    const isGemeenteNiveau = gebiedType !== 'gemeente';

    // Haal bodemgebruik en groenpercentage parallel op
    // NB: fetchBodemgebruik gebruikt automatisch gemeente code voor buurt/wijk
    const [bodemgebruik, groenpercentage] = await Promise.all([
      fetchBodemgebruik(gebiedCode, gemeenteCode),
      fetchGroenpercentage(gebiedCode, gebiedType),
    ]);

    // Bij buurt/wijk: haal gemeente bevolking op voor consistente m² per persoon berekening
    // (bodemgebruik is ook gemeente-niveau, dus we moeten gemeente bevolking gebruiken)
    let bevolkingVoorBerekening = bevolking;
    if (isGemeenteNiveau && gemeenteCode) {
      const gemeenteBevolking = await fetchBevolking(gemeenteCode);
      if (gemeenteBevolking > 0) {
        bevolkingVoorBerekening = gemeenteBevolking;
      }
    }

    // Bereken metrics met consistente bevolking (gemeente-niveau als bodemgebruik ook gemeente is)
    const metrics = calculateGroenMetrics(bodemgebruik, groenpercentage, bevolkingVoorBerekening);

    // Haal vergelijking op
    // Maak vergelijking (synchroon, geen extra API calls meer nodig)
    const vergelijking = createVergelijking(
      gebiedType,
      gebiedNaam,
      metrics,
      wijkNaam,
      gemeenteNaam
    );

    return {
      bodemgebruik,
      groenpercentage,
      metrics,
      vergelijking,
      dataJaar: 2022, // Bodemgebruik data is van 2022
      isGemeenteNiveau,
    };
  } catch (error) {
    console.error('Fout bij ophalen leefomgeving data:', error);
    return null;
  }
}
