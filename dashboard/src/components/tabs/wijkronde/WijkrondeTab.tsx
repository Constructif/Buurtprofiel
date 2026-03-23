import { useGebiedStore } from '../../../store/gebiedStore';
import { RondeSelector } from './RondeSelector';
import { VragenPanel } from './VragenPanel';
import { ObservatiesPanel } from './ObservatiesPanel';

export function WijkrondeTab() {
  const selectedGebied = useGebiedStore((s) => s.selectedGebied);
  const subTab = useGebiedStore((s) => s.subTab);

  if (!selectedGebied) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1d1d1b', marginBottom: '8px' }}>
          Wijkronde
        </h2>
        <p style={{ color: '#6b7280', maxWidth: '400px', margin: '0 auto' }}>
          Selecteer een buurt om een wijkronde te starten of eerdere rondes te bekijken.
        </p>
      </div>
    );
  }

  return (
    <div>
      <RondeSelector />

      {subTab === 'vragen' && <VragenPanel />}
      {subTab === 'observaties' && <ObservatiesPanel />}
    </div>
  );
}
