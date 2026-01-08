import { useState } from 'react';
import { useGebiedStore } from '../../../store/gebiedStore';
import { Card } from '../../ui/Card';
import { InfoGrid } from '../../ui/InfoGrid';
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
const EUROPESE_LANDEN = ['Duitsland', 'Polen', 'België', 'Roemenië', 'Bulgarije'];

// Bepaal kleur op basis van continent: zwart (#1d1d1b) voor Europa, blauw (#3498db) voor buiten Europa
function getHerkomstLandKleur(land: string): string {
  return EUROPESE_LANDEN.includes(land) ? '#1d1d1b' : '#3498db';
}

export function Bewoners() {
  const { gebiedData, selectedGebied, isLoadingData } = useGebiedStore();
  const [showDichtheidInfo, setShowDichtheidInfo] = useState(false);

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

  const { bevolking, huishoudens, dataJaar, herkomstLandGemeente, gemeenteNaam } = gebiedData;
  const totaal = bevolking.totaal;

  const leeftijdData = [
    { name: '0-14', value: bevolking.leeftijd_0_14, percentage: calculatePercentage(bevolking.leeftijd_0_14, totaal) },
    { name: '15-24', value: bevolking.leeftijd_15_24, percentage: calculatePercentage(bevolking.leeftijd_15_24, totaal) },
    { name: '25-44', value: bevolking.leeftijd_25_44, percentage: calculatePercentage(bevolking.leeftijd_25_44, totaal) },
    { name: '45-64', value: bevolking.leeftijd_45_64, percentage: calculatePercentage(bevolking.leeftijd_45_64, totaal) },
    { name: '65+', value: bevolking.leeftijd_65_plus, percentage: calculatePercentage(bevolking.leeftijd_65_plus, totaal) },
  ];

  const totaalMigratie = bevolking.nederlands + bevolking.westers + bevolking.nietWesters;
  const cultuurData = [
    { name: 'Nederland', value: bevolking.nederlands, percentage: calculatePercentage(bevolking.nederlands, totaalMigratie) },
    { name: 'Europa (excl. NL)', value: bevolking.westers, percentage: calculatePercentage(bevolking.westers, totaalMigratie) },
    { name: 'Buiten Europa', value: bevolking.nietWesters, percentage: calculatePercentage(bevolking.nietWesters, totaalMigratie) },
  ];

  // Huishoudens: eenpersoons = alleenstaanden, zonderKinderen = stellen zonder kinderen, metKinderen = gezinnen met kinderen
  const huishoudensData = [
    { name: 'Alleenstaand', value: huishoudens.eenpersoons },
    { name: 'Paar zonder kinderen', value: huishoudens.zonderKinderen },
    { name: 'Gezin met kinderen', value: huishoudens.metKinderen },
  ];

  // Bepaal dichtheid interpretatie
  const dichtheidLabel = bevolking.dichtheid > 5000 ? 'Zeer dicht'
    : bevolking.dichtheid > 2500 ? 'Dicht'
    : bevolking.dichtheid > 1000 ? 'Matig dicht'
    : 'Dunbevolkt';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Demografische gegevens */}
      <Card title="Demografische Gegevens" badge="data" year={dataJaar}>
        <InfoGrid
          items={[
            { label: 'Totaal inwoners', value: formatNumber(totaal) },
          ]}
        />
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>Bevolkingsdichtheid:</span>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>{formatNumber(bevolking.dichtheid)} per km²</span>
          <span style={{
            fontSize: '12px',
            padding: '2px 8px',
            backgroundColor: bevolking.dichtheid > 2500 ? '#fef3c7' : '#dcfce7',
            color: bevolking.dichtheid > 2500 ? '#b45309' : '#15803d',
            borderRadius: '4px'
          }}>
            {dichtheidLabel}
          </span>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              onClick={() => setShowDichtheidInfo(!showDichtheidInfo)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
            </button>
            {showDichtheidInfo && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginBottom: '8px',
                  padding: '12px',
                  backgroundColor: '#1d1d1b',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '12px',
                  width: '280px',
                  zIndex: 50,
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                }}
              >
                <p style={{ marginBottom: '8px' }}>
                  <strong>Bevolkingsdichtheid</strong> = aantal inwoners per vierkante kilometer.
                </p>
                <p style={{ marginBottom: '8px' }}>
                  Een <strong>hogere dichtheid</strong> betekent meer mensen op dezelfde oppervlakte (stedelijk).
                  Een <strong>lagere dichtheid</strong> duidt op meer ruimte per persoon (landelijk).
                </p>
                <p style={{ fontSize: '11px', color: '#9ca3af' }}>
                  Ter vergelijking: Amsterdam ~5.200/km², Nederland gemiddeld ~520/km²
                </p>
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '6px solid #1d1d1b',
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Charts grid */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Leeftijdsverdeling */}
        <Card title="Leeftijdsverdeling" badge="data" year={dataJaar}>
          <div style={{ height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leeftijdData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value, _name, props) => {
                    const payload = props.payload as { percentage: number };
                    return [`${formatNumber(value as number)} (${payload.percentage}%)`, 'Aantal'];
                  }}
                />
                <Bar dataKey="value" fill="#eb6608" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Herkomst */}
        <Card title="Herkomst Bevolking" badge="data" year={dataJaar}>
          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
            Geboorteland van bewoner of ouders (CBS indeling)
          </p>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cultuurData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.name} (${Math.round((entry.percent || 0) * 100)}%)`}
                >
                  {cultuurData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatNumber(value as number)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Herkomst per Land - Gemeente niveau */}
      <Card
        title={`Herkomst per Land${gemeenteNaam && selectedGebied?.type !== 'gemeente' ? ` - Gemeente ${gemeenteNaam}` : ''}`}
        badge={herkomstLandGemeente && herkomstLandGemeente.landen.length > 0 ? "data" : "placeholder"}
        year={herkomstLandGemeente?.dataJaar}
      >
        {herkomstLandGemeente && herkomstLandGemeente.landen.length > 0 ? (
          (() => {
            // Gebruik gemeente CBS data voor de hoofdcategorieën (niet buurt data!)
            const gemBev = herkomstLandGemeente.gemeenteBevolking;
            const gemeenteNederlands = gemBev?.nederlands ?? 0;
            const gemeenteWesters = gemBev?.westers ?? 0;
            const gemeenteNietWesters = gemBev?.nietWesters ?? 0;
            const totaalMigratie = gemeenteNederlands + gemeenteWesters + gemeenteNietWesters;
            const totaalBevolking = totaalMigratie > 0 ? totaalMigratie : (gemBev?.totaal ?? 0);

            // Percentages t.o.v. gemeente bevolking
            const percentageNederland = totaalBevolking > 0 ? Math.round((gemeenteNederlands / totaalBevolking) * 100) : 0;
            const percentageEuropa = totaalBevolking > 0 ? Math.round((gemeenteWesters / totaalBevolking) * 100) : 0;
            const percentageBuitenEuropa = totaalBevolking > 0 ? Math.round((gemeenteNietWesters / totaalBevolking) * 100) : 0;

            // Splits landen in Europa en Buiten Europa
            const europaLanden = herkomstLandGemeente.landen.filter(l => EUROPESE_LANDEN.includes(l.land));
            const buitenEuropaLanden = herkomstLandGemeente.landen.filter(l => !EUROPESE_LANDEN.includes(l.land));

            // Bereken totalen per groep uit PC4 data (voor relatieve verdeling)
            const totaalEuropaPC4 = europaLanden.reduce((sum, l) => sum + l.aantal, 0);
            const totaalBuitenEuropaPC4 = buitenEuropaLanden.reduce((sum, l) => sum + l.aantal, 0);

            // Bereken percentages binnen elke groep, geschaald naar CBS totalen
            // Europese landen: percentage binnen Europa groep, geschaald naar het CBS Europa percentage
            const europaLandenMetPercentage = europaLanden.map(l => ({
              ...l,
              // Relatief aandeel binnen Europa (PC4) * CBS Europa percentage
              percentage: totaalEuropaPC4 > 0 && percentageEuropa > 0
                ? Math.round((l.aantal / totaalEuropaPC4) * percentageEuropa * 10) / 10
                : 0
            }));

            // Buiten Europa landen: percentage binnen Buiten Europa groep, geschaald naar CBS percentage
            const buitenEuropaLandenMetPercentage = buitenEuropaLanden.map(l => ({
              ...l,
              // Relatief aandeel binnen Buiten Europa (PC4) * CBS Buiten Europa percentage
              percentage: totaalBuitenEuropaPC4 > 0 && percentageBuitenEuropa > 0
                ? Math.round((l.aantal / totaalBuitenEuropaPC4) * percentageBuitenEuropa * 10) / 10
                : 0
            }));

            // Combineer en sorteer op percentage (hoogste eerst), top 10
            const alleLandenMetPercentage = [
              ...europaLandenMetPercentage,
              ...buitenEuropaLandenMetPercentage
            ].sort((a, b) => b.percentage - a.percentage).slice(0, 10);

            return (
              <>
                {/* Samenvatting bovenaan */}
                <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                    Herkomst bevolking (% van totaal) - CBS kerncijfers
                  </p>
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '16px', height: '16px', backgroundColor: '#eb6608', borderRadius: '2px' }} />
                      <div>
                        <span style={{ fontSize: '20px', fontWeight: 600 }}>{percentageNederland}%</span>
                        <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '6px' }}>Nederland</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '16px', height: '16px', backgroundColor: '#1d1d1b', borderRadius: '2px' }} />
                      <div>
                        <span style={{ fontSize: '20px', fontWeight: 600 }}>{percentageEuropa}%</span>
                        <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '6px' }}>Europa</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '16px', height: '16px', backgroundColor: '#3498db', borderRadius: '2px' }} />
                      <div>
                        <span style={{ fontSize: '20px', fontWeight: 600 }}>{percentageBuitenEuropa}%</span>
                        <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '6px' }}>Buiten Europa</span>
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>
                    Gemeente {gemeenteNaam || selectedGebied?.gemeenteNaam}: {formatNumber(totaalBevolking)} inwoners
                  </p>
                </div>

                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                  Top 10 herkomstlanden (geschat % van totale gemeente bevolking)
                </p>
                <div style={{ height: '320px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={alleLandenMetPercentage}
                      layout="vertical"
                      margin={{ left: 80, right: 30 }}
                    >
                      <XAxis type="number" unit="%" domain={[0, 'auto']} />
                      <YAxis type="category" dataKey="land" tick={{ fontSize: 12 }} width={75} />
                      <Tooltip
                        formatter={(value, _name, props) => {
                          const land = (props.payload as { land: string })?.land;
                          const isEuropa = land ? EUROPESE_LANDEN.includes(land) : false;
                          return [
                            `${value}% van totale bevolking`,
                            isEuropa ? 'Europa' : 'Buiten Europa'
                          ];
                        }}
                      />
                      <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                        {alleLandenMetPercentage.map((item, index) => (
                          <Cell key={index} fill={getHerkomstLandKleur(item.land)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {alleLandenMetPercentage.map((item) => (
                    <div
                      key={item.land}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '4px',
                        fontSize: '12px',
                        borderLeft: `3px solid ${getHerkomstLandKleur(item.land)}`,
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{item.land}:</span>{' '}
                      <span>{item.percentage}%</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '12px' }}>
                  Percentages berekend: CBS kerncijfers (Europa/Buiten Europa) × relatieve verdeling uit PC4 postcodedata
                </p>
              </>
            );
          })()
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
            <p style={{ marginBottom: '8px' }}>Herkomst per land niet beschikbaar voor deze gemeente</p>
            <p style={{ fontSize: '12px' }}>
              CBS biedt alleen gedetailleerde herkomstdata voor de grote gemeenten (Amsterdam, Rotterdam, Den Haag, Utrecht, Groningen, Almere, Eindhoven, Tilburg)
            </p>
          </div>
        )}
      </Card>

      {/* Huishoudenstypen */}
      <Card title="Huishoudenstypen" badge="data" year={dataJaar}>
        <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Totaal huishoudens</span>
            <p style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>{formatNumber(huishoudens.totaal)}</p>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Gem. huishoudensgrootte</span>
            <p style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>{huishoudens.gemiddeldeGrootte.toFixed(1)} personen</p>
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
              <Bar dataKey="value" fill="#1d1d1b" radius={[0, 0, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '12px' }}>
          Alleenstaand = 1-persoons huishouden | Paar zonder kinderen = 2 volwassenen | Gezin = huishouden met thuiswonende kinderen
        </p>
      </Card>
    </div>
  );
}
