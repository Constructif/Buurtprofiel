import { useGebiedStore } from '../../store/gebiedStore';
import { YearSelector } from '../ui/YearSelector';

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

const wijkrondeTabs = [
  { id: 'vragen', label: 'Vragen' },
  { id: 'observaties', label: 'Observaties' },
];

function BenchmarkToggle() {
  const { selectedGebied, benchmarkType, setBenchmarkType, gemeenteData, gebiedData } = useGebiedStore();

  if (!selectedGebied) return null;

  // Gemeente zelf kan niet met gemeente vergeleken worden
  const isGemeente = selectedGebied.type === 'gemeente';
  if (isGemeente) return null;

  const gemeenteNaam = gemeenteData?.naam || gebiedData?.gemeenteNaam || 'Gemeente';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      backgroundColor: '#e8e4e0',
      borderRadius: '6px',
      padding: '2px',
      flexShrink: 0,
    }}>
      <button
        onClick={() => setBenchmarkType('nederland')}
        style={{
          padding: '5px 10px',
          fontSize: '11px',
          fontWeight: benchmarkType === 'nederland' ? 600 : 400,
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          backgroundColor: benchmarkType === 'nederland' ? '#fff' : 'transparent',
          color: benchmarkType === 'nederland' ? '#1d1d1b' : '#6b7280',
          boxShadow: benchmarkType === 'nederland' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
          whiteSpace: 'nowrap',
        }}
      >
        Nederland
      </button>
      <button
        onClick={() => setBenchmarkType('gemeente')}
        style={{
          padding: '5px 10px',
          fontSize: '11px',
          fontWeight: benchmarkType === 'gemeente' ? 600 : 400,
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          backgroundColor: benchmarkType === 'gemeente' ? '#fff' : 'transparent',
          color: benchmarkType === 'gemeente' ? '#1d1d1b' : '#6b7280',
          boxShadow: benchmarkType === 'gemeente' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {gemeenteNaam}
      </button>
    </div>
  );
}

export function SubTabs() {
  const { mainTab, subTab, setSubTab } = useGebiedStore();

  const tabs = mainTab === 'ruwe-data'
    ? ruweDataTabs
    : mainTab === 'wijkronde'
      ? wijkrondeTabs
      : []; // nader-onderzoek heeft geen subtabs

  const showControls = mainTab === 'ruwe-data';

  if (tabs.length === 0) return null;

  return (
    <nav
      className="sub-tabs scrollbar-hide"
      style={{
        backgroundColor: '#f5f1ee',
        borderBottom: '2px solid #e5e7eb',
      }}
    >
      {/* Bovenste rij: tabs + controls (desktop naast elkaar, mobiel gestapeld) */}
      <div className="sub-tabs-row" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div
          className="sub-tabs-scroll"
          style={{
            display: 'flex',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
            flex: 1,
            minWidth: 0,
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              style={{
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                border: 'none',
                borderBottom: subTab === tab.id ? '3px solid #eb6608' : '3px solid transparent',
                backgroundColor: 'transparent',
                color: subTab === tab.id ? '#1d1d1b' : '#6b7280',
                marginBottom: '-2px',
                flexShrink: 0
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Desktop: controls naast tabs (alleen bij Ruwe Data) */}
        {showControls && (
          <div className="sub-tabs-controls-desktop" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
            paddingRight: '4px',
          }}>
            <BenchmarkToggle />
            <YearSelector />
          </div>
        )}
      </div>

      {/* Mobiel: controls op eigen regel (alleen bij Ruwe Data) */}
      {showControls && (
        <div className="sub-tabs-controls-mobile" style={{
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderTop: '1px solid #e5e7eb',
        }}>
          <BenchmarkToggle />
          <YearSelector />
        </div>
      )}
    </nav>
  );
}
