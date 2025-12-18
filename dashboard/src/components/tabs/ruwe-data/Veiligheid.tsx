import { useGebiedStore } from '../../../store/gebiedStore';
import { Card } from '../../ui/Card';
import { InfoGrid } from '../../ui/InfoGrid';

export function Veiligheid() {
  const { gebiedData, selectedGebied, isLoadingData } = useGebiedStore();

  if (!selectedGebied) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>
        <p style={{ fontSize: '20px' }}>Selecteer een gebied om veiligheidsdata te bekijken</p>
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

  const { criminaliteit } = gebiedData;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Veiligheidsscore - placeholder */}
      <Card title="Veiligheidsscore" badge="placeholder">
        <div style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: '72px', fontWeight: 700, color: '#9ca3af' }}>
            -
            <span style={{ fontSize: '28px', color: '#d1d5db' }}>/10</span>
          </div>
          <p style={{ color: '#9ca3af', marginTop: '8px' }}>Nog geen score beschikbaar</p>
        </div>
      </Card>

      {/* Criminaliteitscijfers */}
      <Card title="Criminaliteitscijfers" badge="data">
        <InfoGrid
          items={[
            { label: 'Totaal geregistreerd', value: criminaliteit.totaal.toString() },
            { label: 'Vermogensdelicten', value: criminaliteit.vermogen.toString() },
            { label: 'Geweldsdelicten', value: criminaliteit.geweld.toString() },
            { label: 'Vernielingen', value: criminaliteit.vernieling.toString() },
          ]}
        />
      </Card>

      {/* Detail overzicht */}
      <Card title="Detail Overzicht" badge="data">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <MeldingRow label="Inbraak woningen" value={criminaliteit.inbraakWoningen} />
          <MeldingRow label="Diefstal auto's" value={criminaliteit.dieftalAutos} />
          <MeldingRow label="Diefstal uit auto's" value={criminaliteit.dieftalUitAutos} />
          <div style={{ paddingTop: '12px', borderTop: '1px solid #e5e7eb', marginTop: '8px' }}>
            <MeldingRow label="Totaal geregistreerd" value={criminaliteit.totaal} highlight />
          </div>
        </div>
      </Card>

      {/* Criminaliteit per type - placeholder */}
      <Card title="Criminaliteit per Type" badge="placeholder">
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
          <p>Nog geen data beschikbaar</p>
        </div>
      </Card>

      {/* Trend - placeholder */}
      <Card title="Trend - 3 jaar" badge="placeholder">
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
          <p>Nog geen data beschikbaar</p>
        </div>
      </Card>
    </div>
  );
}

function MeldingRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px',
        backgroundColor: highlight ? '#eb6608' : '#f5f1ee',
        color: highlight ? 'white' : undefined
      }}
    >
      <span style={{ fontWeight: highlight ? 500 : 400, color: highlight ? 'white' : '#4b5563' }}>{label}</span>
      <span style={{ fontWeight: 700, color: highlight ? 'white' : '#1d1d1b' }}>{value}</span>
    </div>
  );
}
