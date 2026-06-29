import { useState, useEffect } from 'react';
import { useGebiedStore } from '../../../../store/gebiedStore';
import { useActiveBenchmarks } from '../../../../hooks/useActiveBenchmarks';
import { fetchZorgWelzijnData } from '../../../../services/rivm';
import type { ZorgWelzijnData } from '../../../../types/zorgWelzijn';
import { logger } from '../../../../utils/logger';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const HOGER_IS_BETER = ['vrijwilligerswerk', 'ervarenGezondheid'];
const ZORG_KEY: Record<string, string> = {
  eenzaam: 'eenzaamheid', ernstigEenzaam: 'ernstigeEenzaamheid',
  emotioneelEenzaam: 'emotioneelEenzaam', sociaalEenzaam: 'sociaalEenzaam',
  psychischeKlachten: 'psychischeKlachten', angstDepressie: 'angstDepressie',
  stress: 'stress', emotioneleSteun: 'emotioneleSteun', veerkracht: 'veerkracht',
  mantelzorger: 'mantelzorger', vrijwilligerswerk: 'vrijwilligerswerk',
  ervarenGezondheid: 'ervarenGezondheid', langdurigeAandoeningen: 'langdurigeAandoeningen',
  beperkt: 'beperkt', moeiteRondkomen: 'moeiteRondkomen',
};
const MG_SCHALEN: Record<string, number> = {
  angstDepressie: 25, psychischeKlachten: 45, stress: 45, emotioneleSteun: 15, veerkracht: 35,
};

function kpiKleur(value: number | null, nl: number, key: string): string {
  if (value === null) return '#9ca3af';
  const diff = value - nl;
  const adj = HOGER_IS_BETER.includes(key) ? -diff : diff;
  return adj <= 2 ? '#22c55e' : adj <= 5 ? '#f59e0b' : '#ef4444';
}

function Spinner() { return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Laden...</div>; }
function SectionHeader({ title, jaar }: { title: string; jaar?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{title}</h3>
      {jaar && <span style={{ fontSize: '12px', color: '#9ca3af' }}>RIVM {jaar}</span>}
    </div>
  );
}

function useZorgData() {
  const { selectedGebied, selectedJaar } = useGebiedStore();
  const [zorgData, setZorgData] = useState<ZorgWelzijnData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedGebied) { setZorgData(null); return; }
    setLoading(true);
    fetchZorgWelzijnData(
      selectedGebied.code, selectedGebied.wijkCode, selectedGebied.gemeenteCode,
      selectedGebied.naam, selectedGebied.wijkNaam, selectedGebied.gemeenteNaam, selectedJaar,
    ).then(d => { setZorgData(d); }).catch(e => logger.error('zorg fetch', e)).finally(() => setLoading(false));
  }, [selectedGebied, selectedJaar]);

  return { zorgData, loading };
}

export function ZorgWelzijnSection({ sectionId }: { sectionId: string }) {
  const { zorgData, loading } = useZorgData();
  const { ref, refNaamVoor } = useActiveBenchmarks(zorgData);
  const refZ = (k: string) => ref(ZORG_KEY[k] as Parameters<typeof ref>[0]);
  const refNZ = (k: string) => refNaamVoor(ZORG_KEY[k] as Parameters<typeof refNaamVoor>[0]);

  if (loading) return <Spinner />;
  if (!zorgData) return <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>Geen data beschikbaar</div>;

  const { eenzaamheid, mentaleGezondheid, zorgOndersteuning, trend, dataJaar } = zorgData;

  if (sectionId === 'zorg-eenzaamheid') {
    return (
      <div style={{ padding: '16px' }}>
        <SectionHeader title="Eenzaamheid" jaar={dataJaar} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', minWidth: '120px' }}>
            {eenzaamheid.totaal !== null ? (
              <>
                <span style={{ fontSize: '48px', fontWeight: 700, color: kpiKleur(eenzaamheid.totaal, refZ('eenzaam'), 'eenzaam') }}>
                  {eenzaamheid.totaal.toFixed(1)}
                </span>
                <span style={{ fontSize: '18px', color: '#6b7280' }}>%</span>
              </>
            ) : <span style={{ fontSize: '48px', fontWeight: 700, color: '#9ca3af' }}>-</span>}
            <p style={{ color: '#6b7280', fontSize: '13px', margin: '4px 0 0' }}>voelt zich eenzaam</p>
            <p style={{ color: '#9ca3af', fontSize: '11px', margin: '2px 0 0' }}>
              ({refNZ('eenzaam') === 'Nederland' ? 'NL' : refNZ('eenzaam')}: {refZ('eenzaam').toFixed(1)}%)
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
            {[
              { label: 'Ernstig', value: eenzaamheid.ernstig, key: 'ernstigEenzaam' },
              { label: 'Emotioneel', value: eenzaamheid.emotioneel, key: 'emotioneelEenzaam' },
              { label: 'Sociaal', value: eenzaamheid.sociaal, key: 'sociaalEenzaam' },
            ].map(({ label, value, key }) => (
              <div key={key} style={{ padding: '10px 14px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', textAlign: 'center', flex: '1 1 80px' }}>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px' }}>{label}</p>
                <p style={{ fontSize: '22px', fontWeight: 700, color: kpiKleur(value, refZ(key), key), margin: 0 }}>
                  {value !== null ? `${value.toFixed(1)}%` : '-'}
                </p>
                <p style={{ fontSize: '10px', color: '#9ca3af', margin: '2px 0 0' }}>ref: {refZ(key).toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (sectionId === 'zorg-eenzaamheid-trend') {
    const hasTrend = trend?.jaren && trend.jaren.length > 0;
    return (
      <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <SectionHeader title="Eenzaamheid Trend" jaar={dataJaar} />
        {hasTrend ? (
          <div style={{ flex: 1, minHeight: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend!.jaren} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="jaar" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" width={40} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="eenzaam" name="Eenzaam" stroke="#eb6608" strokeWidth={2} dot={{ r: 3 }} animationDuration={300} />
                <Line type="monotone" dataKey="ernstigEenzaam" name="Ernstig" stroke="#e74c3c" strokeWidth={2} dot={{ r: 3 }} animationDuration={300} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Geen trenddata</div>}
      </div>
    );
  }

  if (sectionId === 'zorg-mentaal') {
    const items = [
      { label: 'Angst/depressie', value: mentaleGezondheid.angstDepressie, key: 'angstDepressie' },
      { label: 'Psychische klachten', value: mentaleGezondheid.psychischeKlachten, key: 'psychischeKlachten' },
      { label: 'Stress', value: mentaleGezondheid.stress, key: 'stress' },
      { label: 'Emotionele steun nodig', value: mentaleGezondheid.emotioneleSteun, key: 'emotioneleSteun' },
      { label: 'Lage veerkracht', value: mentaleGezondheid.veerkracht, key: 'veerkracht' },
    ];
    return (
      <div style={{ padding: '16px' }}>
        <SectionHeader title="Mentale Gezondheid" jaar={dataJaar} />
        {items.map(({ label, value, key }) => {
          const max = MG_SCHALEN[key] ?? 100;
          const pct = value !== null ? Math.min(100, (value / max) * 100) : 0;
          const ref2 = refZ(key);
          const refPct = (ref2 / max) * 100;
          return (
            <div key={key} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', color: '#374151' }}>{label}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: kpiKleur(value, ref2, key) }}>
                  {value !== null ? `${value.toFixed(1)}%` : '-'}
                </span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#f3f4f6', position: 'relative', overflow: 'visible' }}>
                <div style={{ height: '100%', width: `${pct}%`, backgroundColor: kpiKleur(value, ref2, key), transition: 'width 0.3s' }} />
                <div style={{ position: 'absolute', top: '-3px', left: `${refPct}%`, width: '2px', height: '14px', backgroundColor: '#6b7280' }} title={`Ref: ${ref2.toFixed(1)}%`} />
              </div>
              <p style={{ fontSize: '10px', color: '#9ca3af', margin: '2px 0 0', textAlign: 'right' }}>ref: {ref2.toFixed(1)}%</p>
            </div>
          );
        })}
      </div>
    );
  }

  if (sectionId === 'zorg-ondersteuning') {
    const items = [
      { label: 'Mantelzorger', value: zorgOndersteuning.mantelzorger, key: 'mantelzorger', desc: '% geeft mantelzorg' },
      { label: 'Vrijwilligerswerk', value: zorgOndersteuning.vrijwilligerswerk, key: 'vrijwilligerswerk', desc: '% doet vrijwilligerswerk' },
      { label: 'Ervaren gezondheid goed', value: zorgOndersteuning.ervarenGezondheid, key: 'ervarenGezondheid', desc: '% ervaart gezondheid als goed' },
      { label: 'Langdurige aandoeningen', value: zorgOndersteuning.langdurigeAandoeningen, key: 'langdurigeAandoeningen', desc: '% heeft langdurige aandoening' },
      { label: 'Beperkt door gezondheid', value: zorgOndersteuning.beperkt, key: 'beperkt', desc: '% is beperkt in dagelijks leven' },
      { label: 'Moeite rondkomen', value: zorgOndersteuning.moeiteRondkomen, key: 'moeiteRondkomen', desc: '% heeft moeite met rondkomen' },
    ];
    return (
      <div style={{ padding: '16px' }}>
        <SectionHeader title="Zorg & Ondersteuning" jaar={dataJaar} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          {items.map(({ label, value, key, desc }) => (
            <div key={key} style={{ padding: '12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px' }}>{label}</p>
              <p style={{ fontSize: '22px', fontWeight: 700, color: kpiKleur(value, refZ(key), key), margin: 0 }}>
                {value !== null ? `${value.toFixed(1)}%` : '-'}
              </p>
              <p style={{ fontSize: '10px', color: '#9ca3af', margin: '2px 0 0' }}>{desc}</p>
              <p style={{ fontSize: '10px', color: '#9ca3af', margin: '1px 0 0' }}>ref: {refZ(key).toFixed(1)}%</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
