import { useState, useCallback } from 'react';
import { useGebiedStore } from '../../../../store/gebiedStore';
import { CardTrendChart } from '../../../ui/CardTrendChart';
import { InfoGrid } from '../../../ui/InfoGrid';
import { fetchKerncijfersForYear, fetchKerncijfersAllYears, fetchHerkomstLandForYear, fetchHerkomstLandAllYears } from '../../../../services/cbs';
import { useCardYear } from '../../../../hooks/useCardYear';
import type { HerkomstLandData } from '../../../../types/gebied';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

function fmt(n: number) { return n.toLocaleString('nl-NL'); }
function pct(v: number, t: number) { return t ? Math.round((v / t) * 100) : 0; }

const COLORS = ['#eb6608', '#1d1d1b', '#3498db', '#2ecc71', '#e74c3c', '#9b59b6'];
const EUROPESE_LANDEN = ['Duitsland', 'Polen', 'België', 'Roemenië', 'Bulgarije', 'Westers totaal'];
function herkomstKleur(land: string) { return EUROPESE_LANDEN.includes(land) ? '#1d1d1b' : '#3498db'; }

function Spinner() {
  return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Laden...</div>;
}

export function BewonersSection({ sectionId }: { sectionId: string }) {
  const { gebiedData, selectedGebied } = useGebiedStore();
  const [showInfo, setShowInfo] = useState(false);

  const code = gebiedData?.code ?? '';
  const gemeenteCode = selectedGebied?.gemeenteCode || selectedGebied?.code || '';
  const defaultJaar = gebiedData?.kerncijfersJaar ?? 2025;

  const kcFetcher = useCallback((jaar: number) => fetchKerncijfersForYear(code, jaar), [code]);
  const kcTrend = useCallback(() => fetchKerncijfersAllYears(code), [code]);
  const hlFetcher = useCallback((jaar: number) => fetchHerkomstLandForYear(gemeenteCode, jaar), [gemeenteCode]);
  const hlTrend = useCallback(() => fetchHerkomstLandAllYears(gemeenteCode), [gemeenteCode]);

  const demoCard = useCardYear(defaultJaar, kcFetcher, kcTrend);
  const leeftCard = useCardYear(defaultJaar, kcFetcher, kcTrend);
  const herkCard = useCardYear(defaultJaar, kcFetcher, kcTrend);
  const huishCard = useCardYear(defaultJaar, kcFetcher, kcTrend);
  const hlCard = useCardYear<HerkomstLandData>(
    gebiedData?.herkomstLandGemeente?.dataJaar ?? 2025, hlFetcher, hlTrend
  );

  if (!gebiedData || !selectedGebied) return <Spinner />;

  const getBev = (card: typeof demoCard) => ({
    bev: card.overrideData?.bevolking ?? gebiedData.bevolking,
    hh: card.overrideData?.huishoudens ?? gebiedData.huishoudens,
    jaar: card.overrideData?._jaar ?? gebiedData.kerncijfersJaar,
  });

  if (sectionId === 'bewoners-demografisch') {
    const { bev, jaar } = getBev(demoCard);
    const dichtheidLabel = bev.dichtheid > 5000 ? 'Zeer dicht' : bev.dichtheid > 2500 ? 'Dicht' : bev.dichtheid > 1000 ? 'Matig dicht' : 'Dunbevolkt';
    return (
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Demografische Gegevens</h3>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>{jaar}</span>
        </div>
        {demoCard.isLoading ? <Spinner /> : demoCard.activeMode === 'trend' && demoCard.trendData ? (
          <CardTrendChart data={demoCard.trendData} lines={[
            { key: 'bevolking', label: 'Bevolking', color: '#eb6608' },
            { key: 'dichtheid', label: 'Dichtheid (per km²)', color: '#3498db' },
          ]} />
        ) : (
          <>
            <InfoGrid items={[{ label: 'Totaal inwoners', value: fmt(bev.totaal) }]} />
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Bevolkingsdichtheid:</span>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{fmt(bev.dichtheid)} per km²</span>
              <span style={{ fontSize: '12px', padding: '2px 8px', backgroundColor: bev.dichtheid > 2500 ? '#fef3c7' : '#dcfce7', color: bev.dichtheid > 2500 ? '#b45309' : '#15803d', borderRadius: '4px' }}>{dichtheidLabel}</span>
              <button onClick={() => setShowInfo(!showInfo)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (sectionId === 'bewoners-leeftijd') {
    const { bev, jaar } = getBev(leeftCard);
    const data = [
      { name: '0-14', value: bev.leeftijd_0_14, percentage: pct(bev.leeftijd_0_14, bev.totaal) },
      { name: '15-24', value: bev.leeftijd_15_24, percentage: pct(bev.leeftijd_15_24, bev.totaal) },
      { name: '25-44', value: bev.leeftijd_25_44, percentage: pct(bev.leeftijd_25_44, bev.totaal) },
      { name: '45-64', value: bev.leeftijd_45_64, percentage: pct(bev.leeftijd_45_64, bev.totaal) },
      { name: '65+', value: bev.leeftijd_65_plus, percentage: pct(bev.leeftijd_65_plus, bev.totaal) },
    ];
    return (
      <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Leeftijdsverdeling</h3>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>{jaar}</span>
        </div>
        {leeftCard.isLoading ? <Spinner /> : (
          <div style={{ flex: 1, minHeight: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v, _, p) => [`${fmt(v as number)} (${(p.payload as { percentage: number }).percentage}%)`, 'Aantal']} />
                <Bar dataKey="value" fill="#eb6608" radius={[4, 4, 0, 0]} animationDuration={300} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  if (sectionId === 'bewoners-herkomst') {
    const { bev, jaar } = getBev(herkCard);
    const totaalMig = bev.nederlands + bev.westers + bev.nietWesters;
    const data = [
      { name: 'Nederland', value: bev.nederlands, percentage: pct(bev.nederlands, totaalMig) },
      { name: 'Europa (excl. NL)', value: bev.westers, percentage: pct(bev.westers, totaalMig) },
      { name: 'Buiten Europa', value: bev.nietWesters, percentage: pct(bev.nietWesters, totaalMig) },
    ];
    return (
      <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Herkomst Bevolking</h3>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>{jaar}</span>
        </div>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 12px' }}>Geboorteland van bewoner of ouders (CBS indeling)</p>
        {herkCard.isLoading ? <Spinner /> : (
          <div style={{ flex: 1, minHeight: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} animationDuration={300}
                  label={(e) => `${e.name} (${Math.round((e.percent || 0) * 100)}%)`}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v as number)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  if (sectionId === 'bewoners-herkomstland') {
    const { herkomstLandGemeente, gemeenteNaam } = gebiedData;
    const hlData = hlCard.overrideData ?? herkomstLandGemeente;
    const jaar = hlCard.overrideData?.dataJaar ?? herkomstLandGemeente?.dataJaar;

    if (hlCard.isLoading) return <div style={{ padding: '16px' }}><Spinner /></div>;
    if (!hlData || hlData.landen.length === 0) return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
        <p>Herkomst per land niet beschikbaar voor deze gemeente</p>
      </div>
    );

    const gemBev = hlData.gemeenteBevolking;
    const totBev = (gemBev?.totaal ?? 0) || (gemBev?.nederlands ?? 0) + (gemBev?.westers ?? 0) + (gemBev?.nietWesters ?? 0);
    const pctNL = totBev > 0 ? Math.round(((gemBev?.nederlands ?? 0) / totBev) * 100) : 0;
    const pctEU = totBev > 0 ? Math.round(((gemBev?.westers ?? 0) / totBev) * 100) : 0;
    const pctBE = totBev > 0 ? Math.round(((gemBev?.nietWesters ?? 0) / totBev) * 100) : 0;

    const euL = hlData.landen.filter(l => EUROPESE_LANDEN.includes(l.land));
    const beL = hlData.landen.filter(l => !EUROPESE_LANDEN.includes(l.land));
    const totEU = euL.reduce((s, l) => s + l.aantal, 0);
    const totBE2 = beL.reduce((s, l) => s + l.aantal, 0);
    const landen = [
      ...euL.map(l => ({ ...l, percentage: totEU > 0 ? Math.round((l.aantal / totEU) * pctEU * 10) / 10 : 0 })),
      ...beL.map(l => ({ ...l, percentage: totBE2 > 0 ? Math.round((l.aantal / totBE2) * pctBE * 10) / 10 : 0 })),
    ].sort((a, b) => b.percentage - a.percentage).slice(0, 10);

    return (
      <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Herkomst per Land{gemeenteNaam ? ` — ${gemeenteNaam}` : ''}</h3>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>{jaar}</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {[['#eb6608', pctNL, 'Nederland'], ['#1d1d1b', pctEU, 'Europa'], ['#3498db', pctBE, 'Buiten Europa']].map(([color, val, lbl]) => (
            <div key={lbl as string} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: color as string, borderRadius: '2px' }} />
              <span style={{ fontWeight: 600 }}>{val}%</span>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>{lbl as string}</span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, minHeight: '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={landen} layout="vertical" margin={{ left: 80, right: 20 }}>
              <XAxis type="number" unit="%" />
              <YAxis type="category" dataKey="land" tick={{ fontSize: 11 }} width={75} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="percentage" radius={[0, 4, 4, 0]} animationDuration={300}>
                {landen.map((item, i) => <Cell key={i} fill={herkomstKleur(item.land)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (sectionId === 'bewoners-huishoudens') {
    const { hh, jaar } = getBev(huishCard);
    const data = [
      { name: 'Alleenstaand', value: hh.eenpersoons },
      { name: 'Paar zonder kinderen', value: hh.zonderKinderen },
      { name: 'Gezin met kinderen', value: hh.metKinderen },
    ];
    return (
      <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Huishoudenstypen</h3>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>{jaar}</span>
        </div>
        <div style={{ display: 'flex', gap: '24px', marginBottom: '12px' }}>
          <div><span style={{ fontSize: '12px', color: '#6b7280' }}>Totaal</span><p style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{fmt(hh.totaal)}</p></div>
          <div><span style={{ fontSize: '12px', color: '#6b7280' }}>Gem. grootte</span><p style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{hh.gemiddeldeGrootte.toFixed(1)} pers.</p></div>
        </div>
        {huishCard.isLoading ? <Spinner /> : (
          <div style={{ flex: 1, minHeight: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip formatter={(v) => fmt(v as number)} />
                <Bar dataKey="value" fill="#1d1d1b" animationDuration={300} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  return null;
}
