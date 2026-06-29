import { useState, useCallback } from 'react';
import { useGebiedStore } from '../../../../store/gebiedStore';
import { CardTrendChart } from '../../../ui/CardTrendChart';
import { fetchCriminaliteitForYear, fetchCriminaliteitAllYears } from '../../../../services/cbs';
import { useCardYear } from '../../../../hooks/useCardYear';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

function Spinner() { return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Laden...</div>; }
function SectionHeader({ title, jaar }: { title: string; jaar?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{title}</h3>
      {jaar && <span style={{ fontSize: '12px', color: '#9ca3af' }}>{jaar}</span>}
    </div>
  );
}
function MeldingRow({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', backgroundColor: highlight ? '#eb6608' : '#f5f1ee', fontSize: '13px' }}>
      <span style={{ color: highlight ? 'white' : '#4b5563' }}>{label}</span>
      <span style={{ fontWeight: 700, color: highlight ? 'white' : '#1d1d1b' }}>{value}</span>
    </div>
  );
}
function StatBox({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{ padding: '12px', backgroundColor: highlight ? '#eb6608' : '#f5f1ee', textAlign: 'center' }}>
      <p style={{ fontSize: '11px', color: highlight ? 'rgba(255,255,255,0.8)' : '#6b7280', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '22px', fontWeight: 700, color: highlight ? 'white' : '#1d1d1b', margin: 0 }}>{value}</p>
    </div>
  );
}
function ScoreKolom({ label, score, naam, isActive }: { label: string; score?: number; naam?: string; isActive: boolean }) {
  const kleur = score !== undefined ? (score >= 7 ? '#22c55e' : score >= 5 ? '#f59e0b' : '#ef4444') : '#d1d5db';
  return (
    <div style={{ flex: '1 1 70px', textAlign: 'center', padding: '10px 6px', backgroundColor: isActive ? '#f5f1ee' : 'transparent', border: isActive ? '2px solid #eb6608' : '1px solid #e5e7eb' }}>
      <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '22px', fontWeight: 700, color: kleur, margin: 0 }}>{score !== undefined ? score.toFixed(1) : '-'}</p>
      {naam && <p style={{ fontSize: '9px', color: '#9ca3af', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{naam}</p>}
    </div>
  );
}

export function VeiligheidSection({ sectionId }: { sectionId: string }) {
  const { gebiedData, selectedGebied } = useGebiedStore();
  const code = gebiedData?.code ?? '';
  const defaultJaar = gebiedData?.dataJaar ?? 2025;

  const fetcher = useCallback((jaar: number) => fetchCriminaliteitForYear(code, jaar), [code]);
  const trendFetcher = useCallback(() => fetchCriminaliteitAllYears(code), [code]);

  const cijfersCard = useCardYear(defaultJaar, fetcher, trendFetcher);
  const vermogenCard = useCardYear(defaultJaar, fetcher, trendFetcher);
  const geweldCard = useCardYear(defaultJaar, fetcher, trendFetcher);
  const overlastCard = useCardYear(defaultJaar, fetcher, trendFetcher);
  const verkeerCard = useCardYear(defaultJaar, fetcher, trendFetcher);

  if (!gebiedData || !selectedGebied) return <Spinner />;

  const getCrim = (card: typeof cijfersCard) => ({
    crim: card.overrideData ? { ...card.overrideData, _jaar: undefined } : gebiedData.criminaliteit,
    jaar: card.overrideData?._jaar ?? gebiedData.dataJaar,
  });

  const { criminaliteit, bevolking, veiligheidsVergelijking, criminaliteitTrend, dataJaar } = gebiedData;

  // Veiligheidsscore berekening
  const calcScore = () => {
    if (!bevolking.totaal) return null;
    const hi = criminaliteit.geweld + criminaliteit.inbraakWoningen;
    const vc = criminaliteit.vermogen - criminaliteit.inbraakWoningen + criminaliteit.vernieling;
    const gewogen = (hi * 2.5 + vc) / bevolking.totaal * 1000;
    const per1000 = criminaliteit.totaal / bevolking.totaal * 1000;
    return { score: Math.round(Math.max(0, Math.min(10, 10 - gewogen / 12)) * 10) / 10, per1000: Math.round(per1000) };
  };
  const scoreRes = calcScore();
  const scoreColor = scoreRes ? (scoreRes.score >= 7 ? '#22c55e' : scoreRes.score >= 5 ? '#f59e0b' : '#ef4444') : '#9ca3af';

  const bekendeTotaal = criminaliteit.vermogen + criminaliteit.geweld + criminaliteit.vernieling +
    criminaliteit.drugsOverlast + criminaliteit.burengerucht + criminaliteit.huisvredebreuk +
    criminaliteit.fraude + criminaliteit.verkeer + criminaliteit.brandOntploffing +
    criminaliteit.aantastingOpenbareOrde + criminaliteit.cybercrime;
  const overig = Math.max(0, criminaliteit.totaal - bekendeTotaal);
  const pieData = [
    { name: 'Vermogensdelicten', value: criminaliteit.vermogen, color: '#eb6608' },
    { name: 'Geweldsdelicten', value: criminaliteit.geweld, color: '#e74c3c' },
    { name: 'Vernielingen', value: criminaliteit.vernieling, color: '#3498db' },
    { name: 'Verkeer', value: criminaliteit.verkeer, color: '#f39c12' },
    { name: 'Overlast', value: criminaliteit.drugsOverlast + criminaliteit.burengerucht + criminaliteit.huisvredebreuk, color: '#9b59b6' },
    { name: 'Fraude', value: criminaliteit.fraude, color: '#2ecc71' },
    { name: 'Overig', value: overig + criminaliteit.brandOntploffing + criminaliteit.aantastingOpenbareOrde + criminaliteit.cybercrime, color: '#95a5a6' },
  ].filter(d => d.value > 0);

  if (sectionId === 'veiligheid-score') {
    return (
      <div style={{ padding: '16px' }}>
        <SectionHeader title="Veiligheidsscore" jaar={dataJaar} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', minWidth: '100px' }}>
            <div style={{ fontSize: '48px', fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
              {scoreRes ? scoreRes.score.toFixed(1) : '-'}
              <span style={{ fontSize: '18px', color: '#d1d5db' }}>/10</span>
            </div>
            {scoreRes && <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>{scoreRes.per1000} per 1.000 inw.</p>}
          </div>
          {veiligheidsVergelijking && (
            <div style={{ display: 'flex', gap: '8px', flex: 1, flexWrap: 'wrap' }}>
              <ScoreKolom label="Buurt" score={veiligheidsVergelijking.buurt?.score} naam={veiligheidsVergelijking.buurt?.naam} isActive={selectedGebied.type === 'buurt'} />
              <ScoreKolom label="Wijk" score={veiligheidsVergelijking.wijk?.score} naam={veiligheidsVergelijking.wijk?.naam} isActive={selectedGebied.type === 'wijk'} />
              <ScoreKolom label="Gemeente" score={veiligheidsVergelijking.gemeente?.score} naam={veiligheidsVergelijking.gemeente?.naam} isActive={selectedGebied.type === 'gemeente'} />
              <ScoreKolom label="Nederland" score={veiligheidsVergelijking.nederland?.score} isActive={false} />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (sectionId === 'veiligheid-crimtype') {
    return (
      <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <SectionHeader title="Criminaliteit per Type" jaar={dataJaar} />
        {criminaliteit.totaal > 0 ? (
          <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ width: '150px', height: '150px', flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={65} innerRadius={30} animationDuration={300}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} meldingen`, n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1 }}>
              {pieData.map(item => {
                const pct = Math.round((item.value / criminaliteit.totaal) * 100);
                return (
                  <div key={item.name} style={{ marginBottom: '5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ fontSize: '11px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', backgroundColor: item.color, display: 'inline-block', borderRadius: '1px' }} />
                        {item.name}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 600 }}>{item.value} ({pct}%)</span>
                    </div>
                    <div style={{ height: '3px', backgroundColor: '#f3f4f6' }}>
                      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Geen data</div>}
      </div>
    );
  }

  if (sectionId === 'veiligheid-trend') {
    return (
      <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <SectionHeader title="Trend (5 jaar)" jaar={dataJaar} />
        {criminaliteitTrend?.jaren && criminaliteitTrend.jaren.length > 0 ? (
          <div style={{ flex: 1, minHeight: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={criminaliteitTrend.jaren} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="jaar" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={35} />
                <Tooltip formatter={(v, n) => [v, ({ vermogen: 'Vermogen', geweld: 'Geweld', vernieling: 'Vernieling', verkeer: 'Verkeer' } as Record<string, string>)[String(n)] || String(n)]} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="vermogen" stroke="#eb6608" strokeWidth={2} dot={{ r: 3 }} animationDuration={300} />
                <Line type="monotone" dataKey="geweld" stroke="#e74c3c" strokeWidth={2} dot={{ r: 3 }} animationDuration={300} />
                <Line type="monotone" dataKey="vernieling" stroke="#3498db" strokeWidth={2} dot={{ r: 3 }} animationDuration={300} />
                <Line type="monotone" dataKey="verkeer" stroke="#f39c12" strokeWidth={2} dot={{ r: 3 }} animationDuration={300} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Geen trenddata beschikbaar</div>}
      </div>
    );
  }

  if (sectionId === 'veiligheid-cijfers') {
    const { crim, jaar } = getCrim(cijfersCard);
    return (
      <div style={{ padding: '16px' }}>
        <SectionHeader title="Criminaliteitscijfers" jaar={jaar} />
        {cijfersCard.isLoading ? <Spinner /> : cijfersCard.activeMode === 'trend' && cijfersCard.trendData ? (
          <CardTrendChart data={cijfersCard.trendData} lines={[
            { key: 'totaal', label: 'Totaal', color: '#1d1d1b' },
            { key: 'vermogen', label: 'Vermogen', color: '#eb6608' },
            { key: 'geweld', label: 'Geweld', color: '#e74c3c' },
          ]} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
            <StatBox label="Totaal" value={crim.totaal} highlight />
            <StatBox label="Vermogen" value={crim.vermogen} />
            <StatBox label="Geweld" value={crim.geweld} />
            <StatBox label="Vernieling" value={crim.vernieling} />
            <StatBox label="Verkeer" value={crim.verkeer} />
          </div>
        )}
      </div>
    );
  }

  if (sectionId === 'veiligheid-vermogen') {
    const { crim, jaar } = getCrim(vermogenCard);
    return (
      <div style={{ padding: '16px' }}>
        <SectionHeader title="Vermogensdelicten" jaar={jaar} />
        {vermogenCard.isLoading ? <Spinner /> : vermogenCard.activeMode === 'trend' && vermogenCard.trendData ? (
          <CardTrendChart data={vermogenCard.trendData} lines={[{ key: 'vermogen', label: 'Vermogensdelicten', color: '#eb6608' }]} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <MeldingRow label="Inbraak woningen" value={crim.inbraakWoningen} />
            <MeldingRow label="Inbraak schuur/garage" value={crim.inbraakSchuur} />
            <MeldingRow label="Inbraak bedrijven" value={crim.inbraakBedrijven} />
            <MeldingRow label="Diefstal auto's" value={crim.dieftalAutos} />
            <MeldingRow label="Diefstal uit auto's" value={crim.dieftalUitAutos} />
            <MeldingRow label="Fietsendiefstal" value={crim.dieftalFietsen} />
            <MeldingRow label="Zakkenrollerij" value={crim.zakkenrollerij} />
            <MeldingRow label="Winkeldiefstal" value={crim.winkeldiefstal} />
          </div>
        )}
      </div>
    );
  }

  if (sectionId === 'veiligheid-geweld') {
    const { crim, jaar } = getCrim(geweldCard);
    return (
      <div style={{ padding: '16px' }}>
        <SectionHeader title="Geweldsdelicten" jaar={jaar} />
        {geweldCard.isLoading ? <Spinner /> : geweldCard.activeMode === 'trend' && geweldCard.trendData ? (
          <CardTrendChart data={geweldCard.trendData} lines={[{ key: 'geweld', label: 'Geweldsdelicten', color: '#e74c3c' }]} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <MeldingRow label="Mishandeling" value={crim.mishandeling} />
            <MeldingRow label="Bedreiging" value={crim.bedreiging} />
            <MeldingRow label="Openlijk geweld" value={crim.openlijkGeweld} />
            <MeldingRow label="Straatroof" value={crim.straatroof} />
            <MeldingRow label="Overval" value={crim.overval} />
            <MeldingRow label="Zedenmisdrijf" value={crim.zedenmisdrijf} />
            <MeldingRow label="Moord/doodslag" value={crim.moordDoodslag} />
          </div>
        )}
      </div>
    );
  }

  if (sectionId === 'veiligheid-overlast') {
    const { crim, jaar } = getCrim(overlastCard);
    return (
      <div style={{ padding: '16px' }}>
        <SectionHeader title="Overlast & Overig" jaar={jaar} />
        {overlastCard.isLoading ? <Spinner /> : overlastCard.activeMode === 'trend' && overlastCard.trendData ? (
          <CardTrendChart data={overlastCard.trendData} lines={[{ key: 'vernieling', label: 'Vernieling', color: '#3498db' }]} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <MeldingRow label="Vernieling" value={crim.vernieling} />
            <MeldingRow label="Drugs/drankoverlast" value={crim.drugsOverlast} />
            <MeldingRow label="Burengerucht" value={crim.burengerucht} />
            <MeldingRow label="Huisvredebreuk" value={crim.huisvredebreuk} />
            <MeldingRow label="Fraude" value={crim.fraude} />
            <MeldingRow label="Brand/ontploffing" value={crim.brandOntploffing} />
            <MeldingRow label="Openbare orde" value={crim.aantastingOpenbareOrde} />
            <MeldingRow label="Cybercrime" value={crim.cybercrime} />
          </div>
        )}
      </div>
    );
  }

  if (sectionId === 'veiligheid-verkeer') {
    const { crim, jaar } = getCrim(verkeerCard);
    return (
      <div style={{ padding: '16px' }}>
        <SectionHeader title="Verkeer" jaar={jaar} />
        {verkeerCard.isLoading ? <Spinner /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <MeldingRow label="Verkeersongevallen" value={crim.verkeersOngevallen} />
            <MeldingRow label="Rijden onder invloed" value={crim.rijdenOnderInvloed} />
          </div>
        )}
      </div>
    );
  }

  return null;
}
