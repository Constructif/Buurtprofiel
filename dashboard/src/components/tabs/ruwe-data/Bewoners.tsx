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

const COLORS = ['#eb6608', '#1d1d1b', '#3498db', '#2ecc71', '#e74c3c'];

export function Bewoners() {
  const { gebiedData, selectedGebied, isLoadingData } = useGebiedStore();

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

  const { bevolking, huishoudens } = gebiedData;
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
    { name: 'Nederlands', value: bevolking.nederlands, percentage: calculatePercentage(bevolking.nederlands, totaalMigratie) },
    { name: 'Westers', value: bevolking.westers, percentage: calculatePercentage(bevolking.westers, totaalMigratie) },
    { name: 'Niet-westers', value: bevolking.nietWesters, percentage: calculatePercentage(bevolking.nietWesters, totaalMigratie) },
  ];

  const huishoudensData = [
    { name: 'Eenpersoons', value: huishoudens.eenpersoons },
    { name: 'Zonder kinderen', value: huishoudens.zonderKinderen },
    { name: 'Met kinderen', value: huishoudens.metKinderen },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Demografische gegevens */}
      <Card title="Demografische Gegevens" badge="data">
        <InfoGrid
          items={[
            { label: 'Totaal inwoners', value: formatNumber(totaal) },
            { label: 'Bevolkingsdichtheid', value: `${formatNumber(bevolking.dichtheid)} per km²` },
          ]}
        />
      </Card>

      {/* Charts grid */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Leeftijdsverdeling */}
        <Card title="Leeftijdsverdeling" badge="data">
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

        {/* Culturele achtergrond */}
        <Card title="Culturele Achtergrond" badge="data">
          <div style={{ height: '320px' }}>
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

      {/* Gezinssamenstelling */}
      <Card title="Gezinssamenstelling" badge="data">
        <div style={{ height: '256px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={huishoudensData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatNumber(value as number)} />
              <Bar dataKey="value" fill="#1d1d1b" radius={[0, 0, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
