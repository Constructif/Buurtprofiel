import { useState, useEffect } from 'react';
import { useGebiedStore } from '../../../../store/gebiedStore';
import { useActiveBenchmarks } from '../../../../hooks/useActiveBenchmarks';
import { fetchLeefomgevingData } from '../../../../services/leefomgeving';
import type { LeefomgevingData, LeefomgevingVergelijkingNiveau } from '../../../../types/leefomgeving';
import { logger } from '../../../../utils/logger';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts';

const PIE_COLORS = ['#22c55e', '#84cc16', '#34d399', '#10b981', '#059669'];

function getKpiColor(value: number | null, nlWaarde: number): string {
  if (value === null) return '#9ca3af';
  const diff = value - nlWaarde;
  if (diff >= 0) return '#22c55e';
  if (diff >= -20) return '#f59e0b';
  return '#ef4444';
}

function Spinner() { return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Laden...</div>; }
function SectionHeader({ title, jaar, isGemeente }: { title: string; jaar?: number; isGemeente?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{title}</h3>
      <span style={{ fontSize: '12px', color: '#9ca3af' }}>
        {jaar ? `CBS ${jaar}` : ''}{isGemeente ? ' (gemeente)' : ''}
      </span>
    </div>
  );
}

function useLeefomgevingData() {
  const { selectedGebied, gebiedData, selectedJaar } = useGebiedStore();
  const [leefData, setLeefData] = useState<LeefomgevingData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedGebied || !gebiedData) { setLeefData(null); return; }
    setLoading(true);
    fetchLeefomgevingData(
      selectedGebied.code, selectedGebied.type, selectedGebied.naam,
      gebiedData.bevolking.totaal, selectedGebied.wijkCode, selectedGebied.wijkNaam,
      selectedGebied.gemeenteCode, selectedGebied.gemeenteNaam, selectedJaar,
    ).then(d => setLeefData(d)).catch(e => logger.error('leefomgeving fetch', e)).finally(() => setLoading(false));
  }, [selectedGebied, gebiedData, selectedJaar]);

  return { leefData, loading };
}

function ComparisonColumn({ label, data, isActive, refM2Groen }: {
  label: string; data: LeefomgevingVergelijkingNiveau; isActive: boolean; refM2Groen: number;
}) {
  const color = data.m2PerPersoon !== null ? getKpiColor(data.m2PerPersoon, refM2Groen) : '#9ca3af';
  return (
    <div style={{ flex: '1 1 80px', minWidth: '80px', textAlign: 'center', padding: '10px 8px',
      backgroundColor: isActive ? '#f5f1ee' : 'transparent', border: isActive ? '2px solid #eb6608' : '1px solid #e5e7eb' }}>
      <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: 500 }}>{label}</p>
      {data.m2PerPersoon !== null ? (
        <>
          <p style={{ fontSize: '22px', fontWeight: 700, color, margin: 0, lineHeight: 1 }}>
            {data.m2PerPersoon}<span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '1px' }}>m²</span>
          </p>
          <p style={{ fontSize: '9px', color: '#9ca3af', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.naam}</p>
        </>
      ) : <p style={{ fontSize: '22px', fontWeight: 700, color: '#d1d5db', margin: 0 }}>-</p>}
    </div>
  );
}

export function LeefomgevingSection({ sectionId }: { sectionId: string }) {
  const { leefData, loading } = useLeefomgevingData();
  const { ref, refNaamVoor } = useActiveBenchmarks(null, leefData);

  if (loading) return <Spinner />;
  if (!leefData) return <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>Geen data beschikbaar</div>;

  const { bodemgebruik, metrics, vergelijking, dataJaar, isGemeenteNiveau } = leefData;
  const refM2Groen = ref('m2GroenPerPersoon');
  const refGroenPct = ref('groenPercentage');
  const refNaamM2 = refNaamVoor('m2GroenPerPersoon');

  if (sectionId === 'leefomgeving-groen') {
    return (
      <div style={{ padding: '16px' }}>
        <SectionHeader title="Groenvoorzieningen" jaar={dataJaar} isGemeente={isGemeenteNiveau} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', minWidth: '150px' }}>
            {metrics.m2GroenPerPersoon !== null ? (
              <>
                <span style={{ fontSize: '48px', fontWeight: 700, color: getKpiColor(metrics.m2GroenPerPersoon, refM2Groen) }}>
                  {metrics.m2GroenPerPersoon}
                </span>
                <span style={{ fontSize: '18px', color: '#6b7280' }}>m²</span>
              </>
            ) : <span style={{ fontSize: '48px', fontWeight: 700, color: '#9ca3af' }}>-</span>}
            <p style={{ color: '#6b7280', fontSize: '13px', margin: '4px 0 0' }}>groen per inwoner</p>
            <p style={{ color: '#9ca3af', fontSize: '11px', margin: '2px 0 0' }}>
              ({refNaamM2 === 'Nederland' ? 'NL' : refNaamM2}: ~{refM2Groen.toFixed(0)} m²)
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
            {[
              { label: 'Groenpercentage', value: metrics.groenPercentage, ref2: refGroenPct, unit: '%' },
              { label: 'Totaal groen', value: metrics.totaalGroenHa, ref2: null, unit: 'ha' },
              { label: 'Totaal oppervlakte', value: bodemgebruik.totaalOppervlakte, ref2: null, unit: 'ha' },
            ].map(({ label, value, ref2, unit }) => (
              <div key={label} style={{ padding: '10px 14px', backgroundColor: '#f5f1ee', minWidth: '110px', flex: '1 1 100px',
                borderLeft: ref2 !== null ? `3px solid ${getKpiColor(value, ref2)}` : '3px solid #d1d5db' }}>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px' }}>{label}</p>
                <p style={{ fontSize: '22px', fontWeight: 700, color: ref2 !== null ? getKpiColor(value, ref2) : '#1d1d1b', margin: 0 }}>
                  {value !== null ? `${unit === '%' ? value.toFixed(1) : value.toFixed(1)}${unit}` : '-'}
                </p>
                {ref2 !== null && <p style={{ fontSize: '10px', color: '#9ca3af', margin: '2px 0 0' }}>ref: {ref2.toFixed(1)}{unit}</p>}
              </div>
            ))}
          </div>
        </div>
        {vergelijking && (
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {vergelijking.gemeente && (
              <ComparisonColumn label="Gemeente" data={vergelijking.gemeente} isActive={true} refM2Groen={refM2Groen} />
            )}
            <ComparisonColumn label="Nederland" data={vergelijking.nederland} isActive={false} refM2Groen={refM2Groen} />
          </div>
        )}
      </div>
    );
  }

  if (sectionId === 'leefomgeving-bodem-verdeling') {
    const bodemData = [
      { name: 'Stedelijk groen', value: bodemgebruik.stedelijkGroen || 0 },
      { name: 'Sportterrein', value: bodemgebruik.sportterrein || 0 },
      { name: 'Recreatieterrein', value: bodemgebruik.recreatiefTerrein || 0 },
      { name: 'Natuurlijk terrein', value: bodemgebruik.natuurlijkTerrein || 0 },
    ].filter(d => d.value > 0);
    return (
      <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <SectionHeader title="Verdeling Groengebieden" jaar={dataJaar} />
        {bodemData.length > 0 ? (
          <div style={{ flex: 1, minHeight: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={bodemData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={2}
                  dataKey="value" animationDuration={300}
                  label={({ name, value }) => `${name}: ${value.toFixed(1)} ha`}
                  labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}>
                  {bodemData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v?: number) => v !== undefined ? [`${v.toFixed(1)} ha`, ''] : ['-', '']}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Geen bodemgebruik data beschikbaar</div>}
      </div>
    );
  }

  if (sectionId === 'leefomgeving-bodem-detail') {
    const rows = [
      { label: 'Stedelijk groen', value: bodemgebruik.stedelijkGroen, desc: 'Parken, plantsoenen, groenstroken' },
      { label: 'Sportterreinen', value: bodemgebruik.sportterrein, desc: 'Sportvelden, golfbanen' },
      { label: 'Recreatieterreinen', value: bodemgebruik.recreatiefTerrein, desc: 'Dagrecreatie, volkstuinen' },
      { label: 'Natuurlijk terrein', value: bodemgebruik.natuurlijkTerrein, desc: 'Bos, heide, duinen' },
    ];
    return (
      <div style={{ padding: '16px' }}>
        <SectionHeader title="Groengebieden per Type" jaar={dataJaar} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {rows.map(({ label, value, desc }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#f5f1ee' }}>
              <div>
                <span style={{ fontSize: '13px', color: '#4b5563', display: 'block' }}>{label}</span>
                <span style={{ fontSize: '10px', color: '#9ca3af' }}>{desc}</span>
              </div>
              <span style={{ fontSize: '16px', fontWeight: 700, color: value ? '#22c55e' : '#9ca3af' }}>
                {value !== null ? <>{value.toFixed(1)}<span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '2px' }}>ha</span></> : '-'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sectionId === 'leefomgeving-vergelijking') {
    if (!vergelijking) return <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>Geen vergelijkingsdata</div>;
    const chartData: { name: string; value: number; isSelected: boolean }[] = [];
    if (vergelijking.gemeente?.m2PerPersoon !== null && vergelijking.gemeente) {
      chartData.push({ name: vergelijking.gemeente.naam, value: vergelijking.gemeente.m2PerPersoon || 0, isSelected: true });
    }
    chartData.push({ name: 'Nederland', value: vergelijking.nederland.m2PerPersoon || 0, isSelected: false });
    return (
      <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <SectionHeader title="Vergelijking m² Groen per Inwoner" jaar={dataJaar} />
        <div style={{ flex: 1, minHeight: '180px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 10 }}>
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} unit=" m²" />
              <YAxis type="category" dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} width={95} />
              <Tooltip formatter={(v?: number) => v !== undefined ? [`${v} m²`, 'Groen per inwoner'] : ['-', '']}
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', fontSize: '12px' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={300}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.isSelected ? '#eb6608' : '#22c55e'} opacity={entry.isSelected ? 1 : 0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return null;
}
