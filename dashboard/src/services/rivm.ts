import type {
  ZorgWelzijnData,
  ZorgTrend,
  ZorgVergelijking,
  RIVMRawData
} from '../types/zorgWelzijn';

const RIVM_BASE = 'https://dataderden.cbs.nl/ODataApi/OData/50120NED';

// Alle velden die we ophalen
const RIVM_FIELDS = [
  'WijkenEnBuurten',
  'Gemeentenaam_1',
  'SoortRegio_2',
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
  'MoeiteMetRondkomen_33'
];

// Cache voor RIVM data
const rivmCache = new Map<string, { data: RIVMRawData; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minuten

/**
 * Fetch RIVM data voor een specifieke regio
 */
export async function fetchRIVMData(
  regioCode: string,
  periode: string = '2022JJ00'
): Promise<RIVMRawData | null> {
  const cacheKey = `${regioCode}_${periode}`;
  const cached = rivmCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const filter = [
    `startswith(WijkenEnBuurten,'${regioCode}')`,
    `Perioden eq '${periode}'`,
    `Leeftijd eq '20300'`,  // 18+
    `Marges eq 'MW00000'`   // Waarde (geen marge)
  ].join(' and ');

  const params = new URLSearchParams({
    '$filter': filter,
    '$select': RIVM_FIELDS.join(',')
  });

  try {
    const response = await fetch(`${RIVM_BASE}/TypedDataSet?${params}`);
    if (!response.ok) {
      console.warn(`RIVM API error: ${response.status}`);
      return null;
    }

    const json = await response.json();
    const data = json.value?.[0] as RIVMRawData | undefined;

    if (data) {
      rivmCache.set(cacheKey, { data, timestamp: Date.now() });
    }

    return data || null;
  } catch (error) {
    console.error('RIVM fetch error:', error);
    return null;
  }
}

/**
 * Fetch trend data (alle jaren) voor een regio
 */
export async function fetchRIVMTrendData(regioCode: string): Promise<ZorgTrend> {
  const filter = [
    `startswith(WijkenEnBuurten,'${regioCode}')`,
    `Leeftijd eq '20300'`,
    `Marges eq 'MW00000'`
  ].join(' and ');

  const params = new URLSearchParams({
    '$filter': filter,
    '$select': 'Perioden,Eenzaam_27,ErnstigZeerErnstigEenzaam_28,HoogRisicoOpAngstOfDepressie_25'
  });

  try {
    const response = await fetch(`${RIVM_BASE}/TypedDataSet?${params}`);
    if (!response.ok) return { jaren: [] };

    const json = await response.json();
    const values = json.value || [];

    const jaren = values
      .map((item: { Perioden?: string; Eenzaam_27?: number | null; ErnstigZeerErnstigEenzaam_28?: number | null; HoogRisicoOpAngstOfDepressie_25?: number | null }) => ({
        jaar: parseInt(item.Perioden?.substring(0, 4) || '0', 10),
        eenzaam: item.Eenzaam_27 ?? null,
        ernstigEenzaam: item.ErnstigZeerErnstigEenzaam_28 ?? null,
        angstDepressie: item.HoogRisicoOpAngstOfDepressie_25 ?? null
      }))
      .filter((j: { jaar: number }) => j.jaar > 0)
      .sort((a: { jaar: number }, b: { jaar: number }) => a.jaar - b.jaar);

    return { jaren };
  } catch (error) {
    console.error('RIVM trend fetch error:', error);
    return { jaren: [] };
  }
}

/**
 * Process raw RIVM data naar ZorgWelzijnData format
 */
function processRIVMData(rawData: RIVMRawData): Omit<ZorgWelzijnData, 'trend' | 'vergelijking'> {
  return {
    eenzaamheid: {
      totaal: rawData.Eenzaam_27,
      ernstig: rawData.ErnstigZeerErnstigEenzaam_28,
      emotioneel: rawData.EmotioneelEenzaam_29,
      sociaal: rawData.SociaalEenzaam_30
    },
    mentaleGezondheid: {
      angstDepressie: rawData.HoogRisicoOpAngstOfDepressie_25,
      psychischeKlachten: rawData.PsychischeKlachten_20,
      stress: rawData.HeelVeelStressInAfgelopen4Weken_26,
      emotioneleSteun: rawData.MistEmotioneleSteun_23,
      veerkracht: rawData.ZeerLageVeerkracht_21
    },
    zorgOndersteuning: {
      mantelzorger: rawData.Mantelzorger_31,
      vrijwilligerswerk: rawData.Vrijwilligerswerk_32,
      ervarenGezondheid: rawData.ErvarenGezondheidGoedZeerGoed_4,
      langdurigeAandoeningen: rawData.EenOfMeerLangdurigeAandoeningen_16,
      beperkt: rawData.BeperktVanwegeGezondheid_17,
      moeiteRondkomen: rawData.MoeiteMetRondkomen_33
    },
    dataJaar: 2022
  };
}

/**
 * Fetch vergelijking data voor buurt, wijk, gemeente
 */
async function fetchZorgVergelijking(
  buurtCode: string,
  wijkCode?: string,
  gemeenteCode?: string,
  buurtNaam?: string,
  wijkNaam?: string,
  gemeenteNaam?: string
): Promise<ZorgVergelijking> {
  const vergelijking: ZorgVergelijking = {
    nederland: { naam: 'Nederland', eenzaam: 46.2 } // Referentiewaarde 2022
  };

  const promises: Promise<void>[] = [];

  // Buurt data
  if (buurtCode) {
    promises.push(
      fetchRIVMData(buurtCode).then(data => {
        if (data?.Eenzaam_27 !== undefined && data.Eenzaam_27 !== null) {
          vergelijking.buurt = {
            naam: buurtNaam || buurtCode,
            eenzaam: data.Eenzaam_27
          };
        }
      })
    );
  }

  // Wijk data
  if (wijkCode) {
    promises.push(
      fetchRIVMData(wijkCode).then(data => {
        if (data?.Eenzaam_27 !== undefined && data.Eenzaam_27 !== null) {
          vergelijking.wijk = {
            naam: wijkNaam || wijkCode,
            eenzaam: data.Eenzaam_27
          };
        }
      })
    );
  }

  // Gemeente data
  if (gemeenteCode) {
    promises.push(
      fetchRIVMData(gemeenteCode).then(data => {
        if (data?.Eenzaam_27 !== undefined && data.Eenzaam_27 !== null) {
          vergelijking.gemeente = {
            naam: gemeenteNaam || gemeenteCode,
            eenzaam: data.Eenzaam_27
          };
        }
      })
    );
  }

  await Promise.all(promises);
  return vergelijking;
}

/**
 * Hoofd fetch functie voor Zorg & Welzijn tab
 */
export async function fetchZorgWelzijnData(
  gebiedCode: string,
  wijkCode?: string,
  gemeenteCode?: string,
  gebiedNaam?: string,
  wijkNaam?: string,
  gemeenteNaam?: string
): Promise<ZorgWelzijnData | null> {
  try {
    // Parallel fetching
    const [buurtRaw, trend, vergelijking] = await Promise.all([
      fetchRIVMData(gebiedCode),
      fetchRIVMTrendData(gebiedCode),
      fetchZorgVergelijking(gebiedCode, wijkCode, gemeenteCode, gebiedNaam, wijkNaam, gemeenteNaam)
    ]);

    if (!buurtRaw) return null;

    const baseData = processRIVMData(buurtRaw);

    return {
      ...baseData,
      trend,
      vergelijking
    };
  } catch (error) {
    console.error('Error fetching zorg welzijn data:', error);
    return null;
  }
}
