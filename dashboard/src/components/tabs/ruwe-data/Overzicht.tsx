import { useGebiedStore } from '../../../store/gebiedStore';
import { Card } from '../../ui/Card';
import { BuurtMap } from '../../maps/BuurtMap';

function formatNumber(num: number): string {
  return num.toLocaleString('nl-NL');
}

function calculatePercentage(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export function Overzicht() {
  const { gebiedData, selectedGebied, isLoadingData } = useGebiedStore();

  if (!selectedGebied) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>
        <p style={{ fontSize: '20px' }}>Selecteer een buurt, wijk of gemeente om te beginnen</p>
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid #eb6608', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#6b7280' }}>Data laden...</p>
      </div>
    );
  }

  if (!gebiedData) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>
        <p>Geen data beschikbaar voor dit gebied</p>
      </div>
    );
  }

  const totaalBevolking = gebiedData.bevolking.totaal;
  const vergrijzingPerc = calculatePercentage(gebiedData.bevolking.leeftijd_65_plus, totaalBevolking);
  const migratiePerc = calculatePercentage(
    gebiedData.bevolking.westers + gebiedData.bevolking.nietWesters,
    totaalBevolking
  );

  // Bereken een buurtscore (placeholder logica - later te verfijnen)
  const buurtScore = Math.round(
    (100 - vergrijzingPerc * 0.5) * 0.2 +
    (100 - migratiePerc * 0.3) * 0.2 +
    gebiedData.woningen.koopPercentage * 0.3 +
    Math.min(gebiedData.inkomen.gemiddeld / 500, 100) * 0.3
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Map + Score + Stats */}
      <section>
        <div className="overzicht-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', alignItems: 'stretch' }}>
          {/* Kaart zonder container */}
          <div className="overzicht-map" style={{ borderRadius: '8px', overflow: 'hidden', height: '100%', minHeight: '400px' }}>
            <BuurtMap />
          </div>

          {/* Score + Kernstatistieken */}
          <div className="overzicht-stats" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Buurtscore */}
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Buurtscore</p>
              <div style={{
                fontSize: '48px',
                fontWeight: 700,
                color: buurtScore >= 70 ? '#10b981' : buurtScore >= 50 ? '#f59e0b' : '#ef4444',
                lineHeight: 1
              }}>
                {buurtScore}
              </div>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>van 100</p>
            </div>

            {/* Kernstatistieken */}
            <Card title="Kernstatistieken" badge="data">
              <div>
                <StatRow label="Vergrijzing (65+)" value={`${vergrijzingPerc}%`} color="amber" />
                <StatRow label="Migratieachtergrond" value={`${migratiePerc}%`} color="blue" />
                <StatRow label="Koopwoningen" value={`${Math.round(gebiedData.woningen.koopPercentage)}%`} color="emerald" />
                <StatRow label="Huurwoningen" value={`${Math.round(gebiedData.woningen.huurPercentage)}%`} color="purple" />
                <StatRow
                  label="Eenpersoonshuishoudens"
                  value={`${calculatePercentage(gebiedData.huishoudens.eenpersoons, gebiedData.huishoudens.totaal)}%`}
                  color="rose"
                />
                <StatRow
                  label="Bevolkingsdichtheid"
                  value={`${formatNumber(gebiedData.bevolking.dichtheid)} /km²`}
                  color="slate"
                />
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Trends - placeholder sectie */}
      <section>
        <Card title="Trends - Laatste 5 jaar" badge="placeholder">
          <div className="trends-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
            <TrendCard label="Bevolking" value="-" />
            <TrendCard label="Criminaliteit" value="-" />
            <TrendCard label="Groen" value="-" />
            <TrendCard label="Inkomen" value="-" />
            <TrendCard label="Voorzieningen" value="-" />
            <TrendCard label="Werkloosheid" value="-" />
          </div>
        </Card>
      </section>
    </div>
  );
}

const colorValues: Record<string, string> = {
  amber: '#eb6608',
  blue: '#1d1d1b',
  emerald: '#10b981',
  purple: '#a855f7',
  rose: '#f43f5e',
  slate: '#64748b',
};

function StatRow({ label, value, color = 'slate' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: colorValues[color] || colorValues.slate }} />
        <span style={{ color: '#374151', fontSize: '14px' }}>{label}</span>
      </div>
      <span style={{ fontWeight: 600, color: '#111827', fontSize: '15px' }}>{value}</span>
    </div>
  );
}

function TrendCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f5f1ee' }}>
      <p style={{ fontSize: '13px', color: '#4b5563', marginBottom: '8px' }}>{label}</p>
      <p style={{ fontWeight: 600, fontSize: '18px', color: '#9ca3af' }}>{value}</p>
    </div>
  );
}
