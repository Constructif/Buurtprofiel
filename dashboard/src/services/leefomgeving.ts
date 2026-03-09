import type {
  LeefomgevingData,
  BodemgebruikData,
  GroenpercentageData,
  GroenMetrics,
  LeefomgevingVergelijking,
} from '../types/leefomgeving';
import { NL_LEEFOMGEVING_REFERENTIES } from '../types/leefomgeving';
import { supabase } from './supabase';

/**
 * Haal bodemgebruik data op uit Supabase (gemeente-niveau)
 */
export async function fetchBodemgebruik(code: string, gemeenteCode?: string, jaar?: number): Promise<BodemgebruikData> {
  try {
    let codeToUse = code;
    if (code.startsWith('BU') || code.startsWith('WK')) {
      if (gemeenteCode) {
        codeToUse = gemeenteCode;
      } else {
        codeToUse = 'GM' + code.substring(2, 6);
      }
    }

    let query = supabase
      .from('bodemgebruik')
      .select('totaal_oppervlakte, stedelijk_groen, sportterrein, recreatief_terrein, natuurlijk_terrein, jaar')
      .eq('gemeente_code', codeToUse);

    if (jaar) {
      query = query.eq('jaar', jaar);
    } else {
      query = query.order('jaar', { ascending: false }).limit(1);
    }

    const { data, error } = await query.maybeSingle();

    // Als exact jaar niet gevonden, fallback naar meest recente
    if (jaar && !data) {
      const { data: fallback } = await supabase
        .from('bodemgebruik')
        .select('totaal_oppervlakte, stedelijk_groen, sportterrein, recreatief_terrein, natuurlijk_terrein, jaar')
        .eq('gemeente_code', codeToUse)
        .order('jaar', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (fallback) {
        return {
          totaalOppervlakte: fallback.totaal_oppervlakte ?? null,
          stedelijkGroen: fallback.stedelijk_groen ?? null,
          sportterrein: fallback.sportterrein ?? null,
          recreatiefTerrein: fallback.recreatief_terrein ?? null,
          natuurlijkTerrein: fallback.natuurlijk_terrein ?? null,
          dataJaar: fallback.jaar,
        };
      }
    }

    if (error || !data) return createEmptyBodemgebruik();

    return {
      totaalOppervlakte: data.totaal_oppervlakte ?? null,
      stedelijkGroen: data.stedelijk_groen ?? null,
      sportterrein: data.sportterrein ?? null,
      recreatiefTerrein: data.recreatief_terrein ?? null,
      natuurlijkTerrein: data.natuurlijk_terrein ?? null,
      dataJaar: data.jaar,
    };
  } catch {
    return createEmptyBodemgebruik();
  }
}

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
 * Haal groenpercentage op uit Supabase
 */
export async function fetchGroenpercentage(
  gebiedCode: string,
  _gebiedType: 'buurt' | 'wijk' | 'gemeente'
): Promise<GroenpercentageData> {
  try {
    const { data, error } = await supabase
      .from('groenpercentage')
      .select('percentage')
      .eq('code', gebiedCode)
      .order('jaar', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return { percentage: null };
    return { percentage: data.percentage ?? null };
  } catch {
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
  const stedelijk = bodemgebruik.stedelijkGroen ?? 0;
  const sport = bodemgebruik.sportterrein ?? 0;
  const recreatief = bodemgebruik.recreatiefTerrein ?? 0;
  const natuurlijk = bodemgebruik.natuurlijkTerrein ?? 0;

  const totaalGroenHa = stedelijk + sport + recreatief + natuurlijk;
  const totaalGroenM2 = totaalGroenHa * 10000;

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
 * Haalt per niveau apart het groenpercentage op voor een eerlijke vergelijking
 */
async function createVergelijking(
  gebiedType: 'buurt' | 'wijk' | 'gemeente',
  gebiedNaam: string,
  gebiedMetrics: GroenMetrics,
  wijkCode?: string,
  wijkNaam?: string,
  gemeenteCode?: string,
  gemeenteNaam?: string
): Promise<LeefomgevingVergelijking> {
  const vergelijking: LeefomgevingVergelijking = {
    nederland: {
      naam: 'Nederland',
      m2PerPersoon: NL_LEEFOMGEVING_REFERENTIES.m2GroenPerPersoon,
      groenPercentage: NL_LEEFOMGEVING_REFERENTIES.groenPercentage,
    },
  };

  if (gebiedType === 'buurt') {
    vergelijking.buurt = {
      naam: gebiedNaam,
      m2PerPersoon: gebiedMetrics.m2GroenPerPersoon,
      groenPercentage: gebiedMetrics.groenPercentage,
    };

    // Haal wijk-level groenpercentage apart op
    if (wijkCode && wijkNaam) {
      const wijkGroen = await fetchGroenpercentage(wijkCode, 'wijk');
      vergelijking.wijk = {
        naam: wijkNaam,
        m2PerPersoon: gebiedMetrics.m2GroenPerPersoon, // m2 is gemeente-niveau, zelfde voor alle
        groenPercentage: wijkGroen.percentage,
      };
    }

    // Haal gemeente-level groenpercentage apart op
    if (gemeenteCode && gemeenteNaam) {
      const gmGroen = await fetchGroenpercentage(gemeenteCode, 'gemeente');
      vergelijking.gemeente = {
        naam: gemeenteNaam,
        m2PerPersoon: gebiedMetrics.m2GroenPerPersoon,
        groenPercentage: gmGroen.percentage,
      };
    }
  } else if (gebiedType === 'wijk') {
    vergelijking.wijk = {
      naam: gebiedNaam,
      m2PerPersoon: gebiedMetrics.m2GroenPerPersoon,
      groenPercentage: gebiedMetrics.groenPercentage,
    };

    if (gemeenteCode && gemeenteNaam) {
      const gmGroen = await fetchGroenpercentage(gemeenteCode, 'gemeente');
      vergelijking.gemeente = {
        naam: gemeenteNaam,
        m2PerPersoon: gebiedMetrics.m2GroenPerPersoon,
        groenPercentage: gmGroen.percentage,
      };
    }
  } else {
    vergelijking.gemeente = {
      naam: gebiedNaam,
      m2PerPersoon: gebiedMetrics.m2GroenPerPersoon,
      groenPercentage: gebiedMetrics.groenPercentage,
    };
  }

  return vergelijking;
}

/**
 * Haal bevolkingsaantal op voor een gemeente uit kerncijfers
 */
async function fetchBevolking(code: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('kerncijfers')
      .select('bevolking')
      .eq('code', code)
      .order('jaar', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return 0;
    return data.bevolking?.totaal ?? 0;
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
  wijkCode?: string,
  wijkNaam?: string,
  gemeenteCode?: string,
  gemeenteNaam?: string,
  jaar?: number
): Promise<LeefomgevingData | null> {
  try {
    const isGemeenteNiveau = gebiedType !== 'gemeente';

    const [bodemgebruik, groenpercentage] = await Promise.all([
      fetchBodemgebruik(gebiedCode, gemeenteCode, jaar),
      fetchGroenpercentage(gebiedCode, gebiedType),
    ]);

    let bevolkingVoorBerekening = bevolking;
    if (isGemeenteNiveau && gemeenteCode) {
      const gemeenteBevolking = await fetchBevolking(gemeenteCode);
      if (gemeenteBevolking > 0) {
        bevolkingVoorBerekening = gemeenteBevolking;
      }
    }

    const metrics = calculateGroenMetrics(bodemgebruik, groenpercentage, bevolkingVoorBerekening);

    const vergelijking = await createVergelijking(
      gebiedType,
      gebiedNaam,
      metrics,
      wijkCode,
      wijkNaam,
      gemeenteCode,
      gemeenteNaam
    );

    return {
      bodemgebruik,
      groenpercentage,
      metrics,
      vergelijking,
      dataJaar: bodemgebruik.dataJaar ?? 2022,
      isGemeenteNiveau,
    };
  } catch (error) {
    console.error('Fout bij ophalen leefomgeving data:', error);
    return null;
  }
}
