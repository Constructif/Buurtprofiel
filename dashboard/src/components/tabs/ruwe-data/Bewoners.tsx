import { useState, useCallback } from 'react';
import { useGebiedStore } from '../../../store/gebiedStore';
import { SelectableCard } from '../../ui/SelectableCard';
import { CardTrendChart } from '../../ui/CardTrendChart';
import { InfoGrid } from '../../ui/InfoGrid';
import { TabScoreHeader } from '../../ui/TabScoreHeader';
import { berekenBewonersScore } from '../../../utils/scoring';
import { useActiveBenchmarks } from '../../../hooks/useActiveBenchmarks';
import { fetchKerncijfersForYear, fetchKerncijfersAllYears, fetchHerkomstLandForYear, fetchHerkomstLandAllYears } from '../../../services/cbs';
import { useCardYear } from '../../../hooks/useCardYear';
import type { HerkomstLandData } from '../../../types/gebied';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

function formatNumber(num: number): string {
  return num.toLocaleString('nl-NL');
}

function calculatePercentage(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

// Kleuren voor Herkomst Bevolking pie chart: oranje (NL), zwart (Europa), blauw (Buiten Europa)
const COLORS = ['#eb6608', '#1d1d1b', '#3498db', '#2ecc71', '#e74c3c', '#9b59b6', '#f39c12', '#1abc9c', '#e91e63', '#00bcd4'];

// Landen per continent voor kleurcodering (zwart = Europa, blauw = Buiten Europa)
const EUROPESE_LANDEN = ['Duitsland', 'Polen', 'België', 'Roemenië', 'Bulgarije', 'Westers totaal'];

// Bepaal kleur op basis van continent: zwart (#1d1d1b) voor Europa, blauw (#3498db) voor buiten Europa
function getHerkomstLandKleur(land: string): string {
  if (EUROPESE_LANDEN.includes(land)) return '#1d1d1b';
  return '#3498db';
}

export function Bewoners() {
  const { gebiedData, selectedGebied, isLoadingData } = useGebiedStore();
  const { set: benchmarks } = useActiveBenchmarks();
  const [showDichtheidInfo, setShowDichtheidInfo] = useState(false);

  // Alle hooks MOETEN boven early returns staan (React hooks regels)
  const code = gebiedData?.code ?? '';
  const gemeenteCode = selectedGebied?.gemeenteCode || selectedGebied?.code || '';
  const defaultJaar = gebiedData?.kerncijfersJaar ?? 2025;

  const kcFetcher = useCallback(
    (jaar: number) => fetchKerncijfersForYear(code, jaar),
    [code]
  );
  const kcTrendFetcher = useCallback(
    () => fetchKerncijfersAllYears(code),
    [code]
  );
  const herkomstLandFetcher = useCallback(
    (jaar: number) => fetchHerkomstLandForYear(gemeenteCode, jaar),
    [gemeenteCode]
  );
  const herkomstLandTrendFetcher = useCallback(
    () => fetchHerkomstLandAllYears(gemeenteCode),
    [gemeenteCode]
  );

  const demografischCard = useCardYear(defaultJaar, kcFetcher, kcTrendFetcher);
  const leeftijdCard = useCardYear(defaultJaar, kcFetcher, kcTrendFetcher);
  const herkomstCard = useCardYear(defaultJaar, kcFetcher, kcTrendFetcher);
  const huishoudensCard = useCardYear(defaultJaar, kcFetcher, kcTrendFetcher);
  const herkomstLandCard = useCardYear<HerkomstLandData>(
    gebiedData?.herkomstLandGemeente?.dataJaar ?? 2025, herkomstLandFetcher, herkomstLandTrendFetcher
  );

  if (!selectedGebied) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>
        <p style={{ fontSize: '20px' }}>Selecteer een gebied om bewonersdata te bekijken</p>
      </div>
    );
  }

  if (isLoadingData || !gebiedData) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid #eb6608', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#6b7280' }}>Data laden...</p>
      </div>
    );
  }

  // Helper: extract bevolking+huishoudens data van een card hook
  const getCardData = (card: typeof demografischCard) => {
    const bev = card.overrideData?.bevolking ?? gebiedData.bevolking;
    const hh = card.overrideData?.huishoudens ?? gebiedData.huishoudens;
    const jaar = card.overrideData?._jaar ?? gebiedData.kerncijfersJaar;
    return { bev, hh, jaar };
  };

  const demo = getCardData(demografischCard);
  const leeft = getCardData(leeftijdCard);
  const herk = getCardData(herkomstCard);
  const huish = getCardData(huishoudensCard);

  // Leeftijdsdata voor de leeftijd card
  const leeftijdData = [
    { name: '0-14', value: leeft.bev.leeftijd_0_14, percentage: calculatePercentage(leeft.bev.leeftijd_0_14, leeft.bev.totaal) },
    { name: '15-24', value: leeft.bev.leeftijd_15_24, percentage: calculatePercentage(leeft.bev.leeftijd_15_24, leeft.bev.totaal) },
    { name: '25-44', value: leeft.bev.leeftijd_25_44, percentage: calculatePercentage(leeft.bev.leeftijd_25_44, leeft.bev.totaal) },
    { name: '45-64', value: leeft.bev.leeftijd_45_64, percentage: calculatePercentage(leeft.bev.leeftijd_45_64, leeft.bev.totaal) },
    { name: '65+', value: leeft.bev.leeftijd_65_plus, percentage: calculatePercentage(leeft.bev.leeftijd_65_plus, leeft.bev.totaal) },
  ];

  // Herkomst data
  const totaalMigratie = herk.bev.nederlands + herk.bev.westers + herk.bev.nietWesters;
  const cultuurData = [
    { name: 'Nederland', value: herk.bev.nederlands, percentage: calculatePercentage(herk.bev.nederlands, totaalMigratie) },
    { name: 'Europa (excl. NL)', value: herk.bev.westers, percentage: calculatePercentage(herk.bev.westers, totaalMigratie) },
    { name: 'Buiten Europa', value: herk.bev.nietWesters, percentage: calculatePercentage(herk.bev.nietWesters, totaalMigratie) },
  ];

  // Huishoudens data
  const huishoudensData = [
    { name: 'Alleenstaand', value: huish.hh.eenpersoons },
    { name: 'Paar zonder kinderen', value: huish.hh.zonderKinderen },
    { name: 'Gezin met kinderen', value: huish.hh.metKinderen },
  ];

  // Dichtheid interpretatie
  const dichtheidLabel = demo.bev.dichtheid > 5000 ? 'Zeer dicht'
    : demo.bev.dichtheid > 2500 ? 'Dicht'
    : demo.bev.dichtheid > 1000 ? 'Matig dicht'
    : 'Dunbevolkt';

  // Score berekening met de actieve benchmarks (schakelt mee met de toggle)
  const tabScore = berekenBewonersScore(gebiedData, benchmarks);

  const { herkomstLandGemeente, gemeenteNaam } = gebiedData;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <TabScoreHeader tabScore={tabScore} />

      {/* Demografische gegevens */}
      <SelectableCard sectionId="bewoners-demografisch" title="Demografische Gegevens" badge="data" year={demo.jaar}
        onYearChange={demografischCard.handleYearChange} availableYears={demografischCard.availableYears}
        activeYearMode={demografischCard.activeMode} yearsWithData={demografischCard.yearsWithData}>
        {demografischCard.isLoading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Laden...</div>
        ) : demografischCard.activeMode === 'trend' && demografischCard.trendData ? (
          <CardTrendChart
            data={demografischCard.trendData}
            lines={[
              { key: 'bevolking', label: 'Bevolking', color: '#eb6608' },
              { key: 'dichtheid', label: 'Dichtheid (per km²)', color: '#3498db' },
            ]}
          />
        ) : (
          <>
            <InfoGrid items={[{ label: 'Totaal inwoners', value: formatNumber(demo.bev.totaal) }]} />
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Bevolkingsdichtheid:</span>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{formatNumber(demo.bev.dichtheid)} per km²</span>
              <span style={{
                fontSize: '12px', padding: '2px 8px',
                backgroundColor: demo.bev.dichtheid > 2500 ? '#fef3c7' : '#dcfce7',
                color: demo.bev.dichtheid > 2500 ? '#b45309' : '#15803d', borderRadius: '4px'
              }}>{dichtheidLabel}</span>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button onClick={() => setShowDichtheidInfo(!showDichtheidInfo)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                </button>
                {showDichtheidInfo && (
                  <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px', padding: '12px', backgroundColor: '#1d1d1b', color: 'white', borderRadius: '4px', fontSize: '12px', width: '280px', zIndex: 50, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <p style={{ marginBottom: '8px' }}><strong>Bevolkingsdichtheid</strong> = aantal inwoners per vierkante kilometer.</p>
                    <p style={{ marginBottom: '8px' }}>Een <strong>hogere dichtheid</strong> betekent meer mensen op dezelfde oppervlakte (stedelijk). Een <strong>lagere dichtheid</strong> duidt op meer ruimte per persoon (landelijk).</p>
                    <p style={{ fontSize: '11px', color: '#9ca3af' }}>Ter vergelijking: Amsterdam ~5.200/km², Nederland gemiddeld ~520/km²</p>
                    <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #1d1d1b' }} />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </SelectableCard>

      {/* Charts grid */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Leeftijdsverdeling */}
        <SelectableCard sectionId="bewoners-leeftijd" title="Leeftijdsverdeling" badge="data" year={leeft.jaar}
          onYearChange={leeftijdCard.handleYearChange} availableYears={leeftijdCard.availableYears}
          activeYearMode={leeftijdCard.activeMode} yearsWithData={leeftijdCard.yearsWithData}>
          {leeftijdCard.isLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Laden...</div>
          ) : leeftijdCard.activeMode === 'trend' && leeftijdCard.trendData ? (
            <CardTrendChart
              data={leeftijdCard.trendData}
              lines={[{ key: 'bevolking', label: 'Totaal bevolking', color: '#eb6608' }]}
            />
          ) : (
            <div style={{ height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leeftijdData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value, _name, props) => {
                    const payload = props.payload as { percentage: number };
                    return [`${formatNumber(value as number)} (${payload.percentage}%)`, 'Aantal'];
                  }} />
                  <Bar dataKey="value" fill="#eb6608" radius={[4, 4, 0, 0]} animationDuration={300} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SelectableCard>

        {/* Herkomst */}
        <SelectableCard sectionId="bewoners-herkomst" title="Herkomst Bevolking" badge="data" year={herk.jaar}
          onYearChange={herkomstCard.handleYearChange} availableYears={herkomstCard.availableYears}
          activeYearMode={herkomstCard.activeMode} yearsWithData={herkomstCard.yearsWithData}>
          {herkomstCard.isLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Laden...</div>
          ) : herkomstCard.activeMode === 'trend' && herkomstCard.trendData ? (
            <CardTrendChart
              data={herkomstCard.trendData}
              lines={[{ key: 'bevolking', label: 'Totaal bevolking', color: '#eb6608' }]}
            />
          ) : (
            <>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                Geboorteland van bewoner of ouders (CBS indeling)
              </p>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={cultuurData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                      animationDuration={300}
                      label={(entry) => `${entry.name} (${Math.round((entry.percent || 0) * 100)}%)`}>
                      {cultuurData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatNumber(value as number)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </SelectableCard>
      </div>

      {/* Herkomst per Land - Gemeente niveau */}
      {(() => {
        const hlData = herkomstLandCard.overrideData ?? herkomstLandGemeente;
        const hlJaar = herkomstLandCard.overrideData?.dataJaar ?? herkomstLandGemeente?.dataJaar;
        return (
      <SelectableCard
        sectionId="bewoners-herkomstland"
        title={`Herkomst per Land${gemeenteNaam && selectedGebied?.type !== 'gemeente' ? ` - Gemeente ${gemeenteNaam}` : ''}`}
        badge={hlData && hlData.landen.length > 0 ? "data" : "placeholder"}
        year={hlJaar}
        onYearChange={herkomstLandCard.handleYearChange}
        availableYears={herkomstLandCard.availableYears}
        activeYearMode={herkomstLandCard.activeMode}
        yearsWithData={herkomstLandCard.yearsWithData}
      >
        {herkomstLandCard.isLoading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Laden...</div>
        ) : herkomstLandCard.activeMode === 'trend' && herkomstLandCard.trendData ? (
          <CardTrendChart
            data={herkomstLandCard.trendData}
            lines={[{ key: 'herkomstTotaal', label: 'Totaal migratie', color: '#3498db' }]}
          />
        ) : hlData && hlData.landen.length > 0 ? (
          (() => {
            const gemBev = hlData.gemeenteBevolking;
            const gemeenteNederlands = gemBev?.nederlands ?? 0;
            const gemeenteWesters = gemBev?.westers ?? 0;
            const gemeenteNietWesters = gemBev?.nietWesters ?? 0;
            const totaalMigratieGem = gemeenteNederlands + gemeenteWesters + gemeenteNietWesters;
            const totaalBevolking = totaalMigratieGem > 0 ? totaalMigratieGem : (gemBev?.totaal ?? 0);

            const percentageNederland = totaalBevolking > 0 ? Math.round((gemeenteNederlands / totaalBevolking) * 100) : 0;
            const percentageEuropa = totaalBevolking > 0 ? Math.round((gemeenteWesters / totaalBevolking) * 100) : 0;
            const percentageBuitenEuropa = totaalBevolking > 0 ? Math.round((gemeenteNietWesters / totaalBevolking) * 100) : 0;

            const europaLanden = hlData.landen.filter(l => EUROPESE_LANDEN.includes(l.land));
            const buitenEuropaLanden = hlData.landen.filter(l => !EUROPESE_LANDEN.includes(l.land));
            const totaalEuropaPC4 = europaLanden.reduce((sum, l) => sum + l.aantal, 0);
            const totaalBuitenEuropaPC4 = buitenEuropaLanden.reduce((sum, l) => sum + l.aantal, 0);

            const europaLandenMetPercentage = europaLanden.map(l => ({
              ...l,
              percentage: totaalEuropaPC4 > 0 && percentageEuropa > 0
                ? Math.round((l.aantal / totaalEuropaPC4) * percentageEuropa * 10) / 10 : 0
            }));
            const buitenEuropaLandenMetPercentage = buitenEuropaLanden.map(l => ({
              ...l,
              percentage: totaalBuitenEuropaPC4 > 0 && percentageBuitenEuropa > 0
                ? Math.round((l.aantal / totaalBuitenEuropaPC4) * percentageBuitenEuropa * 10) / 10 : 0
            }));
            const alleLandenMetPercentage = [
              ...europaLandenMetPercentage, ...buitenEuropaLandenMetPercentage
            ].sort((a, b) => b.percentage - a.percentage).slice(0, 10);

            return (
              <>
                <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>Herkomst bevolking (% van totaal) - CBS kerncijfers</p>
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '16px', height: '16px', backgroundColor: '#eb6608', borderRadius: '2px' }} />
                      <div><span style={{ fontSize: '20px', fontWeight: 600 }}>{percentageNederland}%</span><span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '6px' }}>Nederland</span></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '16px', height: '16px', backgroundColor: '#1d1d1b', borderRadius: '2px' }} />
                      <div><span style={{ fontSize: '20px', fontWeight: 600 }}>{percentageEuropa}%</span><span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '6px' }}>Europa</span></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '16px', height: '16px', backgroundColor: '#3498db', borderRadius: '2px' }} />
                      <div><span style={{ fontSize: '20px', fontWeight: 600 }}>{percentageBuitenEuropa}%</span><span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '6px' }}>Buiten Europa</span></div>
                    </div>
                  </div>
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>Gemeente {gemeenteNaam || selectedGebied?.gemeenteNaam}: {formatNumber(totaalBevolking)} inwoners</p>
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>Top 10 herkomstlanden (geschat % van totale gemeente bevolking)</p>
                <div style={{ height: '320px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={alleLandenMetPercentage} layout="vertical" margin={{ left: 80, right: 30 }}>
                      <XAxis type="number" unit="%" domain={[0, 'auto']} />
                      <YAxis type="category" dataKey="land" tick={{ fontSize: 12 }} width={75} />
                      <Tooltip formatter={(value, _name, props) => {
                        const land = (props.payload as { land: string })?.land;
                        const isEuropa = land ? EUROPESE_LANDEN.includes(land) : false;
                        return [`${value}% van totale bevolking`, isEuropa ? 'Europa' : 'Buiten Europa'];
                      }} />
                      <Bar dataKey="percentage" radius={[0, 4, 4, 0]} animationDuration={300}>
                        {alleLandenMetPercentage.map((item, index) => (
                          <Cell key={index} fill={getHerkomstLandKleur(item.land)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {alleLandenMetPercentage.map((item) => (
                    <div key={item.land} style={{ padding: '4px 10px', backgroundColor: '#f3f4f6', borderRadius: '4px', fontSize: '12px', borderLeft: `3px solid ${getHerkomstLandKleur(item.land)}` }}>
                      <span style={{ fontWeight: 500 }}>{item.land}:</span> <span>{item.percentage}%</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '12px' }}>Percentages berekend: CBS kerncijfers (Europa/Buiten Europa) × relatieve verdeling uit PC4 postcodedata</p>
              </>
            );
          })()
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
            <p style={{ marginBottom: '8px' }}>Herkomst per land niet beschikbaar voor deze gemeente</p>
            <p style={{ fontSize: '12px' }}>CBS biedt alleen gedetailleerde herkomstdata voor de grote gemeenten (Amsterdam, Rotterdam, Den Haag, Utrecht, Groningen, Almere, Eindhoven, Tilburg)</p>
          </div>
        )}
      </SelectableCard>
        );
      })()}

      {/* Huishoudenstypen */}
      <SelectableCard sectionId="bewoners-huishoudens" title="Huishoudenstypen" badge="data" year={huish.jaar}
        onYearChange={huishoudensCard.handleYearChange} availableYears={huishoudensCard.availableYears}
        activeYearMode={huishoudensCard.activeMode} yearsWithData={huishoudensCard.yearsWithData}>
        {huishoudensCard.isLoading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Laden...</div>
        ) : huishoudensCard.activeMode === 'trend' && huishoudensCard.trendData ? (
          <CardTrendChart
            data={huishoudensCard.trendData}
            lines={[{ key: 'huishoudens', label: 'Totaal huishoudens', color: '#1d1d1b' }]}
          />
        ) : (
          <>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>Totaal huishoudens</span>
                <p style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>{formatNumber(huish.hh.totaal)}</p>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>Gem. huishoudensgrootte</span>
                <p style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>{huish.hh.gemiddeldeGrootte.toFixed(1)} personen</p>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
              Een huishouden = personen die samen wonen en een gezamenlijke huishouding voeren
            </p>
            <div style={{ height: '256px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={huishoudensData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip formatter={(value) => formatNumber(value as number)} />
                  <Bar dataKey="value" fill="#1d1d1b" radius={[0, 0, 0, 0]} animationDuration={300} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '12px' }}>
              Alleenstaand = 1-persoons huishouden | Paar zonder kinderen = 2 volwassenen | Gezin = huishouden met thuiswonende kinderen
            </p>
          </>
        )}
      </SelectableCard>
    </div>
  );
}
