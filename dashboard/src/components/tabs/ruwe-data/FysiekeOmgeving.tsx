import { useGebiedStore } from '../../../store/gebiedStore';
import { Wonen } from './Wonen';
import { Leefomgeving } from './Leefomgeving';

const internTabs = [
  { id: 'wonen', label: 'Wonen' },
  { id: 'leefomgeving', label: 'Leefomgeving' },
] as const;

export function FysiekeOmgeving() {
  const { fysiekeOmgevingSubTab, setFysiekeOmgevingSubTab } = useGebiedStore();

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
            onClick={() => setFysiekeOmgevingSubTab(tab.id)}
            style={{
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              border: 'none',
              borderBottom: fysiekeOmgevingSubTab === tab.id ? '3px solid #eb6608' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: fysiekeOmgevingSubTab === tab.id ? '#1d1d1b' : '#6b7280',
              marginBottom: '-2px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {fysiekeOmgevingSubTab === 'wonen' ? <Wonen /> : <Leefomgeving />}
    </div>
  );
}
