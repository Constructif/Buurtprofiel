import { useState, useEffect } from 'react';
import { useGebiedStore } from '../../../store/gebiedStore';
import { Card } from '../../ui/Card';
import { fetchZorgWelzijnData } from '../../../services/rivm';
import type { ZorgWelzijnData } from '../../../types/zorgWelzijn';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

// NL Referentiewaarden 2022 (hardcoded om extra API call te vermijden)
const NL_REFERENTIES = {
  eenzaam: 46.2,
  ernstigEenzaam: 13.2,
  emotioneelEenzaam: 35.0,
  sociaalEenzaam: 25.0,
  psychischeKlachten: 18.5,
  angstDepressie: 8.5,
  stress: 17.0,
  emotioneleSteun: 6.2,
  veerkracht: 14.8,
  mantelzorger: 14.5,
  vrijwilligerswerk: 25.0,
  ervarenGezondheid: 75.0,
  langdurigeAandoeningen: 32.0,
  beperkt: 30.2,
  moeiteRondkomen: 18.0,
};

// Indicatoren waar hoger = beter
const HOGER_IS_BETER = ['vrijwilligerswerk', 'ervarenGezondheid'];

// Progress bar schalen per indicator
const MENTALE_GEZONDHEID_SCHALEN: Record<string, number> = {
  angstDepressie: 25,
  psychischeKlachten: 40,
  stress: 40,
  emotioneleSteun: 20,
  veerkracht: 30,
};

// Badge configuratie per sectie (jaar wordt dynamisch toegevoegd)
const getBadgeConfig = (jaar: number) => ({
  eenzaamheid: {
    badgeText: `RIVM Gezondheidsmonitor ${jaar}`,
    badgeTooltip: `Dataset 50120NED - Geschatte percentages gezondheid en welzijn per wijk/buurt (${jaar})`
  },
  mentaleGezondheid: {
    badgeText: `RIVM Gezondheidsmonitor ${jaar}`,
    badgeTooltip: 'Gebaseerd op GGD Gezondheidsmonitor Volwassenen en Ouderen'
  },
  zorgOndersteuning: {
    badgeText: `RIVM Gezondheidsmonitor ${jaar}`,
    badgeTooltip: 'Percentages 18+ populatie, CBS/GGD/RIVM data'
  }
});

// Kleurlogica voor KPIs gebaseerd op vergelijking met NL
function getKpiColor(value: number | null, nlWaarde: number, key: string): string {
  if (value === null) return '#9ca3af';  // Grijs

  const diff = value - nlWaarde;
  const higherIsBetter = HOGER_IS_BETER.includes(key);

  // Als hoger beter is, draai de logica om
  const adjustedDiff = higherIsBetter ? -diff : diff;

  if (adjustedDiff <= 2) return '#22c55e';   // Groen - beter of gelijk
  if (adjustedDiff <= 5) return '#f59e0b';   // Oranje - iets slechter
  return '#ef4444';                          // Rood - veel slechter
}

// Kleuren voor eenzaamheid vergelijking
const getEenzaamheidColor = (percentage: number | null): string => {
  if (percentage === null) return '#9ca3af';
  return getKpiColor(percentage, NL_REFERENTIES.eenzaam, 'eenzaam');
};

export function ZorgWelzijn() {
  const { selectedGebied, isLoadingData, gebiedData } = useGebiedStore();
  const [zorgData, setZorgData] = useState<ZorgWelzijnData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedGebied) {
      setZorgData(null);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchZorgWelzijnData(
          selectedGebied.code,
          selectedGebied.wijkCode,
          selectedGebied.gemeenteCode,
          selectedGebied.naam,
          selectedGebied.wijkNaam,
          selectedGebied.gemeenteNaam
        );

        setZorgData(data);
        if (!data) {
          setError('Geen data beschikbaar voor dit gebied');
        }
      } catch (err) {
        setError('Fout bij ophalen van data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedGebied]);

  // No selection state
  if (!selectedGebied) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>
        <p style={{ fontSize: '20px' }}>Selecteer een gebied om zorg & welzijn data te bekijken</p>
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
        <p style={{ color: '#6b7280' }}>Zorg & Welzijn data laden...</p>
      </div>
    );
  }

  // Error state
  if (error && !zorgData) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>
        <p style={{ fontSize: '20px' }}>{error}</p>
        <p style={{ fontSize: '14px', marginTop: '8px' }}>
          RIVM gezondheidsdata is mogelijk niet beschikbaar voor alle gebieden
        </p>
      </div>
    );
  }

  if (!zorgData) return null;

  const { eenzaamheid, mentaleGezondheid, zorgOndersteuning, trend, vergelijking, dataJaar } = zorgData;
  const badgeConfig = getBadgeConfig(dataJaar);

  // Aandachtspunten data samenstellen
  const aandachtspunten = [
    { label: 'Eenzaamheid', value: eenzaamheid.totaal, nlWaarde: NL_REFERENTIES.eenzaam, key: 'eenzaam' },
    { label: 'Ernstig eenzaam', value: eenzaamheid.ernstig, nlWaarde: NL_REFERENTIES.ernstigEenzaam, key: 'ernstigEenzaam' },
    { label: 'Psychische klachten', value: mentaleGezondheid.psychischeKlachten, nlWaarde: NL_REFERENTIES.psychischeKlachten, key: 'psychischeKlachten' },
    { label: 'Angst/depressie risico', value: mentaleGezondheid.angstDepressie, nlWaarde: NL_REFERENTIES.angstDepressie, key: 'angstDepressie' },
    { label: 'Beperkt door gezondheid', value: zorgOndersteuning.beperkt, nlWaarde: NL_REFERENTIES.beperkt, key: 'beperkt' },
    { label: 'Moeite rondkomen', value: zorgOndersteuning.moeiteRondkomen, nlWaarde: NL_REFERENTIES.moeiteRondkomen, key: 'moeiteRondkomen' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* SECTIE 0: Aandachtspunten */}
      <AandachtspuntenCard punten={aandachtspunten} />

      {/* SECTIE 1: Eenzaamheid */}
      <Card
        title="Eenzaamheid"
        badge="data"
        badgeText={badgeConfig.eenzaamheid.badgeText}
        badgeTooltip={badgeConfig.eenzaamheid.badgeTooltip}
      >
        <div style={{ padding: '8px 0' }}>
          {/* Hoofd KPI en Sub KPIs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', minWidth: '140px' }}>
              <div style={{ lineHeight: 1 }}>
                {eenzaamheid.totaal !== null ? (
                  <>
                    <span style={{ fontSize: '48px', fontWeight: 700, color: getKpiColor(eenzaamheid.totaal, NL_REFERENTIES.eenzaam, 'eenzaam') }}>
                      {eenzaamheid.totaal.toFixed(1)}
                    </span>
                    <span style={{ fontSize: '18px', fontWeight: 500, color: '#6b7280', marginLeft: '2px' }}>%</span>
                  </>
                ) : (
                  <span style={{ fontSize: '48px', fontWeight: 700, color: '#9ca3af' }}>-</span>
                )}
              </div>
              <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '13px' }}>
                voelt zich eenzaam
              </p>
              <p style={{ color: '#9ca3af', fontSize: '11px', marginTop: '2px' }}>
                (NL: {NL_REFERENTIES.eenzaam}%)
              </p>
            </div>

            {/* Sub KPIs */}
            <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
              <KpiBox label="Ernstig eenzaam" value={eenzaamheid.ernstig} nlWaarde={NL_REFERENTIES.ernstigEenzaam} kpiKey="ernstigEenzaam" />
              <KpiBox label="Emotioneel eenzaam" value={eenzaamheid.emotioneel} nlWaarde={NL_REFERENTIES.emotioneelEenzaam} kpiKey="emotioneelEenzaam" />
              <KpiBox label="Sociaal eenzaam" value={eenzaamheid.sociaal} nlWaarde={NL_REFERENTIES.sociaalEenzaam} kpiKey="sociaalEenzaam" />
            </div>
          </div>

          {/* Vergelijking - alleen relevante kolommen tonen */}
          {vergelijking && (
            <div style={{ marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {/* Buurt: alleen tonen als BUURT geselecteerd */}
              {selectedGebied?.type === 'buurt' && (
                <ComparisonColumn
                  label="Buurt"
                  value={vergelijking.buurt?.eenzaam}
                  naam={vergelijking.buurt?.naam}
                  isActive={true}
                />
              )}

              {/* Wijk: alleen tonen als BUURT of WIJK geselecteerd */}
              {(selectedGebied?.type === 'buurt' || selectedGebied?.type === 'wijk') && (
                <ComparisonColumn
                  label="Wijk"
                  value={vergelijking.wijk?.eenzaam}
                  naam={vergelijking.wijk?.naam}
                  isActive={selectedGebied?.type === 'wijk'}
                />
              )}

              {/* Gemeente: altijd tonen */}
              <ComparisonColumn
                label="Gemeente"
                value={vergelijking.gemeente?.eenzaam}
                naam={vergelijking.gemeente?.naam}
                isActive={selectedGebied?.type === 'gemeente'}
              />

              {/* Nederland: altijd tonen */}
              <ComparisonColumn
                label="Nederland"
                value={vergelijking.nederland?.eenzaam}
                naam="Nederland"
                isActive={false}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Trend grafiek en Mentale Gezondheid naast elkaar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Trend grafiek */}
        <Card
          title="Eenzaamheid Trend (2012-2022)"
          badge={trend?.jaren && trend.jaren.length > 0 ? 'data' : 'placeholder'}
          badgeText={badgeConfig.eenzaamheid.badgeText}
        >
          {trend?.jaren && trend.jaren.length > 0 ? (
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend.jaren} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="jaar" tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} unit="%" width={40} domain={[0, 'auto']} />
                  <Tooltip
                    formatter={(value?: number) => value !== undefined && value !== null ? [`${value.toFixed(1)}%`, ''] : ['-', '']}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line
                    type="monotone"
                    dataKey="eenzaam"
                    name="Eenzaam"
                    stroke="#eb6608"
                    strokeWidth={2}
                    dot={{ fill: '#eb6608', r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="ernstigEenzaam"
                    name="Ernstig eenzaam"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <p>Geen trenddata beschikbaar</p>
            </div>
          )}
        </Card>

        {/* SECTIE 2: Mentale Gezondheid met progress bars */}
        <Card
          title="Mentale Gezondheid"
          badge="data"
          badgeText={badgeConfig.mentaleGezondheid.badgeText}
          badgeTooltip={badgeConfig.mentaleGezondheid.badgeTooltip}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <ProgressBarRow
              label="Hoog risico angst/depressie"
              value={mentaleGezondheid.angstDepressie}
              nlWaarde={NL_REFERENTIES.angstDepressie}
              maxValue={MENTALE_GEZONDHEID_SCHALEN.angstDepressie}
              kpiKey="angstDepressie"
            />
            <ProgressBarRow
              label="Psychische klachten"
              value={mentaleGezondheid.psychischeKlachten}
              nlWaarde={NL_REFERENTIES.psychischeKlachten}
              maxValue={MENTALE_GEZONDHEID_SCHALEN.psychischeKlachten}
              kpiKey="psychischeKlachten"
            />
            <ProgressBarRow
              label="(Heel) veel stress"
              value={mentaleGezondheid.stress}
              nlWaarde={NL_REFERENTIES.stress}
              maxValue={MENTALE_GEZONDHEID_SCHALEN.stress}
              kpiKey="stress"
            />
            <ProgressBarRow
              label="Mist emotionele steun"
              value={mentaleGezondheid.emotioneleSteun}
              nlWaarde={NL_REFERENTIES.emotioneleSteun}
              maxValue={MENTALE_GEZONDHEID_SCHALEN.emotioneleSteun}
              kpiKey="emotioneleSteun"
            />
            <ProgressBarRow
              label="(Zeer) lage veerkracht"
              value={mentaleGezondheid.veerkracht}
              nlWaarde={NL_REFERENTIES.veerkracht}
              maxValue={MENTALE_GEZONDHEID_SCHALEN.veerkracht}
              kpiKey="veerkracht"
            />
          </div>
        </Card>
      </div>

      {/* SECTIE 3: Zorg & Ondersteuning */}
      <Card
        title="Zorg & Ondersteuning"
        badge="data"
        badgeText={badgeConfig.zorgOndersteuning.badgeText}
        badgeTooltip={badgeConfig.zorgOndersteuning.badgeTooltip}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          <StatBox
            label="Mantelzorgers"
            value={zorgOndersteuning.mantelzorger}
            description="geeft mantelzorg"
            nlWaarde={NL_REFERENTIES.mantelzorger}
            kpiKey="mantelzorger"
          />
          <StatBox
            label="Vrijwilligerswerk"
            value={zorgOndersteuning.vrijwilligerswerk}
            description="doet vrijwilligerswerk"
            nlWaarde={NL_REFERENTIES.vrijwilligerswerk}
            kpiKey="vrijwilligerswerk"
          />
          <StatBox
            label="Ervaren gezondheid"
            value={zorgOndersteuning.ervarenGezondheid}
            description="goed/zeer goed"
            nlWaarde={NL_REFERENTIES.ervarenGezondheid}
            kpiKey="ervarenGezondheid"
          />
          <StatBox
            label="Langdurige aandoeningen"
            value={zorgOndersteuning.langdurigeAandoeningen}
            description="1+ aandoeningen"
            nlWaarde={NL_REFERENTIES.langdurigeAandoeningen}
            kpiKey="langdurigeAandoeningen"
          />
          <StatBox
            label="Beperkt door gezondheid"
            value={zorgOndersteuning.beperkt}
            description="(ernstig) beperkt"
            nlWaarde={NL_REFERENTIES.beperkt}
            kpiKey="beperkt"
          />
          <StatBox
            label="Moeite met rondkomen"
            value={zorgOndersteuning.moeiteRondkomen}
            description="financieel"
            nlWaarde={NL_REFERENTIES.moeiteRondkomen}
            kpiKey="moeiteRondkomen"
          />
        </div>
      </Card>

      {/* SECTIE 4: Jeugdzorg & WMO (CBS Kerncijfers) */}
      {gebiedData?.jeugdzorgWmo && (
        <JeugdzorgWmoCard
          data={gebiedData.jeugdzorgWmo}
          jaar={gebiedData.kerncijfersJaar || 2024}
        />
      )}
    </div>
  );
}

// ============ HELPER COMPONENTS ============

// Aandachtspunten Card - toont indicatoren die afwijken van NL
interface Aandachtspunt {
  label: string;
  value: number | null;
  nlWaarde: number;
  key: string;
}

function AandachtspuntenCard({ punten }: { punten: Aandachtspunt[] }) {
  // Filter en sorteer op grootste afwijking
  const sorted = [...punten]
    .filter(p => p.value !== null)
    .map(p => ({
      ...p,
      diff: p.value! - p.nlWaarde,
      absDiff: Math.abs(p.value! - p.nlWaarde)
    }))
    .sort((a, b) => b.absDiff - a.absDiff)
    .slice(0, 6);

  if (sorted.length === 0) return null;

  return (
    <Card title="Aandachtspunten" badge="info" badgeText="Vergelijking met NL">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {sorted.map(punt => {
          const isProbleem = !HOGER_IS_BETER.includes(punt.key) ? punt.diff > 5 : punt.diff < -5;
          const color = getKpiColor(punt.value, punt.nlWaarde, punt.key);

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
              <span style={{ fontSize: '14px', fontWeight: 700, color, minWidth: '50px', textAlign: 'right' }}>
                {punt.value?.toFixed(1)}%
              </span>
              <span style={{
                fontSize: '12px',
                color: punt.diff > 0 ? '#ef4444' : '#22c55e',
                minWidth: '90px',
                textAlign: 'right'
              }}>
                {punt.diff > 0 ? '+' : ''}{punt.diff.toFixed(1)} t.o.v. NL
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// KPI Box met kleurcodering en NL-benchmark
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
      minWidth: '130px',
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
        (NL: {nlWaarde}%)
      </p>
    </div>
  );
}

// Vergelijkingskolom voor benchmark-balk
function ComparisonColumn({
  label,
  value,
  naam,
  isActive
}: {
  label: string;
  value?: number | null;
  naam?: string;
  isActive: boolean;
}) {
  return (
    <div style={{
      flex: '1 1 80px',
      minWidth: '80px',
      textAlign: 'center',
      padding: '10px 8px',
      backgroundColor: isActive ? '#f5f1ee' : 'transparent',
      border: isActive ? '2px solid #eb6608' : '1px solid #e5e7eb',
    }}>
      <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: 500 }}>
        {label}
      </p>
      {value !== undefined && value !== null ? (
        <>
          <p style={{
            fontSize: '22px',
            fontWeight: 700,
            color: getEenzaamheidColor(value),
            margin: 0,
            lineHeight: 1
          }}>
            {value.toFixed(1)}
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#6b7280', marginLeft: '1px' }}>%</span>
          </p>
          {naam && (
            <p style={{
              fontSize: '9px',
              color: '#9ca3af',
              marginTop: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {naam}
            </p>
          )}
        </>
      ) : (
        <p style={{ fontSize: '22px', fontWeight: 700, color: '#d1d5db', margin: 0 }}>-</p>
      )}
    </div>
  );
}

// Progress Bar Row voor Mentale Gezondheid
function ProgressBarRow({
  label,
  value,
  nlWaarde,
  maxValue,
  kpiKey
}: {
  label: string;
  value: number | null;
  nlWaarde: number;
  maxValue: number;
  kpiKey: string;
}) {
  if (value === null) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 12px',
        backgroundColor: '#f5f1ee',
        fontSize: '13px'
      }}>
        <span style={{ color: '#4b5563' }}>{label}</span>
        <span style={{ fontWeight: 700, color: '#9ca3af' }}>-</span>
      </div>
    );
  }

  const diff = value - nlWaarde;
  const isProbleem = diff > 5;
  const color = getKpiColor(value, nlWaarde, kpiKey);
  const percentage = Math.min((value / maxValue) * 100, 100);
  const nlPercentage = Math.min((nlWaarde / maxValue) * 100, 100);

  return (
    <div style={{ padding: '10px 12px', backgroundColor: '#f5f1ee' }}>
      {/* Label en waarde */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', color: '#4b5563' }}>{label}</span>
        <span style={{ fontSize: '14px', fontWeight: 700, color }}>
          {value.toFixed(1)}
          <span style={{ fontSize: '10px', fontWeight: 500, color: '#6b7280', marginLeft: '2px' }}>%</span>
          {isProbleem && <span style={{ marginLeft: '4px' }}>⚠️</span>}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: '8px',
        backgroundColor: '#e5e7eb',
        position: 'relative',
        borderRadius: '4px'
      }}>
        {/* Vulling */}
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: '4px'
        }} />

        {/* NL marker */}
        <div style={{
          position: 'absolute',
          left: `${nlPercentage}%`,
          top: '-4px',
          transform: 'translateX(-50%)',
          fontSize: '10px',
          color: '#6b7280'
        }}>▼</div>
      </div>

      {/* NL referentie */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '10px',
        color: '#6b7280',
        marginTop: '4px'
      }}>
        <span>NL: {nlWaarde.toFixed(1)}%</span>
        <span style={{ color: diff > 0 ? '#ef4444' : '#22c55e' }}>
          {diff > 0 ? '+' : ''}{diff.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

// StatBox met kleurcodering en NL-benchmark
function StatBox({
  label,
  value,
  description,
  nlWaarde,
  kpiKey,
  unit = '%',
  decimals = 1
}: {
  label: string;
  value: number | null;
  description: string;
  nlWaarde: number;
  kpiKey: string;
  unit?: string;
  decimals?: number;
}) {
  const color = getKpiColor(value, nlWaarde, kpiKey);

  return (
    <div style={{
      padding: '14px 12px',
      backgroundColor: '#f5f1ee',
      textAlign: 'center'
    }}>
      <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '26px', fontWeight: 700, color, margin: 0 }}>
        {value !== null ? (
          <>
            {decimals === 0 ? Math.round(value).toLocaleString('nl-NL') : value.toFixed(decimals)}
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', marginLeft: '2px' }}>{unit}</span>
          </>
        ) : '-'}
      </p>
      <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{description}</p>
      <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>(NL: {nlWaarde}{unit})</p>
    </div>
  );
}

// Jeugdzorg & WMO Card met vergelijking
function JeugdzorgWmoCard({
  data,
  jaar,
}: {
  data: {
    jeugdzorgAantal: number | null;
    jeugdzorgPercentage: number | null;
    wmoAantal: number | null;
    wmoPer1000: number | null;
  };
  jaar: number;
}) {

  return (
    <Card
      title="Jeugdzorg & WMO"
      badge="data"
      badgeText={`CBS Kerncijfers ${jaar}`}
      badgeTooltip="Dataset 85984NED - Kerncijfers wijken en buurten"
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {/* Jeugdzorg */}
        <div style={{ backgroundColor: '#f5f1ee', padding: '16px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#1d1d1b', marginBottom: '12px' }}>
            Jeugdzorg
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Aantal jongeren</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#1d1d1b', margin: 0 }}>
                {data.jeugdzorgAantal !== null
                  ? Math.round(data.jeugdzorgAantal).toLocaleString('nl-NL')
                  : '-'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Percentage jongeren</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#1d1d1b', margin: 0 }}>
                {data.jeugdzorgPercentage !== null ? (
                  <>
                    {data.jeugdzorgPercentage.toFixed(1)}
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', marginLeft: '2px' }}>%</span>
                  </>
                ) : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* WMO */}
        <div style={{ backgroundColor: '#f5f1ee', padding: '16px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#1d1d1b', marginBottom: '12px' }}>
            WMO (Wet maatschappelijke ondersteuning)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Aantal clienten</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#1d1d1b', margin: 0 }}>
                {data.wmoAantal !== null
                  ? Math.round(data.wmoAantal).toLocaleString('nl-NL')
                  : '-'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Per 1.000 inwoners</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#1d1d1b', margin: 0 }}>
                {data.wmoPer1000 !== null ? Math.round(data.wmoPer1000) : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
