import { useCallback } from 'react';
import { useGebiedStore } from '../../../store/gebiedStore';
import { Card } from '../../ui/Card';
import type { UitkeringenData } from '../../../types/werkInkomen';
import { TabScoreHeader } from '../../ui/TabScoreHeader';
import { berekenWerkInkomenScore } from '../../../utils/scoring';
import { NL_BENCHMARKS, getGemeenteBenchmarks } from '../../../utils/benchmarks';
import { fetchKerncijfersForYear, fetchKerncijfersAllYears } from '../../../services/cbs';
import { useCardYear } from '../../../hooks/useCardYear';
import { CardTrendChart } from '../../ui/CardTrendChart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// NL Referentiewaarden (CBS kerncijfers 85984NED + 86052NED + 85618NED)
const NL_REFERENTIES = {
  // Inkomen (CBS definitie: 40% laagste / 20% hoogste inkomensverdeling)
  gemiddeldInkomen: 37200,
  laagInkomen: 40.0,   // 40% personen met laagste inkomen (D000187)
  hoogInkomen: 20.0,   // 20% personen met hoogste inkomen (D000185)
  // Opleiding 15-75 jaar (CBS 86052NED, NL01, berekend: count/totaal*100)
  opleidingLaag: 26.3,    // 3.537.840 / 13.471.360 (basisonderwijs, vmbo, mbo1)
  opleidingMidden: 41.2,  // 5.554.700 / 13.471.360 (havo, vwo, mbo2-4)
  opleidingHoog: 32.5,    // 4.378.820 / 13.471.360 (hbo, wo)
  // Werkgelegenheid (CBS 85618NED, NL00, 2023)
  arbeidsparticipatie: 71.0,
  // Uitkeringen per 1000 inwoners (CBS 85984NED, NL00, berekend: count/bevolking*1000)
  bijstandPer1000: 23,    // 405.560 / 17.942.942 * 1000 = 22.6 → afgerond 23
  wwPer1000: 9,           // 158.400 / 17.942.942 * 1000 = 8.8 → afgerond 9
  aoPer1000: 44,          // 785.330 / 17.942.942 * 1000 = 43.8 → afgerond 44
};

// Kleuren
const COLORS = {
  primary: '#eb6608',
  dark: '#1d1d1b',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  gray: '#9ca3af',
  blue: '#3b82f6',
  purple: '#8b5cf6',
};

// Indicatoren waar hoger = beter
const HOGER_IS_BETER = ['arbeidsparticipatie', 'hoogInkomen', 'opleidingHoog', 'gemiddeldInkomen'];

// Kleurlogica voor KPIs
function getKpiColor(value: number | null, nlWaarde: number, key: string): string {
  if (value === null) return COLORS.gray;
  const diff = value - nlWaarde;
  const higherIsBetter = HOGER_IS_BETER.includes(key);
  const adjustedDiff = higherIsBetter ? -diff : diff;
  if (adjustedDiff <= 2) return COLORS.green;
  if (adjustedDiff <= 5) return COLORS.amber;
  return COLORS.red;
}

// Format number met NL locale
function formatNumber(num: number): string {
  return num.toLocaleString('nl-NL');
}

// Format currency
function formatCurrency(num: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(num);
}

// Helper: bereken per 1000 inwoners
function calcPer1000(value: number | null, bevolking: number): number | null {
  if (value === null || bevolking === 0) return null;
  return Math.round((value / bevolking) * 1000 * 10) / 10;
}

export function WerkInkomen() {
  const { selectedGebied, isLoadingData, gebiedData, benchmarkType, gemeenteData } = useGebiedStore();

  // Alle hooks MOETEN boven early returns staan (React hooks regels)
  const code = gebiedData?.code ?? '';
  const defaultJaar = gebiedData?.kerncijfersJaar ?? 2025;

  const kcFetcher = useCallback(
    (jaar: number) => fetchKerncijfersForYear(code, jaar),
    [code]
  );
  const kcTrendFetcher = useCallback(
    () => fetchKerncijfersAllYears(code),
    [code]
  );

  const inkomenCard = useCardYear(defaultJaar, kcFetcher, kcTrendFetcher);
  const uitkeringenCard = useCardYear(defaultJaar, kcFetcher, kcTrendFetcher);

  if (!selectedGebied) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>
        <p style={{ fontSize: '20px' }}>Selecteer een gebied om werk & inkomen data te bekijken</p>
      </div>
    );
  }

  if (isLoadingData) {
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
        <p style={{ color: '#6b7280' }}>Werk & Inkomen data laden...</p>
      </div>
    );
  }

  if (!gebiedData) return null;

  // Helper: extract inkomen/werk data van een card hook
  const getCardInkomen = (card: typeof inkomenCard) => {
    const ink = card.overrideData?.inkomen ?? gebiedData.inkomen;
    const jaar = card.overrideData?._jaar ?? gebiedData.kerncijfersJaar;
    return { ink: ink ?? { gemiddeld: null, laagInkomenPercentage: 0, hoogInkomenPercentage: 0 }, jaar: jaar || 2024 };
  };

  const inkomenData = getCardInkomen(inkomenCard);
  const uitkeringenJaar = uitkeringenCard.overrideData?._jaar ?? gebiedData.kerncijfersJaar ?? 2024;

  // Gebruik gebiedData voor default (niet-overridden) data
  const inkomen = inkomenData.ink;
  const werkInkomen = gebiedData.werkInkomen;
  const jaar = inkomenData.jaar;

  // Bereken midden inkomen als we laag en hoog hebben
  const laagInkomen = inkomen.laagInkomenPercentage;
  const hoogInkomen = inkomen.hoogInkomenPercentage;
  const middenInkomen = (laagInkomen && hoogInkomen) ? Math.max(0, 100 - laagInkomen - hoogInkomen) : null;

  // Aandachtspunten samenstellen
  const aandachtspunten = [
    { label: 'Gemiddeld inkomen', value: inkomen.gemiddeld, nlWaarde: NL_REFERENTIES.gemiddeldInkomen, key: 'gemiddeldInkomen', unit: 'EUR', isEuro: true },
    { label: 'Laag inkomen', value: laagInkomen, nlWaarde: NL_REFERENTIES.laagInkomen, key: 'laagInkomen', unit: '%' },
    { label: 'Arbeidsparticipatie', value: werkInkomen?.werkgelegenheid.arbeidsparticipatie ?? null, nlWaarde: NL_REFERENTIES.arbeidsparticipatie, key: 'arbeidsparticipatie', unit: '%' },
    { label: 'Laag opgeleid', value: werkInkomen?.opleiding.laag ?? null, nlWaarde: NL_REFERENTIES.opleidingLaag, key: 'opleidingLaag', unit: '%' },
    { label: 'Hoog opgeleid', value: werkInkomen?.opleiding.hoog ?? null, nlWaarde: NL_REFERENTIES.opleidingHoog, key: 'opleidingHoog', unit: '%' },
  ];

  // Tab score berekening
  const benchmarksWI = benchmarkType === 'gemeente' && selectedGebied.type !== 'gemeente'
    ? getGemeenteBenchmarks(gebiedData, gemeenteData, null, null)
    : NL_BENCHMARKS;
  const tabScore = berekenWerkInkomenScore(gebiedData, benchmarksWI);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <TabScoreHeader tabScore={tabScore} />
      {/* Aandachtspunten */}
      <AandachtspuntenCard punten={aandachtspunten} />

      {/* Inkomen Card */}
      {inkomenCard.activeMode === 'trend' && inkomenCard.trendData ? (
        <Card title="Inkomen Trend" badge="data" year={jaar}
          onYearChange={inkomenCard.handleYearChange} availableYears={inkomenCard.availableYears}
          activeYearMode={inkomenCard.activeMode} yearsWithData={inkomenCard.yearsWithData}>
          <CardTrendChart
            data={inkomenCard.trendData}
            lines={[{ key: 'inkomen', label: 'Gem. inkomen (€)', color: '#eb6608' }]}
          />
        </Card>
      ) : (
        <InkomenCard
          gemiddeld={inkomen.gemiddeld}
          laag={laagInkomen}
          midden={middenInkomen}
          hoog={hoogInkomen}
          jaar={jaar}
          onYearChange={inkomenCard.handleYearChange}
          availableYears={inkomenCard.availableYears}
          activeYearMode={inkomenCard.activeMode}
          yearsWithData={inkomenCard.yearsWithData}
        />
      )}

      {/* Grid: Opleiding + Werkgelegenheid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        <OpleidingsniveauCard
          data={werkInkomen?.opleiding ?? null}
          jaar={jaar}
          gebiedType={selectedGebied.type}
          isGemeenteData={werkInkomen?.opleidingIsGemeenteData}
        />
        <WerkgelegenheidCard
          data={werkInkomen?.werkgelegenheid ?? null}
          gebiedType={selectedGebied.type}
          isGemeenteData={werkInkomen?.werkgelegenheidIsGemeenteData}
          gemeenteNaam={werkInkomen?.werkgelegenheidGemeenteNaam}
        />
      </div>

      {/* Uitkeringen */}
      <UitkeringenCard
        data={werkInkomen?.uitkeringen ?? null}
        bevolking={gebiedData.bevolking.totaal}
        jaar={uitkeringenJaar}
        gebiedType={selectedGebied.type}
        onYearChange={uitkeringenCard.handleYearChange}
        availableYears={uitkeringenCard.availableYears}
        activeYearMode={uitkeringenCard.activeMode}
        yearsWithData={uitkeringenCard.yearsWithData}
      />
    </div>
  );
}

// ============ HELPER COMPONENTS ============

// Aandachtspunten Card
interface Aandachtspunt {
  label: string;
  value: number | null;
  nlWaarde: number;
  key: string;
  unit: string;
  isEuro?: boolean;
}

function AandachtspuntenCard({ punten }: { punten: Aandachtspunt[] }) {
  const sorted = [...punten]
    .filter(p => p.value !== null)
    .map(p => ({
      ...p,
      diff: p.isEuro ? (p.value! - p.nlWaarde) : (p.value! - p.nlWaarde),
      absDiff: Math.abs(p.value! - p.nlWaarde)
    }))
    .sort((a, b) => {
      // Sorteer op relatieve afwijking voor betere vergelijking
      const aRel = a.absDiff / a.nlWaarde;
      const bRel = b.absDiff / b.nlWaarde;
      return bRel - aRel;
    })
    .slice(0, 5);

  if (sorted.length === 0) return null;

  return (
    <Card title="Aandachtspunten" badge="info" badgeText="Vergelijking met NL">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {sorted.map(punt => {
          const isProbleem = !HOGER_IS_BETER.includes(punt.key) ? punt.diff > 5 : punt.diff < -5;
          const color = getKpiColor(punt.value, punt.nlWaarde, punt.key);
          const displayValue = punt.isEuro ? formatCurrency(punt.value!) : `${punt.value!.toFixed(1)}%`;
          const diffDisplay = punt.isEuro
            ? `${punt.diff > 0 ? '+' : ''}${formatCurrency(punt.diff)}`
            : `${punt.diff > 0 ? '+' : ''}${punt.diff.toFixed(1)}`;

          return (
            <div
              key={punt.key}
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
              <span style={{ fontSize: '14px', fontWeight: 700, color, minWidth: '80px', textAlign: 'right' }}>
                {displayValue}
              </span>
              <span style={{
                fontSize: '12px',
                color: HOGER_IS_BETER.includes(punt.key)
                  ? (punt.diff > 0 ? COLORS.green : COLORS.red)
                  : (punt.diff > 0 ? COLORS.red : COLORS.green),
                minWidth: '90px',
                textAlign: 'right'
              }}>
                {diffDisplay} t.o.v. NL
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// Inkomen Card met stacked bar
function InkomenCard({
  gemiddeld,
  laag,
  midden,
  hoog,
  jaar,
  onYearChange,
  availableYears,
  activeYearMode,
  yearsWithData,
}: {
  gemiddeld: number | null;
  laag: number | null;
  midden: number | null;
  hoog: number | null;
  jaar: number;
  onYearChange?: (jaar: number | 'trend') => void;
  availableYears?: number[];
  activeYearMode?: number | 'trend';
  yearsWithData?: number[];
}) {
  const inkomenData = [
    { name: 'Laag inkomen', value: laag ?? 0, color: COLORS.red },
    { name: 'Midden inkomen', value: midden ?? 0, color: COLORS.amber },
    { name: 'Hoog inkomen', value: hoog ?? 0, color: COLORS.green },
  ];

  const barData = [
    {
      name: 'Inkomensverdeling',
      laag: laag ?? 0,
      midden: midden ?? 0,
      hoog: hoog ?? 0,
    }
  ];

  return (
    <Card
      title="Inkomen"
      badge="data"
      badgeText={`CBS Kerncijfers ${jaar}`}
      badgeTooltip="Dataset 85984NED - Gemiddeld besteedbaar inkomen per inkomensontvanger"
      year={jaar}
      onYearChange={onYearChange}
      availableYears={availableYears}
      activeYearMode={activeYearMode}
      yearsWithData={yearsWithData}
    >
      <div style={{ padding: '8px 0' }}>
        {/* Hoofd KPI */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', minWidth: '160px' }}>
            <div style={{ lineHeight: 1 }}>
              {gemiddeld !== null ? (
                <span style={{ fontSize: '42px', fontWeight: 700, color: getKpiColor(gemiddeld, NL_REFERENTIES.gemiddeldInkomen, 'gemiddeldInkomen') }}>
                  {formatCurrency(gemiddeld)}
                </span>
              ) : (
                <span style={{ fontSize: '24px', fontWeight: 500, color: '#9ca3af' }}>
                  Niet beschikbaar
                </span>
              )}
            </div>
            <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '13px' }}>
              gemiddeld besteedbaar inkomen
            </p>
            <p style={{ color: '#9ca3af', fontSize: '11px', marginTop: '2px' }}>
              (NL: {formatCurrency(NL_REFERENTIES.gemiddeldInkomen)})
            </p>
          </div>

          {/* Sub KPIs */}
          <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
            <KpiBox label="Laag inkomen" value={laag} nlWaarde={NL_REFERENTIES.laagInkomen} kpiKey="laagInkomen" />
            <KpiBox label="Midden inkomen" value={midden} nlWaarde={100 - NL_REFERENTIES.laagInkomen - NL_REFERENTIES.hoogInkomen} kpiKey="middenInkomen" />
            <KpiBox label="Hoog inkomen" value={hoog} nlWaarde={NL_REFERENTIES.hoogInkomen} kpiKey="hoogInkomen" />
          </div>
        </div>

        {/* Stacked Bar Chart */}
        {(laag !== null || midden !== null || hoog !== null) && (
          <div style={{ marginTop: '20px', height: '60px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip
                  formatter={(value, name) => [`${(value as number).toFixed(1)}%`, name === 'laag' ? 'Laag inkomen' : name === 'midden' ? 'Midden inkomen' : 'Hoog inkomen']}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', fontSize: '12px' }}
                />
                <Bar dataKey="laag" stackId="a" fill={COLORS.red} name="Laag inkomen" animationDuration={300} />
                <Bar dataKey="midden" stackId="a" fill={COLORS.amber} name="Midden inkomen" animationDuration={300} />
                <Bar dataKey="hoog" stackId="a" fill={COLORS.green} name="Hoog inkomen" animationDuration={300} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '12px', fontSize: '11px' }}>
          {inkomenData.map(item => (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: item.color, borderRadius: '2px' }} />
              <span style={{ color: '#6b7280' }}>{item.name}: {item.value.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// Custom bar shape die zowel de bar als de NL referentielijn tekent
const BarWithNLLine = (props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  payload?: { nlWaarde: number; value: number; color: string };
}) => {
  const { x, y, width, height, payload } = props;
  if (x === undefined || y === undefined || width === undefined || height === undefined || !payload) return null;

  // Bereken y-positie voor NL lijn
  // De bar gaat van barBottom (y + height) naar y (top)
  // height pixels = payload.value percentage punten
  const barBottom = y + height;
  const pixelsPerPercent = height / payload.value;
  const nlY = barBottom - (payload.nlWaarde * pixelsPerPercent);

  return (
    <g>
      {/* De bar zelf met afgeronde bovenkant */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={payload.color}
        rx={4}
        ry={4}
      />
      {/* Rechthoek om de onderkant recht te maken (over de afronding heen) */}
      <rect
        x={x}
        y={y + height - 4}
        width={width}
        height={4}
        fill={payload.color}
      />
      {/* NL referentielijn door de bar */}
      <line
        x1={x}
        x2={x + width}
        y1={nlY}
        y2={nlY}
        stroke="#1d1d1b"
        strokeWidth={1.5}
        strokeDasharray="6 3"
      />
    </g>
  );
};

// Opleidingsniveau Card met verticale bar chart + NL referentielijnen
function OpleidingsniveauCard({
  data,
  jaar,
  gebiedType,
  isGemeenteData
}: {
  data: { laag: number | null; midden: number | null; hoog: number | null } | null;
  jaar: number;
  gebiedType: 'buurt' | 'wijk' | 'gemeente';
  isGemeenteData?: boolean;
}) {
  const hasData = data && (data.laag !== null || data.midden !== null || data.hoog !== null);

  const barData = hasData ? [
    { name: 'Laag', value: data.laag ?? 0, nlWaarde: NL_REFERENTIES.opleidingLaag, color: COLORS.red },
    { name: 'Midden', value: data.midden ?? 0, nlWaarde: NL_REFERENTIES.opleidingMidden, color: COLORS.amber },
    { name: 'Hoog', value: data.hoog ?? 0, nlWaarde: NL_REFERENTIES.opleidingHoog, color: COLORS.green },
  ].filter(d => d.value > 0) : [];

  // Badge text met gemeente indicatie als fallback wordt gebruikt
  const getBadgeText = () => {
    if (!hasData) return `CBS Kerncijfers ${jaar}`;
    if (isGemeenteData) return `Gemeente niveau (CBS ${jaar})`;
    return 'CBS Opleidingsniveau 2023';
  };

  const getTooltip = () => {
    if (!hasData) return "Dataset 85984NED - Hoogst behaald onderwijsniveau (15-74 jaar)";
    if (isGemeenteData) return `Dataset 85984NED - Gemeente niveau data (niet beschikbaar op ${gebiedType} niveau)`;
    return "Dataset 86052NED - Bevolking 15-75 jaar; opleidingsniveau per wijk/buurt";
  };

  return (
    <Card
      title="Opleidingsniveau"
      badge={hasData ? 'data' : 'placeholder'}
      badgeText={getBadgeText()}
      badgeTooltip={getTooltip()}
    >
      {hasData ? (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', minHeight: '280px' }}>
          {/* Compacte legenda voor NL referentie - bovenaan */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#9ca3af', marginBottom: '4px' }}>
            <svg width="16" height="8">
              <line x1="0" y1="4" x2="16" y2="4" stroke="#1d1d1b" strokeWidth="2" strokeDasharray="4 2" />
            </svg>
            <span>NL gemiddelde</span>
          </div>
          {/* Vertical Bar Chart - vult beschikbare ruimte en zit aan onderkant */}
          {barData.length > 0 && (
            <div style={{ flex: 1, margin: '0 -8px', minHeight: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 30, left: 10, bottom: 25 }} barCategoryGap="20%">
                  <XAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#1d1d1b', fontSize: 12, fontWeight: 500 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={false}
                  />
                  <YAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    tickFormatter={(v) => `${v}%`}
                    axisLine={false}
                    tickLine={false}
                    width={35}
                  />
                  <Tooltip
                    formatter={(value, name, props) => {
                      if (name === 'nlWaarde') return null;
                      const payload = props.payload as { nlWaarde: number; name: string };
                      const diff = (value as number) - payload.nlWaarde;
                      const diffStr = diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
                      return [`${(value as number).toFixed(1)}% (${diffStr} t.o.v. NL)`, payload.name];
                    }}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', fontSize: '12px', borderRadius: '6px' }}
                  />
                  <Bar dataKey="value" shape={<BarWithNLLine />} maxBarSize={100} animationDuration={300} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
          <p>Geen opleidingsdata beschikbaar voor dit gebied</p>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>
            {gebiedType === 'buurt' || gebiedType === 'wijk'
              ? 'Opleidingsdata is alleen beschikbaar op gemeente niveau'
              : 'Data niet beschikbaar vanwege privacy'}
          </p>
        </div>
      )}
    </Card>
  );
}

// Werkgelegenheid Card
function WerkgelegenheidCard({
  data,
  gebiedType,
  isGemeenteData,
  gemeenteNaam
}: {
  data: {
    arbeidsparticipatie: number | null;
    werknemers: number | null;
    zelfstandigen: number | null;
    vast: number | null;
    flexibel: number | null;
  } | null;
  gebiedType: 'buurt' | 'wijk' | 'gemeente';
  isGemeenteData?: boolean;
  gemeenteNaam?: string;
}) {
  const hasData = data && data.arbeidsparticipatie !== null;

  const werkzaamData = data && (data.werknemers !== null || data.zelfstandigen !== null) ? [
    { name: 'Werknemers', value: data.werknemers ?? 0, color: COLORS.primary },
    { name: 'Zelfstandigen', value: data.zelfstandigen ?? 0, color: COLORS.blue },
  ].filter(d => d.value > 0) : [];

  // Badge text met gemeente indicatie
  // Werkgelegenheidsdata komt uit dataset 85618NED (2023) omdat 85984NED (2024) nog geen arbeidsdata heeft
  const badgeText = isGemeenteData
    ? `Gemeente ${gemeenteNaam || ''} (CBS 2023)`
    : 'CBS Kerncijfers 2023';

  return (
    <Card
      title="Werkgelegenheid"
      badge={hasData ? 'data' : 'placeholder'}
      badgeText={badgeText}
      badgeTooltip={isGemeenteData
        ? `Dataset 85618NED (2023) - Gemeente niveau data (niet beschikbaar op ${gebiedType} niveau)`
        : "Dataset 85618NED - Netto arbeidsparticipatie (15-74 jaar)"}
    >
      {hasData && data ? (
        <div>
          {/* Hoofd KPI: Arbeidsparticipatie */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ lineHeight: 1 }}>
                <span style={{
                  fontSize: '42px',
                  fontWeight: 700,
                  color: getKpiColor(data.arbeidsparticipatie, NL_REFERENTIES.arbeidsparticipatie, 'arbeidsparticipatie')
                }}>
                  {data.arbeidsparticipatie?.toFixed(1)}
                </span>
                <span style={{ fontSize: '18px', fontWeight: 500, color: '#6b7280' }}>%</span>
              </div>
              <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '12px' }}>
                netto arbeidsparticipatie
              </p>
              <p style={{ color: '#9ca3af', fontSize: '10px' }}>
                (NL: {NL_REFERENTIES.arbeidsparticipatie}%)
              </p>
            </div>

            {/* Pie chart werknemers vs zelfstandigen */}
            {werkzaamData.length > 0 && (
              <div style={{ width: '120px', height: '120px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={werkzaamData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                      animationDuration={300}
                    >
                      {werkzaamData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${(value as number).toFixed(1)}%`, '']}
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            <StatBox label="Werknemers" value={data.werknemers} color={COLORS.primary} />
            <StatBox label="Zelfstandigen" value={data.zelfstandigen} color={COLORS.blue} />
            <StatBox label="Vast contract" value={data.vast} color={COLORS.green} subLabel="van werknemers" />
            <StatBox label="Flexibel contract" value={data.flexibel} color={COLORS.amber} subLabel="van werknemers" />
          </div>
        </div>
      ) : (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
          <p>Geen werkgelegenheidsdata beschikbaar voor dit gebied</p>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>
            {gebiedType === 'buurt' || gebiedType === 'wijk'
              ? 'Werkgelegenheidsdata is alleen beschikbaar op gemeente niveau'
              : 'Data niet beschikbaar vanwege privacy'}
          </p>
        </div>
      )}
    </Card>
  );
}

function StatBox({
  label,
  value,
  color,
  subLabel
}: {
  label: string;
  value: number | null;
  color: string;
  subLabel?: string;
}) {
  return (
    <div style={{
      padding: '10px 12px',
      backgroundColor: '#f5f1ee',
      borderLeft: `3px solid ${color}`
    }}>
      <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>{label}</p>
      <p style={{ fontSize: '20px', fontWeight: 700, color: '#1d1d1b', margin: '2px 0' }}>
        {value !== null ? `${value.toFixed(1)}%` : '-'}
      </p>
      {subLabel && <p style={{ fontSize: '9px', color: '#9ca3af', margin: 0 }}>{subLabel}</p>}
    </div>
  );
}

// Uitkeringen Card met horizontal bar chart
function UitkeringenCard({
  data,
  bevolking,
  jaar,
  gebiedType,
  onYearChange,
  availableYears,
  activeYearMode,
  yearsWithData,
}: {
  data: UitkeringenData | null;
  bevolking: number;
  jaar: number;
  gebiedType: 'buurt' | 'wijk' | 'gemeente';
  onYearChange?: (jaar: number | 'trend') => void;
  availableYears?: number[];
  activeYearMode?: number | 'trend';
  yearsWithData?: number[];
}) {
  const hasData = data && (data.bijstand !== null || data.ww !== null || data.ao !== null || data.aow !== null);

  // Bereken per 1000 inwoners
  const bijstandPer1000 = calcPer1000(data?.bijstand ?? null, bevolking);
  const wwPer1000 = calcPer1000(data?.ww ?? null, bevolking);
  const aoPer1000 = calcPer1000(data?.ao ?? null, bevolking);
  const aowPer1000 = calcPer1000(data?.aow ?? null, bevolking);

  const barData = hasData && data ? [
    { name: 'Bijstand', aantal: data.bijstand ?? 0, per1000: bijstandPer1000 ?? 0, nlPer1000: NL_REFERENTIES.bijstandPer1000, color: COLORS.red },
    { name: 'WW', aantal: data.ww ?? 0, per1000: wwPer1000 ?? 0, nlPer1000: NL_REFERENTIES.wwPer1000, color: COLORS.amber },
    { name: 'AO', aantal: data.ao ?? 0, per1000: aoPer1000 ?? 0, nlPer1000: NL_REFERENTIES.aoPer1000, color: COLORS.purple },
    { name: 'AOW', aantal: data.aow ?? 0, per1000: aowPer1000 ?? 0, nlPer1000: null, color: COLORS.blue },
  ].filter(d => d.aantal > 0) : [];

  return (
    <Card
      title="Uitkeringen"
      badge={hasData ? 'data' : 'placeholder'}
      badgeText={`CBS Kerncijfers ${jaar}`}
      badgeTooltip="Dataset 85984NED - Personen met uitkering per wijk en buurt"
      year={jaar}
      onYearChange={onYearChange}
      availableYears={availableYears}
      activeYearMode={activeYearMode}
      yearsWithData={yearsWithData}
    >
      {hasData && data ? (
        <div>
          {/* Horizontal Bar Chart */}
          {barData.length > 0 && (
            <div style={{ height: `${barData.length * 50 + 40}px`, marginBottom: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ top: 10, right: 60, left: 60, bottom: 10 }}>
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#1d1d1b', fontSize: 12 }} width={60} />
                  <Tooltip
                    formatter={(value, _name, props) => {
                      const payload = props.payload as { per1000: number; nlPer1000: number | null };
                      const lines = [
                        `${formatNumber(value as number)} personen (${payload.per1000?.toFixed(1) ?? '-'} per 1000 inw.)`
                      ];
                      // Alleen NL-vergelijking tonen als beschikbaar (niet voor AOW)
                      if (payload.nlPer1000 !== null) {
                        lines.push(`NL: ${payload.nlPer1000} per 1000`);
                      }
                      return lines;
                    }}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  />
                  <Bar dataKey="aantal" radius={[0, 4, 4, 0]} animationDuration={300}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            <UitkeringBox
              label="Bijstand"
              description="Participatiewet"
              aantal={data.bijstand}
              per1000={bijstandPer1000}
              nlPer1000={NL_REFERENTIES.bijstandPer1000}
              color={COLORS.red}
            />
            <UitkeringBox
              label="WW"
              description="Werkloosheid"
              aantal={data.ww}
              per1000={wwPer1000}
              nlPer1000={NL_REFERENTIES.wwPer1000}
              color={COLORS.amber}
            />
            <UitkeringBox
              label="AO"
              description="Arbeidsongeschiktheid"
              aantal={data.ao}
              per1000={aoPer1000}
              nlPer1000={NL_REFERENTIES.aoPer1000}
              color={COLORS.purple}
            />
            {data.aow !== null && (
              <UitkeringBox
                label="AOW"
                description="Ouderdomspensioen"
                aantal={data.aow}
                per1000={aowPer1000}
                nlPer1000={null}
                color={COLORS.blue}
              />
            )}
          </div>
        </div>
      ) : (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
          <p>Geen uitkeringendata beschikbaar voor dit gebied</p>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>
            {gebiedType === 'buurt' ? 'Uitkeringendata is vaak alleen beschikbaar op gemeente niveau' : 'Data niet beschikbaar vanwege privacy'}
          </p>
        </div>
      )}
    </Card>
  );
}

function UitkeringBox({
  label,
  description,
  aantal,
  per1000,
  nlPer1000,
  color
}: {
  label: string;
  description: string;
  aantal: number | null;
  per1000: number | null;
  nlPer1000: number | null;
  color: string;
}) {
  const diff = per1000 !== null && nlPer1000 !== null ? per1000 - nlPer1000 : null;

  return (
    <div style={{
      padding: '12px',
      backgroundColor: '#f5f1ee',
      borderLeft: `3px solid ${color}`
    }}>
      <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>{label}</p>
      <p style={{ fontSize: '9px', color: '#9ca3af', margin: '2px 0 6px' }}>{description}</p>
      <p style={{ fontSize: '22px', fontWeight: 700, color: '#1d1d1b', margin: 0 }}>
        {aantal !== null ? formatNumber(aantal) : '-'}
      </p>
      {per1000 !== null && (
        <p style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0' }}>
          {per1000.toFixed(1)} per 1000 inw.
        </p>
      )}
      {diff !== null && nlPer1000 !== null && (
        <p style={{
          fontSize: '10px',
          color: diff > 2 ? COLORS.red : diff < -2 ? COLORS.green : '#6b7280',
          margin: '2px 0 0'
        }}>
          {diff > 0 ? '+' : ''}{diff.toFixed(1)} t.o.v. NL ({nlPer1000})
        </p>
      )}
    </div>
  );
}

// KPI Box helper
function KpiBox({
  label,
  value,
  nlWaarde,
  kpiKey
}: {
  label: string;
  value: number | null;
  nlWaarde: number;
  kpiKey: string;
}) {
  const color = getKpiColor(value, nlWaarde, kpiKey);

  return (
    <div style={{
      padding: '12px 16px',
      backgroundColor: '#f5f1ee',
      minWidth: '120px',
      borderLeft: `3px solid ${color}`
    }}>
      <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '24px', fontWeight: 700, color, margin: 0 }}>
        {value !== null ? (
          <>
            {value.toFixed(1)}
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', marginLeft: '2px' }}>%</span>
          </>
        ) : '-'}
      </p>
      <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>
        (NL: {nlWaarde.toFixed(1)}%)
      </p>
    </div>
  );
}
