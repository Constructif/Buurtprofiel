import type { Gebied, GebiedData, CriminaliteitTrend, VeiligheidsScoreVergelijking, BevolkingsDynamiek, HerkomstLandData } from '../types/gebied';
import type { OpleidingsniveauData, WerkgelegenheidData, UitkeringenData } from '../types/werkInkomen';
import { supabase } from './supabase';
import { rateLimitedQuery } from '../utils/rateLimiter';

// Default jaar voor queries (meest recente beschikbare data)
const DEFAULT_JAAR = 2025;
const WERKGELEGENHEID_JAAR = 2023; // 2024 dataset heeft geen werkgelegenheidsdata

// Laad alleen actieve gebiedscodes (buurten, wijken, gemeenten) uit Supabase
// Gebruikt RPC functie die filtert op gebieden die in kerncijfers bestaan voor het meest recente jaar
export async function loadAllGebieden(): Promise<Gebied[]> {
  return rateLimitedQuery('gebieden-all', async () => {
  let allGebieden: Gebied[] = [];
  let from = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .rpc('get_actieve_gebieden', { target_jaar: DEFAULT_JAAR })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Kan gebieden niet laden: ${error.message}`);
    if (!data || data.length === 0) break;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = data.map((g: any) => ({
      code: g.code,
      naam: g.naam,
      type: g.type as 'buurt' | 'wijk' | 'gemeente',
      wijkCode: g.wijk_code ?? undefined,
      wijkNaam: g.wijk_naam ?? undefined,
      gemeenteCode: g.gemeente_code ?? undefined,
      gemeenteNaam: g.gemeente_naam ?? undefined,
    }));

    allGebieden = allGebieden.concat(mapped);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allGebieden;
  });
}

// Bouw uitkeringen data uit kerncijfers JSONB + bereken per 1000
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildUitkeringen(kerncijfers: any, bevolking: number): UitkeringenData {
  const u = kerncijfers?.uitkeringen;
  if (!u) return { bijstand: null, ww: null, ao: null, aow: null, bijstandPer1000: null, wwPer1000: null, aoPer1000: null };

  const per1000 = (val: number | null) => (val !== null && bevolking > 0) ? Math.round((val / bevolking) * 10000) / 10 : null;

  return {
    bijstand: u.bijstand ?? null,
    ww: u.ww ?? null,
    ao: u.ao ?? null,
    aow: u.aow ?? null,
    bijstandPer1000: per1000(u.bijstand),
    wwPer1000: per1000(u.ww),
    aoPer1000: per1000(u.ao),
  };
}

// Haal CBS kerncijfers op voor een gebied uit Supabase
export async function fetchCBSData(code: string, naam: string, gebied?: Gebied, jaar?: number): Promise<GebiedData> {
  const targetJaar = jaar ?? DEFAULT_JAAR;
  return rateLimitedQuery(`cbs-${code}-${targetJaar}`, () => _fetchCBSData(code, naam, gebied, targetJaar));
}

async function _fetchCBSData(code: string, naam: string, gebied: Gebied | undefined, targetJaar: number): Promise<GebiedData> {
  // Opleiding en werkgelegenheid: max 2023 (nieuwere data niet beschikbaar)
  const opleidingJaar = Math.min(targetJaar, 2023);
  const werkJaar = Math.min(targetJaar, WERKGELEGENHEID_JAAR);

  // Parallel queries voor kerncijfers, criminaliteit, opleiding, werkgelegenheid
  const [kerncijfersResult, crimResult, opleidingResult, werkResult] = await Promise.all([
    supabase.from('kerncijfers').select('*').eq('code', code).eq('jaar', targetJaar).maybeSingle(),
    supabase.from('criminaliteit').select('*').eq('code', code).eq('jaar', targetJaar).maybeSingle(),
    supabase.from('opleiding').select('*').eq('code', code).eq('jaar', opleidingJaar).maybeSingle(),
    supabase.from('werkgelegenheid').select('*').eq('code', code).eq('jaar', werkJaar).maybeSingle(),
  ]);

  const kc = kerncijfersResult.data;
  const crim = crimResult.data;
  const opl = opleidingResult.data;
  const werk = werkResult.data;

  // Als geen kerncijfers voor gevraagd jaar, probeer meest recente jaar
  let kerncijfers = kc;
  let kerncijfersJaar = targetJaar;
  if (!kerncijfers) {
    const { data: fallback } = await supabase
      .from('kerncijfers')
      .select('*')
      .eq('code', code)
      .order('jaar', { ascending: false })
      .limit(1)
      .maybeSingle();
    kerncijfers = fallback;
    kerncijfersJaar = fallback?.jaar ?? targetJaar;
  }

  // Als geen criminaliteit voor default jaar, probeer meest recente jaar
  let crimData_raw = crim;
  if (!crimData_raw) {
    const { data: crimFallback } = await supabase
      .from('criminaliteit')
      .select('*')
      .eq('code', code)
      .order('jaar', { ascending: false })
      .limit(1)
      .maybeSingle();
    crimData_raw = crimFallback;
  }

  // Bevolking, huishoudens, woningen, inkomen uit JSONB kolommen
  const bevolking = kerncijfers?.bevolking ?? {
    totaal: 0, mannen: 0, vrouwen: 0, dichtheid: 0,
    leeftijd_0_14: 0, leeftijd_15_24: 0, leeftijd_25_44: 0, leeftijd_45_64: 0, leeftijd_65_plus: 0,
    nederlands: 0, westers: 0, nietWesters: 0,
  };

  const huishoudens = kerncijfers?.huishoudens ?? {
    totaal: 0, eenpersoons: 0, zonderKinderen: 0, metKinderen: 0, gemiddeldeGrootte: 0,
  };

  const woningen = kerncijfers?.woningen ?? {
    totaal: 0, koopPercentage: 0, huurPercentage: 0,
    huurSociaalPercentage: 0, huurParticulierPercentage: 0,
    meergezinsPercentage: 0, tussenwoningPercentage: 0, hoekwoningPercentage: 0,
    tweeOnderEenKapPercentage: 0, vrijstaandPercentage: 0,
  };

  // Inkomen: als null in huidig jaar, probeer ouder jaar (CBS publiceert inkomen later)
  let inkomen = kerncijfers?.inkomen ?? {
    gemiddeld: null, laagInkomenPercentage: null, hoogInkomenPercentage: null,
  };
  if (!inkomen.gemiddeld) {
    // JSONB null verschilt van SQL NULL — filter op text representatie
    const { data: inkomenFallback } = await supabase
      .from('kerncijfers')
      .select('inkomen')
      .eq('code', code)
      .gt('inkomen->>gemiddeld', '0')
      .order('jaar', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (inkomenFallback?.inkomen?.gemiddeld) {
      inkomen = inkomenFallback.inkomen;
    }
  }

  // Criminaliteit uit JSONB
  const crimData = crimData_raw?.data ?? {
    totaal: 0, geweld: 0, vermogen: 0, vernieling: 0, verkeer: 0,
    inbraakWoningen: 0, inbraakSchuur: 0, dieftalAutos: 0, dieftalUitAutos: 0,
    dieftalFietsen: 0, zakkenrollerij: 0, dieftalOverigeVoertuigen: 0,
    inbraakBedrijven: 0, winkeldiefstal: 0, overigeVermogen: 0,
    zedenmisdrijf: 0, moordDoodslag: 0, mishandeling: 0, bedreiging: 0,
    openlijkGeweld: 0, straatroof: 0, overval: 0,
    drugsOverlast: 0, burengerucht: 0, huisvredebreuk: 0,
    verkeersOngevallen: 0, rijdenOnderInvloed: 0,
    fraude: 0, brandOntploffing: 0, aantastingOpenbareOrde: 0, cybercrime: 0,
  };

  const dataJaar = crimData_raw?.jaar ?? kerncijfersJaar;

  // Jeugdzorg/WMO: fallback naar ouder jaar als alles null in huidig jaar
  let jeugdzorgWmo = kerncijfers?.jeugdzorg_wmo ?? {
    jeugdzorgAantal: null, jeugdzorgPercentage: null,
    wmoAantal: null, wmoPer1000: null,
  };
  if (jeugdzorgWmo.jeugdzorgAantal === null && jeugdzorgWmo.wmoAantal === null) {
    const { data: jzFallback } = await supabase
      .from('kerncijfers')
      .select('jeugdzorg_wmo')
      .eq('code', code)
      .gt('jeugdzorg_wmo->>jeugdzorgAantal', '0')
      .order('jaar', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (jzFallback?.jeugdzorg_wmo) {
      jeugdzorgWmo = jzFallback.jeugdzorg_wmo;
    }
  }

  // Uitkeringen: fallback naar ouder jaar als alles null
  let uitkeringenSource = kerncijfers;
  if (!kerncijfers?.uitkeringen?.bijstand && !kerncijfers?.uitkeringen?.aow) {
    const { data: uitkFallback } = await supabase
      .from('kerncijfers')
      .select('uitkeringen, bevolking')
      .eq('code', code)
      .gt('uitkeringen->>bijstand', '0')
      .order('jaar', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (uitkFallback?.uitkeringen) {
      uitkeringenSource = uitkFallback;
    }
  }

  // Opleiding
  let opleidingData: OpleidingsniveauData = {
    laag: opl?.laag ?? null,
    midden: opl?.midden ?? null,
    hoog: opl?.hoog ?? null,
  };

  // Converteer absolute aantallen naar percentages als nodig
  if (opleidingData.laag !== null && opleidingData.midden !== null && opleidingData.hoog !== null) {
    const totaal = (opleidingData.laag || 0) + (opleidingData.midden || 0) + (opleidingData.hoog || 0);
    if (totaal > 0 && totaal > 100) {
      // Absolute aantallen, converteer naar percentages
      opleidingData = {
        laag: Math.round(((opleidingData.laag || 0) / totaal) * 1000) / 10,
        midden: Math.round(((opleidingData.midden || 0) / totaal) * 1000) / 10,
        hoog: Math.round(((opleidingData.hoog || 0) / totaal) * 1000) / 10,
      };
    }
  }

  // Werkgelegenheid
  const werkgelegenheid: WerkgelegenheidData = {
    arbeidsparticipatie: werk?.arbeidsparticipatie ?? null,
    werknemers: werk?.werknemers ?? null,
    zelfstandigen: werk?.zelfstandigen ?? null,
    vast: werk?.vast ?? null,
    flexibel: werk?.flexibel ?? null,
  };

  const result: GebiedData = {
    code,
    naam,
    bevolking,
    huishoudens,
    woningen,
    inkomen,
    criminaliteit: crimData,
    jeugdzorgWmo: jeugdzorgWmo,
    werkInkomen: {
      opleiding: opleidingData,
      werkgelegenheid,
      uitkeringen: buildUitkeringen(uitkeringenSource, uitkeringenSource?.bevolking?.totaal ?? bevolking.totaal),
      dataJaar: kerncijfersJaar,
    },
    dataJaar,
    kerncijfersJaar,
  };

  // Fallback naar gemeente data voor werkgelegenheid/opleiding
  if (gebied && (gebied.type === 'buurt' || gebied.type === 'wijk') && gebied.gemeenteCode) {
    const werkgelegenheidHeeftData = result.werkInkomen!.werkgelegenheid.arbeidsparticipatie !== null;
    const opleidingHeeftData = result.werkInkomen!.opleiding.laag !== null;

    if (!werkgelegenheidHeeftData) {
      const gemeenteWerk = await fetchWerkgelegenheidData(gebied.gemeenteCode);
      if (gemeenteWerk.arbeidsparticipatie !== null) {
        result.werkInkomen!.werkgelegenheid = gemeenteWerk;
        result.werkInkomen!.werkgelegenheidIsGemeenteData = true;
        result.werkInkomen!.werkgelegenheidGemeenteNaam = gebied.gemeenteNaam;
      }
    }

    if (!opleidingHeeftData) {
      const gemeenteOpl = await fetchOpleidingsniveauData(gebied.gemeenteCode);
      if (gemeenteOpl.laag !== null) {
        result.werkInkomen!.opleiding = gemeenteOpl;
        result.werkInkomen!.opleidingIsGemeenteData = true;
      }
    }
  }

  return result;
}

// Haal criminaliteitstrend op (alle jaren)
export async function fetchCriminaliteitTrend(code: string): Promise<CriminaliteitTrend> {
  return rateLimitedQuery(`crim-trend-${code}`, async () => {
  try {
    const { data, error } = await supabase
      .from('criminaliteit')
      .select('jaar, data')
      .eq('code', code)
      .order('jaar');

    if (error || !data) return { jaren: [] };

    const jaren = data.map((row) => {
      const d = row.data;
      return {
        jaar: row.jaar,
        totaal: d.totaal ?? 0,
        vermogen: d.vermogen ?? 0,
        geweld: d.geweld ?? 0,
        vernieling: d.vernieling ?? 0,
        verkeer: d.verkeer ?? 0,
      };
    });

    return { jaren };
  } catch {
    return { jaren: [] };
  }
  });
}

// Bereken veiligheidsscore op basis van gewogen criminaliteit
// High-impact delicten (geweld + woninginbraak) wegen 2.5x zwaarder vanwege grotere
// impact op veiligheidsgevoel. Deler 12: bij 120 gewogen misdrijven/1000 = score 0.
// NL gemiddelde ~46 ongewogen/1000 komt na weging op ~60 gewogen/1000 = score 5.0.
function calculateVeiligheidsScore(
  geweld: number,
  inbraakWoningen: number,
  vermogen: number,
  vernieling: number,
  bevolking: number
): number | null {
  if (bevolking === 0) return null;

  const highImpact = geweld + inbraakWoningen;
  const veelvoorkomend = (vermogen - inbraakWoningen) + vernieling;
  const gewogenTotaal = (highImpact * 2.5) + veelvoorkomend;
  const gewogenPer1000 = (gewogenTotaal / bevolking) * 1000;
  const score = Math.max(0, Math.min(10, 10 - (gewogenPer1000 / 12)));
  return Math.round(score * 10) / 10;
}

// Haal minimale data op voor veiligheidsscoreberekening
async function fetchMinimalGebiedData(code: string) {
  // Probeer eerst DEFAULT_JAAR, daarna meest recente jaar
  const [kcResult, crimResult] = await Promise.all([
    supabase.from('kerncijfers').select('bevolking').eq('code', code).order('jaar', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('criminaliteit').select('data').eq('code', code).order('jaar', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const bevolking = kcResult.data?.bevolking?.totaal ?? 0;
  const d = crimResult.data?.data;
  if (!d) return null;

  return {
    geweld: d.geweld ?? 0,
    inbraakWoningen: d.inbraakWoningen ?? 0,
    vermogen: d.vermogen ?? 0,
    vernieling: d.vernieling ?? 0,
    bevolking,
  };
}

// Haal veiligheidsscore vergelijking op voor buurt, wijk, gemeente en Nederland
export async function fetchVeiligheidsVergelijking(
  gebied: Gebied,
  gebiedDataBevolking: number,
  _gebiedDataCriminaliteit: number,
  gebiedDataGeweld: number,
  gebiedDataInbraakWoningen: number,
  gebiedDataVermogen: number,
  gebiedDataVernieling: number,
  _gebiedDataBevolking2?: number
): Promise<VeiligheidsScoreVergelijking> {
  const vergelijking: VeiligheidsScoreVergelijking = {};

  const currentScore = calculateVeiligheidsScore(
    gebiedDataGeweld, gebiedDataInbraakWoningen, gebiedDataVermogen, gebiedDataVernieling, gebiedDataBevolking
  );

  if (currentScore !== null) {
    if (gebied.type === 'buurt') vergelijking.buurt = { score: currentScore, naam: gebied.naam };
    else if (gebied.type === 'wijk') vergelijking.wijk = { score: currentScore, naam: gebied.naam };
    else if (gebied.type === 'gemeente') vergelijking.gemeente = { score: currentScore, naam: gebied.naam };
  }

  const promises: Promise<void>[] = [];

  if (gebied.type === 'buurt' && gebied.wijkCode && gebied.wijkNaam) {
    const wijkCode = gebied.wijkCode;
    const wijkNaam = gebied.wijkNaam;
    promises.push(
      fetchMinimalGebiedData(wijkCode).then((data) => {
        if (data) {
          const score = calculateVeiligheidsScore(data.geweld, data.inbraakWoningen, data.vermogen, data.vernieling, data.bevolking);
          if (score !== null) vergelijking.wijk = { score, naam: wijkNaam };
        }
      })
    );
  }

  if ((gebied.type === 'buurt' || gebied.type === 'wijk') && gebied.gemeenteCode && gebied.gemeenteNaam) {
    const gemeenteCode = gebied.gemeenteCode;
    const gemeenteNaam = gebied.gemeenteNaam;
    promises.push(
      fetchMinimalGebiedData(gemeenteCode).then((data) => {
        if (data) {
          const score = calculateVeiligheidsScore(data.geweld, data.inbraakWoningen, data.vermogen, data.vernieling, data.bevolking);
          if (score !== null) vergelijking.gemeente = { score, naam: gemeenteNaam };
        }
      })
    );
  }

  // Nederland (NL00)
  promises.push(
    fetchMinimalGebiedData('NL00').then((data) => {
      if (data) {
        const score = calculateVeiligheidsScore(data.geweld, data.inbraakWoningen, data.vermogen, data.vernieling, data.bevolking);
        if (score !== null) vergelijking.nederland = { score, naam: 'Nederland' };
      }
    })
  );

  await Promise.all(promises);
  return vergelijking;
}

// Haal verhuisbewegingen op voor een gemeente
export async function fetchVerhuisbewegingen(gemeenteCode: string): Promise<BevolkingsDynamiek> {
  try {
    const { data, error } = await supabase
      .from('bevolkings_dynamiek')
      .select('*')
      .eq('gemeente_code', gemeenteCode)
      .order('jaar');

    if (error || !data || data.length === 0) return { jaren: [] };

    const jaren = data.map((row) => ({
      jaar: row.jaar,
      geboorte: row.geboorte ?? 0,
      sterfte: row.sterfte ?? 0,
      vestiging: row.vestiging ?? undefined,
      vertrek: row.vertrek ?? undefined,
      saldo: row.saldo ?? 0,
    }));

    return { jaren };
  } catch {
    return { jaren: [] };
  }
}

// Haal herkomstland data op voor een gemeente
export async function fetchHerkomstLandData(gemeenteCode: string, jaar?: number): Promise<HerkomstLandData> {
  try {
    // Probeer eerst exact jaar
    if (jaar) {
      const { data } = await supabase
        .from('herkomst_land')
        .select('*')
        .eq('gemeente_code', gemeenteCode)
        .eq('jaar', jaar)
        .maybeSingle();
      if (data) {
        return {
          totaal: data.totaal ?? 0,
          landen: data.landen ?? [],
          dataJaar: data.jaar,
          gemeenteBevolking: data.gemeente_bevolking ?? undefined,
        };
      }
    }

    // Fallback: meest recente jaar
    const { data, error } = await supabase
      .from('herkomst_land')
      .select('*')
      .eq('gemeente_code', gemeenteCode)
      .order('jaar', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return { totaal: 0, landen: [] };

    return {
      totaal: data.totaal ?? 0,
      landen: data.landen ?? [],
      dataJaar: data.jaar,
      gemeenteBevolking: data.gemeente_bevolking ?? undefined,
    };
  } catch {
    return { totaal: 0, landen: [] };
  }
}

// Haal opleidingsniveau data op
export async function fetchOpleidingsniveauData(code: string): Promise<OpleidingsniveauData> {
  const emptyResult: OpleidingsniveauData = { laag: null, midden: null, hoog: null };

  try {
    const { data, error } = await supabase
      .from('opleiding')
      .select('laag, midden, hoog')
      .eq('code', code)
      .order('jaar', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return emptyResult;

    // Converteer absolute aantallen naar percentages
    const totaal = (data.laag || 0) + (data.midden || 0) + (data.hoog || 0);
    if (totaal === 0) return emptyResult;

    if (totaal > 100) {
      // Absolute aantallen
      return {
        laag: Math.round(((data.laag || 0) / totaal) * 1000) / 10,
        midden: Math.round(((data.midden || 0) / totaal) * 1000) / 10,
        hoog: Math.round(((data.hoog || 0) / totaal) * 1000) / 10,
      };
    }

    // Al percentages
    return { laag: data.laag, midden: data.midden, hoog: data.hoog };
  } catch {
    return emptyResult;
  }
}

/**
 * Laad alle data voor een gebied (CBS + trend + vergelijking + herkomst).
 * Herbruikbaar voor zowel initiële selectie als jaar-wisseling.
 */
export async function loadGebiedData(gebied: Gebied, jaar: number): Promise<{
  gebiedData: GebiedData;
  gemeenteData: GebiedData | null;
}> {
  const gemeenteCode = gebied.type === 'gemeente'
    ? gebied.code
    : gebied.gemeenteCode;

  const gemeenteGebied: Gebied = {
    code: gemeenteCode || gebied.code,
    naam: gebied.gemeenteNaam || gebied.naam,
    type: 'gemeente',
  };

  const [data, trendData, bevolkingsDynamiek, herkomstLandGemeente, gemeenteResult] = await Promise.all([
    fetchCBSData(gebied.code, gebied.naam, gebied, jaar),
    fetchCriminaliteitTrend(gebied.code),
    gemeenteCode ? fetchVerhuisbewegingen(gemeenteCode) : Promise.resolve({ jaren: [] }),
    gemeenteCode ? fetchHerkomstLandData(gemeenteCode, jaar) : Promise.resolve({ totaal: 0, landen: [] }),
    (gebied.type !== 'gemeente' && gemeenteCode)
      ? fetchCBSData(gemeenteCode, gebied.gemeenteNaam || '', gemeenteGebied, jaar)
      : Promise.resolve(null),
  ]);

  const veiligheidsVergelijking = await fetchVeiligheidsVergelijking(
    gebied,
    data.bevolking.totaal,
    data.criminaliteit.totaal,
    data.criminaliteit.geweld,
    data.criminaliteit.inbraakWoningen,
    data.criminaliteit.vermogen,
    data.criminaliteit.vernieling
  );

  const gebiedData: GebiedData = {
    ...data,
    criminaliteitTrend: trendData,
    veiligheidsVergelijking,
    bevolkingsDynamiek,
    herkomstLandGemeente: herkomstLandGemeente.landen.length > 0 ? herkomstLandGemeente : undefined,
    gemeenteNaam: gebied.gemeenteNaam || gebied.naam,
  };

  return { gebiedData, gemeenteData: gemeenteResult };
}

// Haal werkgelegenheidsdata op
export async function fetchWerkgelegenheidData(code: string): Promise<WerkgelegenheidData> {
  const emptyResult: WerkgelegenheidData = {
    arbeidsparticipatie: null, werknemers: null, zelfstandigen: null, vast: null, flexibel: null,
  };

  try {
    const { data, error } = await supabase
      .from('werkgelegenheid')
      .select('arbeidsparticipatie, werknemers, zelfstandigen, vast, flexibel')
      .eq('code', code)
      .order('jaar', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return emptyResult;

    return {
      arbeidsparticipatie: data.arbeidsparticipatie ?? null,
      werknemers: data.werknemers ?? null,
      zelfstandigen: data.zelfstandigen ?? null,
      vast: data.vast ?? null,
      flexibel: data.flexibel ?? null,
    };
  } catch {
    return emptyResult;
  }
}

// === Per-Card jaar fetchers (voor useCardYear hook) ===

/** Haal criminaliteitsdata op voor een specifiek jaar */
export async function fetchCriminaliteitForYear(code: string, jaar: number) {
  const { data } = await supabase
    .from('criminaliteit')
    .select('data, jaar')
    .eq('code', code)
    .eq('jaar', jaar)
    .maybeSingle();

  if (!data) {
    // Fallback naar dichtstbijzijnde jaar
    const { data: fallback } = await supabase
      .from('criminaliteit')
      .select('data, jaar')
      .eq('code', code)
      .order('jaar', { ascending: false })
      .limit(1)
      .maybeSingle();
    return fallback ? { ...fallback.data, _jaar: fallback.jaar } : null;
  }
  return { ...data.data, _jaar: data.jaar };
}

/** Haal criminaliteit trend data op (alle jaren, voor trend chart) */
export async function fetchCriminaliteitAllYears(code: string) {
  const { data } = await supabase
    .from('criminaliteit')
    .select('jaar, data')
    .eq('code', code)
    .order('jaar');

  if (!data) return [];
  return data.map((row) => ({
    jaar: row.jaar,
    totaal: row.data?.totaal ?? 0,
    vermogen: row.data?.vermogen ?? 0,
    geweld: row.data?.geweld ?? 0,
    vernieling: row.data?.vernieling ?? 0,
    verkeer: row.data?.verkeer ?? 0,
  }));
}

/** Haal kerncijfers op voor een specifiek jaar */
export async function fetchKerncijfersForYear(code: string, jaar: number) {
  const { data } = await supabase
    .from('kerncijfers')
    .select('*')
    .eq('code', code)
    .eq('jaar', jaar)
    .maybeSingle();

  if (!data) {
    const { data: fallback } = await supabase
      .from('kerncijfers')
      .select('*')
      .eq('code', code)
      .order('jaar', { ascending: false })
      .limit(1)
      .maybeSingle();
    return fallback ? { ...fallback, _jaar: fallback.jaar } : null;
  }
  return { ...data, _jaar: data.jaar };
}

/** Haal kerncijfers trend data (bevolking per jaar) */
export async function fetchKerncijfersAllYears(code: string) {
  const { data } = await supabase
    .from('kerncijfers')
    .select('jaar, bevolking, huishoudens, woningen, inkomen')
    .eq('code', code)
    .order('jaar');

  if (!data) return [];
  return data.map((row) => ({
    jaar: row.jaar,
    bevolking: row.bevolking?.totaal ?? 0,
    huishoudens: row.huishoudens?.totaal ?? 0,
    dichtheid: row.bevolking?.dichtheid ?? 0,
    inkomen: row.inkomen?.gemiddeld ?? null,
  }));
}

/** Haal herkomst_land data op voor een specifiek jaar (voor per-card switching) */
export async function fetchHerkomstLandForYear(gemeenteCode: string, jaar: number): Promise<HerkomstLandData> {
  return fetchHerkomstLandData(gemeenteCode, jaar);
}

/** Haal herkomst_land trend data: alle beschikbare jaren */
export async function fetchHerkomstLandAllYears(gemeenteCode: string) {
  const { data } = await supabase
    .from('herkomst_land')
    .select('jaar, totaal')
    .eq('gemeente_code', gemeenteCode)
    .order('jaar');

  if (!data) return [];
  return data.map((row) => ({
    jaar: row.jaar,
    herkomstTotaal: row.totaal ?? 0,
  }));
}
