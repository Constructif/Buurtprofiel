import { useGebiedStore } from '../../store/gebiedStore';
import { FavorietButton } from './FavorietButton';

export function MainTabs() {
  const { mainTab, setMainTab, selectedGebied, getPresentatieSelecties } = useGebiedStore();

  const aantalSelecties = selectedGebied
    ? getPresentatieSelecties(selectedGebied.code).length
    : 0;

  const tabs = [
    { id: 'ruwe-data', label: 'Ruwe Data' },
    { id: 'wijkronde', label: 'Wijkronde' },
    { id: 'nader-onderzoek', label: 'Nader Onderzoek' },
    { id: 'presentatie', label: 'Presentatie', count: aantalSelecties },
  ] as const;

  return (
    <div className="main-tabs" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMainTab(tab.id)}
            style={{
              padding: '12px 24px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: mainTab === tab.id ? '#eb6608' : '#1d1d1b',
              color: 'white',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {tab.label}
            {'count' in tab && tab.count > 0 && (
              <span style={{
                backgroundColor: mainTab === tab.id ? 'rgba(255,255,255,0.3)' : '#eb6608',
                color: 'white',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 700,
                padding: '1px 7px',
                lineHeight: '18px',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {/* Favorietenster — rechts in de witte tabbladenrij, onder de Profiel-knop */}
      <FavorietButton />
    </div>
  );
}
