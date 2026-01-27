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

function formatCurrency(num: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

// Nederlands gemiddelde ter vergelijking
const NL_GEMIDDELD_INKOMEN = 27000;
const NL_ARBEIDSPARTICIPATIE = 72;

const COLORS = {
  laag: '#ef4444',    // Rood
  midden: '#6b7280',  // Grijs
  hoog: '#22c55e',    // Groen
  oranje: '#eb6608',
  zwart: '#1d1d1b',
  blauw: '#3498db',
};

export function WerkInkomen() {
  const { gebiedData, selectedGebied, isLoadingData } = useGebiedStore();

  if (!selectedGebied) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>
        <p style={{ fontSize: '20px' }}>Selecteer een gebied om werk & inkomen data te bekijken</p>
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

  const { inkomen, bevolking, kerncijfersJaar } = gebiedData;

  // Inkomensverdeling data
  const middenInkomenPercentage = Math.max(0, 100 - (inkomen.laagInkomenPercentage || 0) - (inkomen.hoogInkomenPercentage || 0));
  const inkomenVerdelingData = [
    { name: 'Laag inkomen', value: inkomen.laagInkomenPercentage || 0, color: COLORS.laag },
    { name: 'Midden inkomen', value: middenInkomenPercentage, color: COLORS.midden },
    { name: 'Hoog inkomen', value: inkomen.hoogInkomenPercentage || 0, color: COLORS.hoog },
  ].filter(item => item.value > 0);

  // Opleidingsniveau data
  const totaalOpgeleid = (inkomen.laagOpgeleid || 0) + (inkomen.middelOpgeleid || 0) + (inkomen.hoogOpgeleid || 0);
  const opleidingData = totaalOpgeleid > 0 ? [
    {
      name: 'Laag opgeleid',
      value: inkomen.laagOpgeleid || 0,
      percentage: Math.round(((inkomen.laagOpgeleid || 0) / totaalOpgeleid) * 100),
      color: COLORS.laag,
    },
    {
      name: 'Middelbaar opgeleid',
      value: inkomen.middelOpgeleid || 0,
      percentage: Math.round(((inkomen.middelOpgeleid || 0) / totaalOpgeleid) * 100),
      color: COLORS.oranje,
    },
    {
      name: 'Hoog opgeleid',
      value: inkomen.hoogOpgeleid || 0,
      percentage: Math.round(((inkomen.hoogOpgeleid || 0) / totaalOpgeleid) * 100),
      color: COLORS.hoog,
    },
  ] : [];

  const hasOpleidingData = opleidingData.length > 0;

  // Arbeidsparticipatie data
  const hasArbeidsData = inkomen.arbeidsparticipatie !== null;
  const arbeidsData = hasArbeidsData ? [
    { name: 'Werknemers', value: inkomen.werknemers || 0 },
    { name: 'Zelfstandigen', value: inkomen.zelfstandigen || 0 },
  ].filter(item => item.value > 0) : [];

  // Contract type data
  const hasContractData = inkomen.vastContract !== null || inkomen.flexContract !== null;
  const contractData = hasContractData ? [
    { name: 'Vast contract', value: inkomen.vastContract || 0, color: COLORS.hoog },
    { name: 'Flex contract', value: inkomen.flexContract || 0, color: COLORS.oranje },
  ] : [];

  // Uitkeringen data
  const uitkeringenData = [
    { name: 'Bijstand', value: inkomen.bijstandAantal, label: 'Bijstand' },
    { name: 'WW', value: inkomen.wwAantal, label: 'Werkloosheid' },
    { name: 'AO', value: inkomen.aoAantal, label: 'Arbeidsongeschikt' },
    { name: 'AOW', value: inkomen.aowAantal, label: 'Ouderdom (AOW)' },
  ];

  const hasUitkeringenData = uitkeringenData.some(item => item.value !== null && item.value > 0);

  // Bereken per 1000 inwoners
  const per1000 = (aantal: number | null) => {
    if (aantal === null || bevolking.totaal === 0) return null;
    return Math.round((aantal / bevolking.totaal) * 1000 * 10) / 10;
  };

  // Verschil met NL gemiddelde
  const inkomenVerschil = inkomen.gemiddeld - NL_GEMIDDELD_INKOMEN;
  const participatieVerschil = (inkomen.arbeidsparticipatie || 0) - NL_ARBEIDSPARTICIPATIE;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Inkomen */}
      <Card title="Inkomen" badge="data" year={kerncijfersJaar}>
        <div style={{ display: 'flex', gap: '32px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Gemiddeld besteedbaar inkomen</span>
            <p style={{ fontSize: '28px', fontWeight: 600, margin: '4px 0' }}>
              {formatCurrency(inkomen.gemiddeld)}
            </p>
            <span style={{
              fontSize: '14px',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: inkomenVerschil >= 0 ? '#dcfce7' : '#fee2e2',
              color: inkomenVerschil >= 0 ? '#15803d' : '#dc2626',
            }}>
              {inkomenVerschil >= 0 ? '+' : ''}{formatCurrency(inkomenVerschil)} t.o.v. NL
            </span>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Laag inkomen</span>
            <p style={{ fontSize: '28px', fontWeight: 600, margin: '4px 0', color: COLORS.laag }}>
              {Math.round(inkomen.laagInkomenPercentage)}%
            </p>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Hoog inkomen</span>
            <p style={{ fontSize: '28px', fontWeight: 600, margin: '4px 0', color: COLORS.hoog }}>
              {Math.round(inkomen.hoogInkomenPercentage)}%
            </p>
          </div>
        </div>

        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
          Inkomensverdeling huishoudens
        </p>
        <div style={{ height: '60px', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
          {inkomenVerdelingData.map((item) => (
            <div
              key={item.name}
              style={{
                width: `${item.value}%`,
                backgroundColor: item.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 500,
                minWidth: item.value > 5 ? 'auto' : '0',
              }}
            >
              {item.value > 10 && `${Math.round(item.value)}%`}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
          {inkomenVerdelingData.map((item) => (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: item.color, borderRadius: '2px' }} />
              <span style={{ fontSize: '12px', color: '#6b7280' }}>{item.name}: {Math.round(item.value)}%</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Opleidingsniveau */}
      <Card title="Opleidingsniveau" badge={hasOpleidingData ? "data" : "placeholder"} year={hasOpleidingData ? kerncijfersJaar : undefined}>
        {hasOpleidingData ? (
          <>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
              Hoogst behaald onderwijsniveau (15-75 jaar)
            </p>
            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={opleidingData} layout="vertical" margin={{ left: 120, right: 30 }}>
                  <XAxis type="number" unit="%" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={115} />
                  <Tooltip
                    formatter={(value, _name, props) => {
                      const item = props.payload as { value: number; percentage: number };
                      return [`${formatNumber(item.value)} personen (${item.percentage}%)`, 'Aantal'];
                    }}
                  />
                  <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                    {opleidingData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <InfoGrid
              items={[
                { label: 'Laag opgeleid', value: `${formatNumber(inkomen.laagOpgeleid || 0)} (${opleidingData[0]?.percentage || 0}%)` },
                { label: 'Middelbaar opgeleid', value: `${formatNumber(inkomen.middelOpgeleid || 0)} (${opleidingData[1]?.percentage || 0}%)` },
                { label: 'Hoog opgeleid', value: `${formatNumber(inkomen.hoogOpgeleid || 0)} (${opleidingData[2]?.percentage || 0}%)` },
              ]}
            />
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
            <p>Geen opleidingsdata beschikbaar voor dit gebied</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>Deze data is niet voor alle buurten beschikbaar</p>
          </div>
        )}
      </Card>

      {/* Arbeidsparticipatie */}
      <Card title="Arbeidsparticipatie" badge={hasArbeidsData ? "data" : "placeholder"} year={hasArbeidsData ? kerncijfersJaar : undefined}>
        {hasArbeidsData ? (
          <>
            <div style={{ display: 'flex', gap: '32px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>Netto arbeidsparticipatie</span>
                <p style={{ fontSize: '28px', fontWeight: 600, margin: '4px 0' }}>
                  {Math.round(inkomen.arbeidsparticipatie || 0)}%
                </p>
                <span style={{
                  fontSize: '14px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: participatieVerschil >= 0 ? '#dcfce7' : '#fee2e2',
                  color: participatieVerschil >= 0 ? '#15803d' : '#dc2626',
                }}>
                  {participatieVerschil >= 0 ? '+' : ''}{Math.round(participatieVerschil)}% t.o.v. NL
                </span>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>Werknemers</span>
                <p style={{ fontSize: '28px', fontWeight: 600, margin: '4px 0' }}>
                  {Math.round(inkomen.werknemers || 0)}%
                </p>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>Zelfstandigen</span>
                <p style={{ fontSize: '28px', fontWeight: 600, margin: '4px 0' }}>
                  {Math.round(inkomen.zelfstandigen || 0)}%
                </p>
              </div>
            </div>

            {/* Werknemers vs Zelfstandigen pie chart */}
            {arbeidsData.length > 0 && (
              <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                <div>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                    Verdeling werkenden
                  </p>
                  <div style={{ height: '200px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={arbeidsData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={({ name, value }) => `${name}: ${Math.round(value)}%`}
                        >
                          <Cell fill={COLORS.oranje} />
                          <Cell fill={COLORS.zwart} />
                        </Pie>
                        <Tooltip formatter={(value) => `${Math.round(value as number)}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Contract types */}
                {hasContractData && (
                  <div>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                      Type dienstverband (werknemers)
                    </p>
                    <div style={{ height: '60px', display: 'flex', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                      {contractData.map((item) => (
                        <div
                          key={item.name}
                          style={{
                            width: `${item.value}%`,
                            backgroundColor: item.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 500,
                          }}
                        >
                          {item.value > 15 && `${Math.round(item.value)}%`}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      {contractData.map((item) => (
                        <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '12px', height: '12px', backgroundColor: item.color, borderRadius: '2px' }} />
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>{item.name}: {Math.round(item.value)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
            <p>Geen arbeidsparticipatiedata beschikbaar voor dit gebied</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>Deze data is niet voor alle buurten beschikbaar</p>
          </div>
        )}
      </Card>

      {/* Uitkeringen */}
      <Card title="Uitkeringen" badge={hasUitkeringenData ? "data" : "placeholder"} year={hasUitkeringenData ? kerncijfersJaar : undefined}>
        {hasUitkeringenData ? (
          <>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
              Aantal personen met uitkering (per 31 december)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              {uitkeringenData.map((item) => {
                const perDuizend = per1000(item.value);
                return (
                  <div
                    key={item.name}
                    style={{
                      padding: '16px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${item.value !== null && item.value > 0 ? COLORS.oranje : '#e5e7eb'}`,
                    }}
                  >
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{item.label}</p>
                    {item.value !== null ? (
                      <>
                        <p style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 4px 0' }}>
                          {formatNumber(item.value)}
                        </p>
                        {perDuizend !== null && (
                          <p style={{ fontSize: '12px', color: '#6b7280' }}>
                            {perDuizend} per 1.000 inwoners
                          </p>
                        )}
                      </>
                    ) : (
                      <p style={{ fontSize: '14px', color: '#9ca3af' }}>Geen data</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Totaal overzicht */}
            <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Totaal uitkeringsontvangers (excl. AOW)</span>
                  <p style={{ fontSize: '20px', fontWeight: 600, margin: '4px 0' }}>
                    {formatNumber(
                      (inkomen.bijstandAantal || 0) +
                      (inkomen.wwAantal || 0) +
                      (inkomen.aoAantal || 0)
                    )}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Per 1.000 inwoners (excl. AOW)</span>
                  <p style={{ fontSize: '20px', fontWeight: 600, margin: '4px 0' }}>
                    {per1000(
                      (inkomen.bijstandAantal || 0) +
                      (inkomen.wwAantal || 0) +
                      (inkomen.aoAantal || 0)
                    ) || 0}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
            <p>Geen uitkeringsdata beschikbaar voor dit gebied</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>Deze data is niet voor alle buurten beschikbaar</p>
          </div>
        )}
      </Card>
    </div>
  );
}
