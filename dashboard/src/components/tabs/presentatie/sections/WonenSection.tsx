import { useCallback } from 'react';
import { useGebiedStore } from '../../../../store/gebiedStore';
import { CardTrendChart } from '../../../ui/CardTrendChart';
import { InfoGrid } from '../../../ui/InfoGrid';
import { fetchKerncijfersForYear, fetchKerncijfersAllYears } from '../../../../services/cbs';
import { useCardYear } from '../../../../hooks/useCardYear';
import {
  PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

function fmt(n: number) { return n.toLocaleString('nl-NL'); }
const COLORS = ['#eb6608', '#1d1d1b', '#3498db', '#2ecc71'];

function Spinner() { return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Laden...</div>; }
function SectionHeader({ title, jaar }: { title: string; jaar?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{title}</h3>
      {jaar && <span style={{ fontSize: '12px', color: '#9ca3af' }}>{jaar}</span>}
    </div>
  );
}

export function WonenSection({ sectionId }: { sectionId: string }) {
  const { gebiedData, selectedGebied } = useGebiedStore();
  const code = gebiedData?.code ?? '';
  const defaultJaar = gebiedData?.kerncijfersJaar ?? 2025;

  const fetcher = useCallback((jaar: number) => fetchKerncijfersForYear(code, jaar), [code]);
  const trendFetcher = useCallback(() => fetchKerncijfersAllYears(code), [code]);

  const voorraadCard = useCardYear(defaultJaar, fetcher, trendFetcher);
  const koopHuurCard = useCardYear(defaultJaar, fetcher, trendFetcher);
  const huurDetailCard = useCardYear(defaultJaar, fetcher, trendFetcher);

  if (!gebiedData || !selectedGebied) return <Spinner />;

  const getWon = (card: typeof voorraadCard) => ({
    won: card.overrideData?.woningen ?? gebiedData.woningen,
    jaar: card.overrideData?._jaar ?? gebiedData.kerncijfersJaar,
  });

  if (sectionId === 'wonen-voorraad') {
    const { won, jaar } = getWon(voorraadCard);
    const totaal = won.totaal;
    return (
      <div style={{ padding: '16px' }}>
        <SectionHeader title="Woningvoorraad" jaar={jaar} />
        {voorraadCard.isLoading ? <Spinner /> : voorraadCard.activeMode === 'trend' && voorraadCard.trendData ? (
          <CardTrendChart data={voorraadCard.trendData} lines={[{ key: 'huishoudens', label: 'Huishoudens', color: '#eb6608' }]} />
        ) : (
          <InfoGrid items={[
            { label: 'Totaal woningen', value: fmt(totaal) },
            { label: 'Koop', value: `${Math.round(won.koopPercentage)}% (${fmt(Math.round((won.koopPercentage / 100) * totaal))})` },
            { label: 'Huur', value: `${Math.round(won.huurPercentage)}% (${fmt(Math.round((won.huurPercentage / 100) * totaal))})` },
            { label: 'Huur sociaal', value: `${Math.round(won.huurSociaalPercentage)}%` },
          ]} />
        )}
      </div>
    );
  }

  if (sectionId === 'wonen-koophuur') {
    const { won, jaar } = getWon(koopHuurCard);
    const data = [
      { name: `Koop (${Math.round(won.koopPercentage)}%)`, value: won.koopPercentage },
      { name: `Huur (${Math.round(won.huurPercentage)}%)`, value: won.huurPercentage },
    ];
    return (
      <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <SectionHeader title="Koop vs Huur" jaar={jaar} />
        {koopHuurCard.isLoading ? <Spinner /> : (
          <div style={{ flex: 1, minHeight: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label animationDuration={300}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v) => `${Math.round(v as number)}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  if (sectionId === 'wonen-woningtypes') {
    const data = [
      { name: 'Appartement', value: Math.round(gebiedData.woningen.meergezinsPercentage) },
      { name: 'Tussenwoning', value: Math.round(gebiedData.woningen.tussenwoningPercentage) },
      { name: 'Hoekwoning', value: Math.round(gebiedData.woningen.hoekwoningPercentage) },
      { name: 'Twee-onder-één-kap', value: Math.round(gebiedData.woningen.tweeOnderEenKapPercentage) },
      { name: 'Vrijstaand', value: Math.round(gebiedData.woningen.vrijstaandPercentage) },
    ].filter(d => d.value > 0);
    return (
      <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <SectionHeader title="Woningtypes" jaar={gebiedData.kerncijfersJaar} />
        {data.length > 0 ? (
          <div style={{ flex: 1, minHeight: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                  label={({ name, value }) => `${name}: ${value}%`} animationDuration={300}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Geen woningtype data beschikbaar</div>
        )}
      </div>
    );
  }

  if (sectionId === 'wonen-huurdetail') {
    const { won, jaar } = getWon(huurDetailCard);
    return (
      <div style={{ padding: '16px' }}>
        <SectionHeader title="Huurwoningen Detail" jaar={jaar} />
        {huurDetailCard.isLoading ? <Spinner /> : (
          <InfoGrid items={[
            { label: 'Totaal huur', value: `${Math.round(won.huurPercentage)}%` },
            { label: 'Woningcorporatie', value: `${Math.round(won.huurSociaalPercentage)}%` },
            { label: 'Overige verhuurders', value: `${Math.round(won.huurParticulierPercentage)}%` },
          ]} />
        )}
      </div>
    );
  }

  if (sectionId === 'wonen-verhuisbewegingen') {
    const { bevolkingsDynamiek, gemeenteNaam } = gebiedData;
    const hasData = bevolkingsDynamiek && bevolkingsDynamiek.jaren.length > 0;
    const chartData = hasData ? bevolkingsDynamiek.jaren.map(j => ({
      jaar: j.jaar.toString(), Vestiging: j.vestiging || 0, Vertrek: j.vertrek || 0, Saldo: j.saldo,
    })) : [];
    const titel = `Verhuisbewegingen${gemeenteNaam && selectedGebied?.type !== 'gemeente' ? ` — ${gemeenteNaam}` : ''}`;
    return (
      <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <SectionHeader title={titel} />
        {hasData ? (
          <>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 12px' }}>Verhuizingen van en naar de gemeente per jaar</p>
            <div style={{ flex: 1, minHeight: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="jaar" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
                  <Tooltip formatter={(v, n) => [fmt(v as number), n as string]} />
                  <Legend />
                  <Bar dataKey="Vestiging" name="Vestiging (in)" fill="#2ecc71" animationDuration={300} />
                  <Bar dataKey="Vertrek" name="Vertrek (uit)" fill="#e74c3c" animationDuration={300} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {chartData.map(item => (
                <div key={item.jaar} style={{ padding: '6px 10px', backgroundColor: item.Saldo >= 0 ? '#dcfce7' : '#fee2e2', borderRadius: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>{item.jaar}: </span>
                  <span style={{ fontWeight: 600, color: item.Saldo >= 0 ? '#15803d' : '#dc2626' }}>{item.Saldo >= 0 ? '+' : ''}{fmt(item.Saldo)}</span>
                </div>
              ))}
            </div>
          </>
        ) : <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Geen verhuisdata beschikbaar</div>}
      </div>
    );
  }

  if (sectionId === 'wonen-corporaties') {
    return (
      <div style={{ padding: '16px' }}>
        <SectionHeader title="Woningcorporaties" />
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Nog geen data beschikbaar</div>
      </div>
    );
  }

  return null;
}
