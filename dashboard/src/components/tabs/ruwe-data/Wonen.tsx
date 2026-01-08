import { useGebiedStore } from '../../../store/gebiedStore';
import { Card } from '../../ui/Card';
import { InfoGrid } from '../../ui/InfoGrid';
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

function formatNumber(num: number): string {
  return num.toLocaleString('nl-NL');
}

const COLORS = ['#eb6608', '#1d1d1b', '#3498db', '#2ecc71'];

export function Wonen() {
  const { gebiedData, selectedGebied, isLoadingData } = useGebiedStore();

  if (!selectedGebied) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>
        <p style={{ fontSize: '20px' }}>Selecteer een gebied om woningdata te bekijken</p>
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

  const { woningen, dataJaar, bevolkingsDynamiek, gemeenteNaam } = gebiedData;
  const totaal = woningen.totaal;
  const koopAantal = Math.round((woningen.koopPercentage / 100) * totaal);
  const huurAantal = Math.round((woningen.huurPercentage / 100) * totaal);

  const koopHuurData = [
    { name: `Koop (${Math.round(woningen.koopPercentage)}%)`, value: woningen.koopPercentage },
    { name: `Huur (${Math.round(woningen.huurPercentage)}%)`, value: woningen.huurPercentage },
  ];

  // Woningtypes data uit CBS
  const woningtypeData = [
    { name: 'Appartement', value: Math.round(woningen.meergezinsPercentage) },
    { name: 'Tussenwoning', value: Math.round(woningen.tussenwoningPercentage) },
    { name: 'Hoekwoning', value: Math.round(woningen.hoekwoningPercentage) },
    { name: 'Twee-onder-één-kap', value: Math.round(woningen.tweeOnderEenKapPercentage) },
    { name: 'Vrijstaand', value: Math.round(woningen.vrijstaandPercentage) },
  ].filter(item => item.value > 0);

  const hasWoningtypeData = woningtypeData.length > 0;

  // Verhuisbewegingen data voorbereiden
  const hasVerhuisData = bevolkingsDynamiek && bevolkingsDynamiek.jaren.length > 0;
  const verhuisChartData = hasVerhuisData
    ? bevolkingsDynamiek.jaren.map((jaar) => ({
        jaar: jaar.jaar.toString(),
        Vestiging: jaar.vestiging || 0,
        Vertrek: jaar.vertrek || 0,
        Saldo: jaar.saldo,
      }))
    : [];

  // Bepaal het meest recente jaar voor de badge
  const verhuisDataJaar = hasVerhuisData
    ? bevolkingsDynamiek.jaren[bevolkingsDynamiek.jaren.length - 1]?.jaar
    : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Woningvoorraad */}
      <Card title="Woningvoorraad" badge="data" year={dataJaar}>
        <InfoGrid
          items={[
            { label: 'Totaal woningen', value: formatNumber(totaal) },
            { label: 'Koop', value: `${Math.round(woningen.koopPercentage)}% (${formatNumber(koopAantal)})` },
            { label: 'Huur', value: `${Math.round(woningen.huurPercentage)}% (${formatNumber(huurAantal)})` },
            { label: 'Huur sociaal', value: `${Math.round(woningen.huurSociaalPercentage)}%` },
          ]}
        />
      </Card>

      {/* Charts grid */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Koop vs Huur */}
        <Card title="Koop vs Huur" badge="data" year={dataJaar}>
          <div style={{ height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={koopHuurData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {koopHuurData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${Math.round(value as number)}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Woningtypes */}
        <Card title="Woningtypes" badge={hasWoningtypeData ? "data" : "placeholder"} year={hasWoningtypeData ? dataJaar : undefined}>
          {hasWoningtypeData ? (
            <div style={{ height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={woningtypeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {woningtypeData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <p>Geen woningtype data beschikbaar voor dit gebied</p>
            </div>
          )}
        </Card>
      </div>

      {/* Huurdetails */}
      <Card title="Huurwoningen Detail" badge="data" year={dataJaar}>
        <InfoGrid
          items={[
            { label: 'Totaal huur', value: `${Math.round(woningen.huurPercentage)}%` },
            { label: 'Woningcorporatie', value: `${Math.round(woningen.huurSociaalPercentage)}%` },
            { label: 'Overige verhuurders', value: `${Math.round(woningen.huurParticulierPercentage)}%` },
          ]}
        />
      </Card>

      {/* Verhuisbewegingen */}
      <Card
        title={`Verhuisbewegingen${gemeenteNaam && selectedGebied?.type !== 'gemeente' ? ` - Gemeente ${gemeenteNaam}` : ''}`}
        badge={hasVerhuisData ? "data" : "placeholder"}
        year={verhuisDataJaar}
      >
        {hasVerhuisData ? (
          <div>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
              Verhuizingen van en naar de gemeente per jaar (CBS Data)
            </p>
            <div style={{ height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={verhuisChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="jaar" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatNumber(value)} />
                  <Tooltip
                    formatter={(value, name) => [formatNumber(value as number), name as string]}
                    labelFormatter={(label) => `Jaar ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="Vestiging" name="Vestiging (in)" fill="#2ecc71" />
                  <Bar dataKey="Vertrek" name="Vertrek (uit)" fill="#e74c3c" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Saldo overzicht */}
            <div style={{ marginTop: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {verhuisChartData.map((item) => (
                <div
                  key={item.jaar}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: item.Saldo >= 0 ? '#dcfce7' : '#fee2e2',
                    borderRadius: '4px',
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>{item.jaar}: </span>
                  <span style={{ fontWeight: 600, color: item.Saldo >= 0 ? '#15803d' : '#dc2626' }}>
                    {item.Saldo >= 0 ? '+' : ''}{formatNumber(item.Saldo)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
            <p>Geen verhuisdata beschikbaar</p>
          </div>
        )}
      </Card>

      {/* Woningcorporaties - placeholder */}
      <Card title="Woningcorporaties" badge="placeholder">
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
          <p>Nog geen data beschikbaar</p>
        </div>
      </Card>
    </div>
  );
}
