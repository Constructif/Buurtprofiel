import { useCallback } from 'react';
import { useGebiedStore } from '../../../../store/gebiedStore';
import { useActiveBenchmarks } from '../../../../hooks/useActiveBenchmarks';
import { fetchKerncijfersForYear, fetchKerncijfersAllYears } from '../../../../services/cbs';
import { useCardYear } from '../../../../hooks/useCardYear';
import { CardTrendChart } from '../../../ui/CardTrendChart';
import type { UitkeringenData } from '../../../../types/werkInkomen';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts';

const COLORS = {
  primary: '#eb6608', dark: '#1d1d1b', green: '#22c55e', amber: '#f59e0b',
  red: '#ef4444', gray: '#9ca3af', blue: '#3b82f6', purple: '#8b5cf6',
};
const HOGER_IS_BETER = ['arbeidsparticipatie', 'hoogInkomen', 'opleidingHoog', 'gemiddeldInkomen'];

function getKpiColor(value: number | null, nlWaarde: number, key: string): string {
  if (value === null) return COLORS.gray;
  const diff = value - nlWaarde;
  const adj = HOGER_IS_BETER.includes(key) ? -diff : diff;
  return adj <= 2 ? COLORS.green : adj <= 5 ? COLORS.amber : COLORS.red;
}
function fmt(n: number) { return n.toLocaleString('nl-NL'); }
function fmtEur(n: number) { return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n); }
function per1000(v: number | null, bev: number): number | null {
  if (v === null || bev === 0) return null;
  return Math.round((v / bev) * 1000 * 10) / 10;
}

function Spinner() { return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Laden...</div>; }
function SectionHeader({ title, jaar }: { title: string; jaar?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{title}</h3>
      {jaar && <span style={{ fontSize: '12px', color: '#9ca3af' }}>CBS {jaar}</span>}
    </div>
  );
}
function StatBox({ label, value, color, subLabel }: { label: string; value: number | null; color: string; subLabel?: string }) {
  return (
    <div style={{ padding: '10px 12px', backgroundColor: '#f5f1ee', borderLeft: `3px solid ${color}` }}>
      <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>{label}</p>
      <p style={{ fontSize: '20px', fontWeight: 700, color: '#1d1d1b', margin: '2px 0' }}>{value !== null ? `${value.toFixed(1)}%` : '-'}</p>
      {subLabel && <p style={{ fontSize: '9px', color: '#9ca3af', margin: 0 }}>{subLabel}</p>}
    </div>
  );
}

export function WerkInkomenSection({ sectionId }: { sectionId: string }) {
  const { gebiedData, selectedGebied } = useGebiedStore();
  const { ref, refNaamVoor, benchmarkNaam } = useActiveBenchmarks();
  const refKort = (k: Parameters<typeof ref>[0]) => refNaamVoor(k) === 'Nederland' ? 'NL' : refNaamVoor(k);

  const code = gebiedData?.code ?? '';
  const defaultJaar = gebiedData?.kerncijfersJaar ?? 2025;
  const kcFetcher = useCallback((jaar: number) => fetchKerncijfersForYear(code, jaar), [code]);
  const kcTrend = useCallback(() => fetchKerncijfersAllYears(code), [code]);
  const inkomenCard = useCardYear(defaultJaar, kcFetcher, kcTrend);
  const uitkeringenCard = useCardYear(defaultJaar, kcFetcher, kcTrend);

  if (!gebiedData || !selectedGebied) return <Spinner />;

  const ink = inkomenCard.overrideData?.inkomen ?? gebiedData.inkomen;
  const jaar = inkomenCard.overrideData?._jaar ?? gebiedData.kerncijfersJaar ?? 2024;
  const uitJaar = uitkeringenCard.overrideData?._jaar ?? gebiedData.kerncijfersJaar ?? 2024;
  const werkInkomen = gebiedData.werkInkomen;
  const bevolking = gebiedData.bevolking.totaal;

  const gemiddeld = ink?.gemiddeld ?? null;
  const laag = ink?.laagInkomenPercentage ?? null;
  const hoog = ink?.hoogInkomenPercentage ?? null;
  const midden = (laag !== null && hoog !== null) ? Math.max(0, 100 - laag - hoog) : null;

  if (sectionId === 'economie-inkomen') {
    if (inkomenCard.isLoading) return <Spinner />;
    if (inkomenCard.activeMode === 'trend' && inkomenCard.trendData) {
      return (
        <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <SectionHeader title="Inkomen Trend" jaar={jaar} />
          <div style={{ flex: 1, minHeight: '200px' }}>
            <CardTrendChart data={inkomenCard.trendData} lines={[{ key: 'inkomen', label: 'Gem. inkomen (€)', color: '#eb6608' }]} />
          </div>
        </div>
      );
    }
    const refGem = ref('gemiddeldInkomen');
    const refLaag = ref('laagInkomen');
    const refHoog = ref('hoogInkomen');
    const barData = [{ name: 'Inkomensverdeling', laag: laag ?? 0, midden: midden ?? 0, hoog: hoog ?? 0 }];
    return (
      <div style={{ padding: '16px' }}>
        <SectionHeader title="Inkomen" jaar={jaar} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', minWidth: '150px' }}>
            {gemiddeld !== null ? (
              <span style={{ fontSize: '32px', fontWeight: 700, color: getKpiColor(gemiddeld, refGem, 'gemiddeldInkomen') }}>
                {fmtEur(gemiddeld)}
              </span>
            ) : <span style={{ fontSize: '24px', color: '#9ca3af' }}>Niet beschikbaar</span>}
            <p style={{ color: '#6b7280', fontSize: '13px', margin: '4px 0 0' }}>gem. besteedbaar inkomen</p>
            <p style={{ color: '#9ca3af', fontSize: '11px', margin: '2px 0 0' }}>({refKort('gemiddeldInkomen')}: {fmtEur(refGem)})</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
            {[
              { label: 'Laag inkomen',   value: laag,   nlW: refLaag,              refKey: 'laagInkomen'  as Parameters<typeof ref>[0] },
              { label: 'Midden inkomen', value: midden, nlW: 100 - refLaag - refHoog, refKey: null },
              { label: 'Hoog inkomen',   value: hoog,   nlW: refHoog,              refKey: 'hoogInkomen'  as Parameters<typeof ref>[0] },
            ].map(({ label, value, nlW, refKey }) => (
              <div key={label} style={{ padding: '10px 14px', backgroundColor: '#f5f1ee', minWidth: '100px', flex: '1 1 90px',
                borderLeft: `3px solid ${getKpiColor(value, nlW, label)}` }}>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px' }}>{label}</p>
                <p style={{ fontSize: '22px', fontWeight: 700, color: getKpiColor(value, nlW, label), margin: 0 }}>
                  {value !== null ? `${value.toFixed(1)}%` : '-'}
                </p>
                {refKey && <p style={{ fontSize: '10px', color: '#9ca3af', margin: '2px 0 0' }}>({refKort(refKey)}: {nlW.toFixed(1)}%)</p>}
              </div>
            ))}
          </div>
        </div>
        {(laag !== null || midden !== null || hoog !== null) && (
          <div style={{ marginTop: '16px', height: '50px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip formatter={(v, n) => [`${(v as number).toFixed(1)}%`, n === 'laag' ? 'Laag' : n === 'midden' ? 'Midden' : 'Hoog']}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                <Bar dataKey="laag" stackId="a" fill={COLORS.red} animationDuration={300} />
                <Bar dataKey="midden" stackId="a" fill={COLORS.amber} animationDuration={300} />
                <Bar dataKey="hoog" stackId="a" fill={COLORS.green} animationDuration={300} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  if (sectionId === 'economie-opleiding') {
    const opleiding = werkInkomen?.opleiding ?? null;
    const hasData = opleiding && (opleiding.laag !== null || opleiding.midden !== null || opleiding.hoog !== null);
    const refLaag = ref('opleidingLaag');
    const refMidden = ref('opleidingMidden');
    const refHoog = ref('opleidingHoog');
    const barData = hasData ? [
      { name: 'Laag', value: opleiding.laag ?? 0, nlWaarde: refLaag, color: COLORS.red },
      { name: 'Midden', value: opleiding.midden ?? 0, nlWaarde: refMidden, color: COLORS.amber },
      { name: 'Hoog', value: opleiding.hoog ?? 0, nlWaarde: refHoog, color: COLORS.green },
    ].filter(d => d.value > 0) : [];
    return (
      <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <SectionHeader title="Opleidingsniveau" jaar={jaar} />
        {hasData && barData.length > 0 ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '10px', color: '#9ca3af', marginBottom: '4px', gap: '4px', alignItems: 'center' }}>
              <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke="#1d1d1b" strokeWidth="2" strokeDasharray="4 2" /></svg>
              <span>{refKort('opleidingLaag' as Parameters<typeof ref>[0])} gem.</span>
            </div>
            <div style={{ flex: 1, minHeight: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fill: '#1d1d1b', fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} width={35} />
                  <Tooltip formatter={(value, _, props) => {
                    const p = props.payload as { nlWaarde: number; name: string };
                    const diff = (value as number) - p.nlWaarde;
                    return [`${(value as number).toFixed(1)}% (${diff >= 0 ? '+' : ''}${diff.toFixed(1)} t.o.v. ${refKort('opleidingLaag' as Parameters<typeof ref>[0])})`, p.name];
                  }} contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                  <Bar dataKey="value" maxBarSize={100} animationDuration={300}>
                    {barData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Geen opleidingsdata beschikbaar</div>}
      </div>
    );
  }

  if (sectionId === 'economie-werk') {
    const werk = werkInkomen?.werkgelegenheid ?? null;
    const hasData = werk && werk.arbeidsparticipatie !== null;
    const refAP = ref('arbeidsparticipatie');
    const werkzaamData = werk && (werk.werknemers !== null || werk.zelfstandigen !== null) ? [
      { name: 'Werknemers', value: werk.werknemers ?? 0, color: COLORS.primary },
      { name: 'Zelfstandigen', value: werk.zelfstandigen ?? 0, color: COLORS.blue },
    ].filter(d => d.value > 0) : [];
    return (
      <div style={{ padding: '16px' }}>
        <SectionHeader title="Werkgelegenheid" />
        {hasData && werk ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '42px', fontWeight: 700, color: getKpiColor(werk.arbeidsparticipatie, refAP, 'arbeidsparticipatie') }}>
                  {werk.arbeidsparticipatie?.toFixed(1)}
                </span>
                <span style={{ fontSize: '18px', color: '#6b7280' }}>%</span>
                <p style={{ color: '#6b7280', fontSize: '12px', margin: '4px 0 0' }}>netto arbeidsparticipatie</p>
                <p style={{ color: '#9ca3af', fontSize: '10px' }}>({refKort('arbeidsparticipatie')}: {refAP.toFixed(1)}%)</p>
              </div>
              {werkzaamData.length > 0 && (
                <div style={{ width: '100px', height: '100px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={werkzaamData} cx="50%" cy="50%" innerRadius={25} outerRadius={45} paddingAngle={2} dataKey="value" animationDuration={300}>
                        {werkzaamData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`${(v as number).toFixed(1)}%`, '']} contentStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              <StatBox label="Werknemers" value={werk.werknemers} color={COLORS.primary} />
              <StatBox label="Zelfstandigen" value={werk.zelfstandigen} color={COLORS.blue} />
              <StatBox label="Vast contract" value={werk.vast} color={COLORS.green} subLabel="van werknemers" />
              <StatBox label="Flexibel contract" value={werk.flexibel} color={COLORS.amber} subLabel="van werknemers" />
            </div>
          </>
        ) : <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Geen werkgelegenheidsdata beschikbaar</div>}
      </div>
    );
  }

  if (sectionId === 'economie-uitkeringen') {
    if (uitkeringenCard.isLoading) return <Spinner />;
    const uitk = werkInkomen?.uitkeringen as UitkeringenData | null ?? null;
    const hasData = uitk && (uitk.bijstand !== null || uitk.ww !== null || uitk.ao !== null || uitk.aow !== null);
    const bijstandP = per1000(uitk?.bijstand ?? null, bevolking);
    const wwP = per1000(uitk?.ww ?? null, bevolking);
    const aoP = per1000(uitk?.ao ?? null, bevolking);
    const refBijstand = ref('bijstandPer1000');
    const refWw = ref('wwPer1000');
    const refAo = ref('aoPer1000');
    const barData = hasData && uitk ? [
      { name: 'Bijstand', aantal: uitk.bijstand ?? 0, per1000v: bijstandP ?? 0, nlPer1000: refBijstand, color: COLORS.red },
      { name: 'WW', aantal: uitk.ww ?? 0, per1000v: wwP ?? 0, nlPer1000: refWw, color: COLORS.amber },
      { name: 'AO', aantal: uitk.ao ?? 0, per1000v: aoP ?? 0, nlPer1000: refAo, color: COLORS.purple },
    ].filter(d => d.aantal > 0) : [];
    return (
      <div style={{ padding: '16px' }}>
        <SectionHeader title="Uitkeringen" jaar={uitJaar} />
        {hasData && uitk ? (
          <>
            {barData.length > 0 && (
              <div style={{ height: `${barData.length * 50 + 40}px`, marginBottom: '12px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 40, left: 40, bottom: 5 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={55} />
                    <Tooltip formatter={(v, _, props) => {
                      const p = props.payload as { per1000v: number; nlPer1000: number | null };
                      return [`${fmt(v as number)} personen (${p.per1000v?.toFixed(1) ?? '-'} per 1000 inw.)\n${refKort('bijstandPer1000')}: ${p.nlPer1000?.toFixed(1) ?? '-'} per 1000`];
                    }} contentStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="aantal" radius={[0, 4, 4, 0]} animationDuration={300}>
                      {barData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              {[
                { label: 'Bijstand', desc: 'Participatiewet', aantal: uitk.bijstand, p: bijstandP, refP: refBijstand, color: COLORS.red },
                { label: 'WW', desc: 'Werkloosheid', aantal: uitk.ww, p: wwP, refP: refWw, color: COLORS.amber },
                { label: 'AO', desc: 'Arbeidsongeschiktheid', aantal: uitk.ao, p: aoP, refP: refAo, color: COLORS.purple },
              ].map(({ label, desc, aantal, p, refP, color }) => {
                const diff = p !== null && refP !== null ? p - refP : null;
                return (
                  <div key={label} style={{ padding: '10px 12px', backgroundColor: '#f5f1ee', borderLeft: `3px solid ${color}` }}>
                    <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: '9px', color: '#9ca3af', margin: '2px 0 4px' }}>{desc}</p>
                    <p style={{ fontSize: '20px', fontWeight: 700, color: '#1d1d1b', margin: 0 }}>{aantal !== null ? fmt(aantal) : '-'}</p>
                    {p !== null && <p style={{ fontSize: '11px', color: '#6b7280', margin: '3px 0 0' }}>{p.toFixed(1)} per 1000 inw.</p>}
                    {diff !== null && <p style={{ fontSize: '10px', color: diff > 2 ? COLORS.red : diff < -2 ? COLORS.green : '#6b7280', margin: '1px 0 0' }}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)} t.o.v. {refKort('bijstandPer1000')}
                    </p>}
                  </div>
                );
              })}
              {uitk.aow !== null && (
                <div style={{ padding: '10px 12px', backgroundColor: '#f5f1ee', borderLeft: `3px solid ${COLORS.blue}` }}>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>AOW</p>
                  <p style={{ fontSize: '9px', color: '#9ca3af', margin: '2px 0 4px' }}>Ouderdomspensioen</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: '#1d1d1b', margin: 0 }}>{fmt(uitk.aow)}</p>
                </div>
              )}
            </div>
          </>
        ) : <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Geen uitkeringendata beschikbaar</div>}
      </div>
    );
  }

  return null;
}
