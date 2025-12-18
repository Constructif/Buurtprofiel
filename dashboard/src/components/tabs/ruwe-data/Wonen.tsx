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

  const { woningen } = gebiedData;
  const totaal = woningen.totaal;
  const koopAantal = Math.round((woningen.koopPercentage / 100) * totaal);
  const huurAantal = Math.round((woningen.huurPercentage / 100) * totaal);

  const koopHuurData = [
    { name: `Koop (${Math.round(woningen.koopPercentage)}%)`, value: woningen.koopPercentage },
    { name: `Huur (${Math.round(woningen.huurPercentage)}%)`, value: woningen.huurPercentage },
  ];

  // Placeholder data voor woningtypes - lege waarden
  const woningtypeData = [
    { name: 'Appartement', value: 0 },
    { name: 'Rijtjeshuis', value: 0 },
    { name: 'Twee-onder-één-kap', value: 0 },
    { name: 'Vrijstaand', value: 0 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Woningvoorraad */}
      <Card title="Woningvoorraad" badge="data">
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
        <Card title="Koop vs Huur" badge="data">
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

        {/* Woningtypes - placeholder */}
        <Card title="Woningtypes" badge="placeholder">
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
                  label={({ name }) => name}
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
        </Card>
      </div>

      {/* Huurdetails */}
      <Card title="Huurwoningen Detail" badge="data">
        <InfoGrid
          items={[
            { label: 'Totaal huur', value: `${Math.round(woningen.huurPercentage)}%` },
            { label: 'Sociale huur', value: `${Math.round(woningen.huurSociaalPercentage)}%` },
            { label: 'Particuliere huur', value: `${Math.round(woningen.huurParticulierPercentage)}%` },
          ]}
        />
      </Card>

      {/* Verhuisbewegingen - placeholder */}
      <Card title="Verhuisbewegingen - Laatste 3 jaar" badge="placeholder">
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
          <p>Nog geen data beschikbaar</p>
        </div>
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
