import { useGebiedStore } from '../../store/gebiedStore';

const ruweDataTabs = [
  { id: 'overzicht', label: 'Overzicht' },
  { id: 'bewoners', label: 'Bewoners' },
  { id: 'wonen', label: 'Wonen' },
  { id: 'veiligheid', label: 'Veiligheid' },
  { id: 'voorzieningen', label: 'Voorzieningen' },
  { id: 'zorg', label: 'Zorg & Welzijn' },
  { id: 'economie', label: 'Werk & Inkomen' },
  { id: 'leefomgeving', label: 'Leefomgeving' },
];

const eigenOnderzoekTabs = [
  { id: 'notities', label: 'Notities' },
  { id: 'vergelijkingen', label: 'Vergelijkingen' },
];

export function SubTabs() {
  const { mainTab, subTab, setSubTab } = useGebiedStore();

  const tabs = mainTab === 'ruwe-data' ? ruweDataTabs : eigenOnderzoekTabs;

  return (
    <nav style={{
      display: 'flex',
      gap: '0',
      backgroundColor: '#f5f1ee',
      borderRadius: '0',
      overflow: 'hidden',
      borderBottom: '2px solid #e5e7eb'
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setSubTab(tab.id)}
          style={{
            padding: '12px 20px',
            borderRadius: '0',
            fontSize: '14px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            border: 'none',
            borderBottom: subTab === tab.id ? '3px solid #eb6608' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: subTab === tab.id ? '#1d1d1b' : '#6b7280',
            marginBottom: '-2px'
          }}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
