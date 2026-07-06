import { useState, useEffect } from 'react';
import { useGebiedStore } from '../../../store/gebiedStore';
import { Card } from '../../ui/Card';
import { fetchLeefomgevingData } from '../../../services/leefomgeving';
import type { LeefomgevingData, LeefomgevingVergelijkingNiveau } from '../../../types/leefomgeving';
import { TabScoreHeader } from '../../ui/TabScoreHeader';
import { berekenLeefomgevingScore } from '../../../utils/scoring';
import { useActiveBenchmarks } from '../../../hooks/useActiveBenchmarks';
import { logger } from '../../../utils/logger';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

// Kleurlogica voor KPIs gebaseerd op vergelijking met NL
// Voor groen: hoger is beter
function getKpiColor(value: number | null, nlWaarde: number): string {
  if (value === null) return '#9ca3af';  // Grijs

  const diff = value - nlWaarde;

  // Hoger is beter voor groen
  if (diff >= 0) return '#22c55e';        // Groen - beter of gelijk
  if (diff >= -20) return '#f59e0b';      // Oranje - iets minder
  return '#ef4444';                        // Rood - veel minder
}

// Kleuren voor pie chart
const PIE_COLORS = ['#22c55e', '#84cc16', '#34d399', '#10b981', '#059669'];

export function Leefomgeving() {
  const { selectedGebied, isLoadingData, gebiedData, selectedJaar } = useGebiedStore();
  const [leefomgevingData, setLeefomgevingData] = useState<LeefomgevingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Actieve benchmarks: schakelt mee met de Nederland/gemeente-toggle.
  const { set: benchmarksLO, ref, refNaamVoor, benchmarkNaam } = useActiveBenchmarks(null, leefomgevingData);

  useEffect(() => {
    if (!selectedGebied || !gebiedData) {
      setLeefomgevingData(null);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchLeefomgevingData(
          selectedGebied.code,
          selectedGebied.type,
          selectedGebied.naam,
          gebiedData.bevolking.totaal,
          selectedGebied.wijkCode,
          selectedGebied.wijkNaam,
          selectedGebied.gemeenteCode,
          selectedGebied.gemeenteNaam,
          selectedJaar,
        );

        setLeefomgevingData(data);
        if (!data) {
          setError('Geen data beschikbaar voor dit gebied');
        }
      } catch (err) {
        setError('Fout bij ophalen van data');
        logger.error('Fout bij laden leefomgeving:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedGebied, gebiedData, selectedJaar]);

  // No selection state
  if (!selectedGebied) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>
        <p style={{ fontSize: '20px' }}>Selecteer een gebied om leefomgeving data te bekijken</p>
      </div>
    );
  }

  // Loading state
  if (isLoading || isLoadingData) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #eb6608',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          margin: '0 auto 16px',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#6b7280' }}>Leefomgeving data laden...</p>
      </div>
    );
  }

  // Error state
  if (error && !leefomgevingData) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>
        <p style={{ fontSize: '20px' }}>{error}</p>
        <p style={{ fontSize: '14px', marginTop: '8px' }}>
          CBS bodemgebruik data is mogelijk niet beschikbaar voor alle gebieden
        </p>
      </div>
    );
  }

  if (!leefomgevingData) return null;

  const { bodemgebruik, metrics, vergelijking, dataJaar, isGemeenteNiveau } = leefomgevingData;

  // Referentiewaarden uit de actieve benchmarks (schakelen mee met de toggle)
  const refM2Groen = ref('m2GroenPerPersoon');
  const refGroenPct = ref('groenPercentage');
  const refNaamM2Groen = refNaamVoor('m2GroenPerPersoon');
  const refNaamGroenPct = refNaamVoor('groenPercentage');

  // Aandachtspunten data samenstellen
  const aandachtspunten = [
    {
      label: 'm² groen per persoon',
      value: metrics.m2GroenPerPersoon,
      nlWaarde: refM2Groen,
      refNaam: refNaamM2Groen,
      unit: 'm²'
    },
    {
      label: 'Groenpercentage',
      value: metrics.groenPercentage,
      nlWaarde: refGroenPct,
      refNaam: refNaamGroenPct,
      unit: '%'
    },
  ];

  // Bodemgebruik data voor pie chart (in hectares)
  const bodemgebruikData = [
    { name: 'Stedelijk groen', value: bodemgebruik.stedelijkGroen || 0 },
    { name: 'Sportterrein', value: bodemgebruik.sportterrein || 0 },
    { name: 'Recreatieterrein', value: bodemgebruik.recreatiefTerrein || 0 },
    { name: 'Natuurlijk terrein', value: bodemgebruik.natuurlijkTerrein || 0 },
  ].filter(item => item.value > 0);

  // Tab score berekening met dezelfde actieve benchmarks
  const tabScore = berekenLeefomgevingScore(leefomgevingData, benchmarksLO);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <TabScoreHeader tabScore={tabScore} />
      {/* SECTIE 0: Aandachtspunten */}
      <AandachtspuntenCard punten={aandachtspunten} benchmarkNaam={benchmarkNaam} />

      {/* SECTIE 1: Hoofdkader m² groen per persoon */}
      <Card

        title="Groenvoorzieningen"
        badge="data"
        badgeText={`CBS Bodemgebruik ${dataJaar}${isGemeenteNiveau ? ' (gemeente)' : ''}`}
        badgeTooltip={`Dataset 86211NED - Bodemgebruik${isGemeenteNiveau ? ' (data op gemeente-niveau, buurt/wijk niet beschikbaar)' : ''}`}
      >
        <div style={{ padding: '8px 0' }}>
          {/* Hoofd KPI */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', minWidth: '180px' }}>
              <div style={{ lineHeight: 1 }}>
                {metrics.m2GroenPerPersoon !== null ? (
                  <>
                    <span style={{
                      fontSize: '56px',
                      fontWeight: 700,
                      color: getKpiColor(metrics.m2GroenPerPersoon, refM2Groen)
                    }}>
                      {metrics.m2GroenPerPersoon}
                    </span>
                    <span style={{ fontSize: '20px', fontWeight: 500, color: '#6b7280', marginLeft: '4px' }}>m²</span>
                  </>
                ) : (
                  <span style={{ fontSize: '56px', fontWeight: 700, color: '#9ca3af' }}>-</span>
                )}
              </div>
              <p style={{ color: '#6b7280', marginTop: '8px', fontSize: '14px' }}>
                groen per inwoner
                {isGemeenteNiveau && (
                  <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '4px' }}>
                    (gemeente)
                  </span>
                )}
              </p>
              <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>
                ({refNaamM2Groen === 'Nederland' ? 'NL' : refNaamM2Groen} gemiddelde: ~{refM2Groen.toFixed(0)} m²)
              </p>
            </div>

            {/* Sub KPIs */}
            <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
              <KpiBox
                label="Groenpercentage"
                value={metrics.groenPercentage}
                nlWaarde={refGroenPct}
                refNaam={refNaamGroenPct}
                unit="%"
              />
              <KpiBox
                label="Totaal groen"
                value={metrics.totaalGroenHa}
                nlWaarde={null}
                unit="ha"
                showNl={false}
              />
              <KpiBox
                label="Totaal oppervlakte"
                value={bodemgebruik.totaalOppervlakte}
                nlWaarde={null}
                unit="ha"
                showNl={false}
              />
            </div>
          </div>

          {/* Vergelijking: alleen gemeente en Nederland (data is alleen gemeente-niveau) */}
          {vergelijking && (
            <div style={{ marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {/* Gemeente */}
              {vergelijking.gemeente && (
                <ComparisonColumn
                  label="Gemeente"
                  data={vergelijking.gemeente}
                  isActive={true}
                  refM2Groen={refM2Groen}
                />
              )}

              {/* Nederland */}
              <ComparisonColumn
                label="Nederland"
                data={vergelijking.nederland}
                isActive={false}
                refM2Groen={refM2Groen}
              />
            </div>
          )}
        </div>
      </Card>

      {/* SECTIE 2: Bodemgebruik verdeling */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Pie chart */}
        <Card

          title="Verdeling Groengebieden"
          badge={bodemgebruikData.length > 0 ? 'data' : 'placeholder'}
          badgeText={`CBS ${dataJaar}`}
        >
          {bodemgebruikData.length > 0 ? (
            <div style={{ height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bodemgebruikData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    animationDuration={300}
                    label={({ name, value }) => `${name}: ${value.toFixed(1)} ha`}
                    labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}
                  >
                    {bodemgebruikData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value?: number) => value !== undefined ? [`${value.toFixed(1)} ha`, ''] : ['-', '']}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <p>Geen bodemgebruik data beschikbaar</p>
            </div>
          )}
        </Card>

        {/* Detail boxes */}
        <Card

          title="Groengebieden per Type"
          badge="data"
          badgeText={`CBS ${dataJaar}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <DetailRow
              label="Stedelijk groen"
              value={bodemgebruik.stedelijkGroen}
              description="Parken, plantsoenen, groenstroken"
            />
            <DetailRow
              label="Sportterreinen"
              value={bodemgebruik.sportterrein}
              description="Sportvelden, golfbanen, etc."
            />
            <DetailRow
              label="Recreatieterreinen"
              value={bodemgebruik.recreatiefTerrein}
              description="Dagrecreatie, volkstuinen"
            />
            <DetailRow
              label="Natuurlijk terrein"
              value={bodemgebruik.natuurlijkTerrein}
              description="Bos, heide, duinen"
            />
          </div>
        </Card>
      </div>

      {/* SECTIE 3: Vergelijking bar chart */}
      {vergelijking && (
        <Card

          title="Vergelijking m² Groen per Inwoner"
          badge="data"
          badgeText={`CBS ${dataJaar}`}
        >
          <VergelijkingChart vergelijking={vergelijking} selectedType={selectedGebied?.type} />
        </Card>
      )}
    </div>
  );
}

// ============ HELPER COMPONENTS ============

// Aandachtspunten Card
interface Aandachtspunt {
  label: string;
  value: number | null;
  nlWaarde: number;
  refNaam: string;
  unit: string;
}

function AandachtspuntenCard({ punten, benchmarkNaam }: { punten: Aandachtspunt[]; benchmarkNaam: string }) {
  // Filter en sorteer op grootste afwijking
  const sorted = [...punten]
    .filter(p => p.value !== null)
    .map(p => ({
      ...p,
      diff: p.value! - p.nlWaarde,
      absDiff: Math.abs(p.value! - p.nlWaarde)
    }))
    .sort((a, b) => b.absDiff - a.absDiff);

  if (sorted.length === 0) return null;

  return (
    <Card title="Aandachtspunten" badge="info" badgeText={`Vergelijking met ${benchmarkNaam}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {sorted.map(punt => {
          // Voor groen is hoger beter, dus negatief diff is een probleem
          const isProbleem = punt.diff < -20;
          const color = getKpiColor(punt.value, punt.nlWaarde);
          const refKort = punt.refNaam === 'Nederland' ? 'NL' : punt.refNaam;

          return (
            <div
              key={punt.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                backgroundColor: '#f5f1ee',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '14px', width: '20px' }}>
                {isProbleem ? '⚠️' : '✓'}
              </span>
              <span style={{ flex: 1, fontSize: '13px', color: '#4b5563' }}>
                {punt.label}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 700, color, minWidth: '70px', textAlign: 'right' }}>
                {punt.value !== null ? (
                  <>
                    {punt.unit === '%' ? punt.value.toFixed(1) : Math.round(punt.value)}
                    {punt.unit}
                  </>
                ) : '-'}
              </span>
              <span style={{
                fontSize: '12px',
                color: punt.diff >= 0 ? '#22c55e' : '#ef4444',
                minWidth: '100px',
                textAlign: 'right'
              }}>
                {punt.diff >= 0 ? '+' : ''}{punt.unit === '%' ? punt.diff.toFixed(1) : Math.round(punt.diff)} t.o.v. {refKort}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// KPI Box
function KpiBox({
  label,
  value,
  nlWaarde,
  refNaam = 'Nederland',
  unit,
  showNl = true,
  formatNumber = false
}: {
  label: string;
  value: number | null;
  nlWaarde: number | null;
  refNaam?: string;
  unit: string;
  showNl?: boolean;
  formatNumber?: boolean;
}) {
  const color = nlWaarde !== null ? getKpiColor(value, nlWaarde) : '#1d1d1b';
  const refKort = refNaam === 'Nederland' ? 'NL' : refNaam;

  const formatValue = (v: number) => {
    if (formatNumber) {
      return v.toLocaleString('nl-NL');
    }
    return unit === '%' ? v.toFixed(1) : v.toFixed(1);
  };

  return (
    <div style={{
      padding: '12px 16px',
      backgroundColor: '#f5f1ee',
      minWidth: '130px',
      borderLeft: nlWaarde !== null ? `3px solid ${color}` : '3px solid #d1d5db'
    }}>
      <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '24px', fontWeight: 700, color, margin: 0 }}>
        {value !== null ? (
          <>
            {formatValue(value)}
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', marginLeft: '2px' }}>{unit}</span>
          </>
        ) : '-'}
      </p>
      {showNl && nlWaarde !== null && (
        <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>
          ({refKort}: {nlWaarde.toFixed(1)}{unit})
        </p>
      )}
    </div>
  );
}

// Vergelijkingskolom
function ComparisonColumn({
  label,
  data,
  isActive,
  refM2Groen,
}: {
  label: string;
  data: LeefomgevingVergelijkingNiveau;
  isActive: boolean;
  refM2Groen: number;
}) {
  const color = data.m2PerPersoon !== null
    ? getKpiColor(data.m2PerPersoon, refM2Groen)
    : '#9ca3af';

  return (
    <div style={{
      flex: '1 1 100px',
      minWidth: '100px',
      textAlign: 'center',
      padding: '10px 8px',
      backgroundColor: isActive ? '#f5f1ee' : 'transparent',
      border: isActive ? '2px solid #eb6608' : '1px solid #e5e7eb',
    }}>
      <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: 500 }}>
        {label}
      </p>
      {data.m2PerPersoon !== null ? (
        <>
          <p style={{
            fontSize: '22px',
            fontWeight: 700,
            color,
            margin: 0,
            lineHeight: 1
          }}>
            {data.m2PerPersoon}
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#6b7280', marginLeft: '1px' }}>m²</span>
          </p>
          <p style={{
            fontSize: '9px',
            color: '#9ca3af',
            marginTop: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {data.naam}
          </p>
        </>
      ) : (
        <p style={{ fontSize: '22px', fontWeight: 700, color: '#d1d5db', margin: 0 }}>-</p>
      )}
    </div>
  );
}

// Detail row (value in hectares)
function DetailRow({
  label,
  value,
  description
}: {
  label: string;
  value: number | null;
  description: string;
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 12px',
      backgroundColor: '#f5f1ee',
    }}>
      <div>
        <span style={{ fontSize: '13px', color: '#4b5563', display: 'block' }}>{label}</span>
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>{description}</span>
      </div>
      <span style={{ fontSize: '16px', fontWeight: 700, color: value ? '#22c55e' : '#9ca3af' }}>
        {value !== null ? (
          <>
            {value.toFixed(1)}
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#6b7280', marginLeft: '2px' }}>ha</span>
          </>
        ) : '-'}
      </span>
    </div>
  );
}

// Vergelijking bar chart (alleen gemeente en Nederland, data is gemeente-niveau)
function VergelijkingChart({
  vergelijking
}: {
  vergelijking: LeefomgevingData['vergelijking'];
  selectedType?: 'buurt' | 'wijk' | 'gemeente'; // Behouden voor API compatibiliteit
}) {
  const data: { name: string; value: number; isSelected: boolean }[] = [];

  // Alleen gemeente en Nederland tonen (data is alleen gemeente-niveau beschikbaar)
  if (vergelijking.gemeente && vergelijking.gemeente.m2PerPersoon !== null) {
    data.push({ name: vergelijking.gemeente.naam, value: vergelijking.gemeente.m2PerPersoon || 0, isSelected: true });
  }
  data.push({ name: 'Nederland', value: vergelijking.nederland.m2PerPersoon || 0, isSelected: false });

  if (data.length === 0) {
    return (
      <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
        <p>Geen vergelijkingsdata beschikbaar</p>
      </div>
    );
  }

  return (
    <div style={{ height: '200px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 10 }}>
          <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} unit=" m²" />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            width={95}
          />
          <Tooltip
            formatter={(value?: number) => value !== undefined ? [`${value} m²`, 'Groen per inwoner'] : ['-', '']}
            contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0', fontSize: '12px' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={300}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isSelected ? '#eb6608' : '#22c55e'}
                opacity={entry.isSelected ? 1 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
