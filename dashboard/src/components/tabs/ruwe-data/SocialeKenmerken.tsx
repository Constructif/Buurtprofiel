import { useGebiedStore } from '../../../store/gebiedStore';
import { Bewoners } from './Bewoners';
import { ZorgWelzijn } from './ZorgWelzijn';
import { WerkInkomen } from './WerkInkomen';

const internTabs = [
  { id: 'bewoners', label: 'Bewoners' },
  { id: 'zorg', label: 'Zorg & Welzijn' },
  { id: 'economie', label: 'Werk & Inkomen' },
] as const;

export function SocialeKenmerken() {
  const { socialeKenmerkenSubTab, setSocialeKenmerkenSubTab } = useGebiedStore();

  const renderIntern = () => {
    switch (socialeKenmerkenSubTab) {
      case 'bewoners':
        return <Bewoners />;
      case 'zorg':
        return <ZorgWelzijn />;
      case 'economie':
        return <WerkInkomen />;
    }
  };

  return (
    <div>
      <nav
        style={{
          display: 'flex',
          gap: '4px',
          padding: '8px 16px 0',
          borderBottom: '2px solid #e5e7eb',
          backgroundColor: '#f5f1ee',
        }}
      >
        {internTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSocialeKenmerkenSubTab(tab.id)}
            style={{
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              border: 'none',
              borderBottom: socialeKenmerkenSubTab === tab.id ? '3px solid #eb6608' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: socialeKenmerkenSubTab === tab.id ? '#1d1d1b' : '#6b7280',
              marginBottom: '-2px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {renderIntern()}
    </div>
  );
}
