import type {
  ZorgWelzijnData,
  ZorgTrend,
  ZorgVergelijking,
  ZorgVergelijkingNiveau,
} from '../types/zorgWelzijn';
import { supabase } from './supabase';
import { rateLimitedQuery } from '../utils/rateLimiter';

/**
 * Fetch RIVM zorg/welzijn data voor een specifieke regio uit Supabase
 */
async function fetchRIVMFromSupabase(code: string, jaar?: number) {
  return rateLimitedQuery(`rivm-${code}-${jaar ?? 'latest'}`, async () => {
    if (jaar) {
      const { data } = await supabase
        .from('rivm_gezondheid')
        .select('*')
        .eq('code', code)
        .eq('jaar', jaar)
        .maybeSingle();
      if (data) return data;
    }

    const { data, error } = await supabase
      .from('rivm_gezondheid')
      .select('*')
      .eq('code', code)
      .order('jaar', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  });
}

/**
 * Fetch trend data (alle jaren) voor een regio
 */
export async function fetchRIVMTrendData(regioCode: string): Promise<ZorgTrend> {
  return rateLimitedQuery(`rivm-trend-${regioCode}`, async () => {
  try {
    const { data, error } = await supabase
      .from('rivm_gezondheid')
      .select('jaar, eenzaamheid, mentale_gezondheid')
      .eq('code', regioCode)
      .order('jaar');

    if (error || !data) return { jaren: [] };

    const jaren = data.map((row) => ({
      jaar: row.jaar,
      eenzaam: row.eenzaamheid?.totaal ?? null,
      ernstigEenzaam: row.eenzaamheid?.ernstig ?? null,
      angstDepressie: row.mentale_gezondheid?.angstDepressie ?? null,
    }));

    return { jaren };
  } catch {
    return { jaren: [] };
  }
  });
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
    nederland: {
      naam: 'Nederland',
      eenzaam: 49.2,
      ernstigEenzaam: 14.4,
      angstDepressie: 10.2,
      ervarenGezondheid: 69,
      moeiteRondkomen: 20.5,
      vrijwilligerswerk: 23.8,
    }
  };

  const mapDataToNiveau = (data: Awaited<ReturnType<typeof fetchRIVMFromSupabase>>, naam: string): ZorgVergelijkingNiveau | null => {
    if (!data?.eenzaamheid?.totaal && !data?.mentale_gezondheid?.angstDepressie) return null;
    return {
      naam,
      eenzaam: data.eenzaamheid?.totaal ?? null,
      ernstigEenzaam: data.eenzaamheid?.ernstig ?? null,
      angstDepressie: data.mentale_gezondheid?.angstDepressie ?? null,
      ervarenGezondheid: data.zorg_ondersteuning?.ervarenGezondheid ?? null,
      moeiteRondkomen: data.zorg_ondersteuning?.moeiteRondkomen ?? null,
      vrijwilligerswerk: data.zorg_ondersteuning?.vrijwilligerswerk ?? null,
    };
  };

  const promises: Promise<void>[] = [];

  if (buurtCode) {
    promises.push(
      fetchRIVMFromSupabase(buurtCode).then(data => {
        const niveau = mapDataToNiveau(data, buurtNaam || buurtCode);
        if (niveau) vergelijking.buurt = niveau;
      })
    );
  }

  if (wijkCode) {
    promises.push(
      fetchRIVMFromSupabase(wijkCode).then(data => {
        const niveau = mapDataToNiveau(data, wijkNaam || wijkCode);
        if (niveau) vergelijking.wijk = niveau;
      })
    );
  }

  if (gemeenteCode) {
    promises.push(
      fetchRIVMFromSupabase(gemeenteCode).then(data => {
        const niveau = mapDataToNiveau(data, gemeenteNaam || gemeenteCode);
        if (niveau) vergelijking.gemeente = niveau;
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
  gemeenteNaam?: string,
  jaar?: number
): Promise<ZorgWelzijnData | null> {
  try {
    const [buurtData, trend, vergelijking] = await Promise.all([
      fetchRIVMFromSupabase(gebiedCode, jaar),
      fetchRIVMTrendData(gebiedCode),
      fetchZorgVergelijking(gebiedCode, wijkCode, gemeenteCode, gebiedNaam, wijkNaam, gemeenteNaam)
    ]);

    // Bepaal of buurt data bruikbaar is (niet all-null)
    let effectiveData = buurtData;
    const hasData = (d: typeof buurtData) =>
      d?.eenzaamheid?.totaal != null || d?.mentale_gezondheid?.angstDepressie != null;

    // Fallback: wijk -> gemeente als buurt data all-null is
    if (!hasData(effectiveData)) {
      if (wijkCode) {
        const wijkData = await fetchRIVMFromSupabase(wijkCode);
        if (hasData(wijkData)) effectiveData = wijkData;
      }
      if (!hasData(effectiveData) && gemeenteCode) {
        const gmData = await fetchRIVMFromSupabase(gemeenteCode);
        if (hasData(gmData)) effectiveData = gmData;
      }
    }

    if (!effectiveData) return null;

    return {
      eenzaamheid: effectiveData.eenzaamheid ?? {
        totaal: null, ernstig: null, emotioneel: null, sociaal: null,
      },
      mentaleGezondheid: effectiveData.mentale_gezondheid ?? {
        angstDepressie: null, psychischeKlachten: null, stress: null,
        emotioneleSteun: null, veerkracht: null,
      },
      zorgOndersteuning: effectiveData.zorg_ondersteuning ?? {
        mantelzorger: null, vrijwilligerswerk: null, ervarenGezondheid: null,
        langdurigeAandoeningen: null, beperkt: null, moeiteRondkomen: null,
      },
      dataJaar: effectiveData.jaar ?? 2022,
      trend,
      vergelijking,
    };
  } catch (error) {
    console.error('Error fetching zorg welzijn data:', error);
    return null;
  }
}
