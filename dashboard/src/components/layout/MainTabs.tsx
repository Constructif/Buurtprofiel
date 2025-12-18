import { useGebiedStore } from '../../store/gebiedStore';

export function MainTabs() {
  const { mainTab, setMainTab } = useGebiedStore();

  const tabs = [
    { id: 'ruwe-data', label: 'Ruwe Data' },
    { id: 'eigen-onderzoek', label: 'Eigen Onderzoek' },
  ] as const;

  return (
    <div className="main-tabs" style={{ display: 'flex', gap: '8px' }}>
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
            letterSpacing: '0.05em'
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
