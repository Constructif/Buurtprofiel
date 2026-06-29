import { type ReactNode } from 'react';
import { useGebiedStore } from '../../store/gebiedStore';
import { Card } from './Card';

interface SelectableWrapperProps {
  sectionId: string;
  children: ReactNode;
  style?: React.CSSProperties;
}

export function SelectableWrapper({ sectionId, children, style }: SelectableWrapperProps) {
  const { selectedGebied, isSelectieModus, isPresentatieGeselecteerd, togglePresentatieSelectie } = useGebiedStore();

  const gebiedCode = selectedGebied?.code ?? null;
  const geselecteerd = gebiedCode ? isPresentatieGeselecteerd(gebiedCode, sectionId) : false;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!gebiedCode) return;
    togglePresentatieSelectie(gebiedCode, sectionId);
  };

  if (!isSelectieModus || !gebiedCode) {
    return <div style={style}>{children}</div>;
  }

  return (
    <div style={{ position: 'relative', ...style }}>
      {children}
      <button
        onClick={handleToggle}
        title={geselecteerd ? 'Verwijder uit presentatie' : 'Voeg toe aan presentatie'}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10,
          width: '32px',
          height: '32px',
          backgroundColor: geselecteerd ? '#eb6608' : 'rgba(255,255,255,0.95)',
          border: `2px solid ${geselecteerd ? '#eb6608' : '#d1d5db'}`,
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
          padding: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24"
          fill={geselecteerd ? 'white' : 'none'}
          stroke={geselecteerd ? 'white' : '#6b7280'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    </div>
  );
}

interface SelectableCardProps {
  sectionId: string;
  children: ReactNode;
  title?: string;
  subtitle?: string;
  badge?: 'data' | 'placeholder' | 'info' | 'fallback';
  badgeText?: string;
  badgeTooltip?: string;
  year?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  onYearChange?: (jaar: number | 'trend') => void;
  availableYears?: number[];
  activeYearMode?: number | 'trend';
  yearsWithData?: number[];
}

export function SelectableCard({ sectionId, children, ...cardProps }: SelectableCardProps) {
  const { selectedGebied, isSelectieModus, isPresentatieGeselecteerd, togglePresentatieSelectie } = useGebiedStore();

  const gebiedCode = selectedGebied?.code ?? null;
  const geselecteerd = gebiedCode ? isPresentatieGeselecteerd(gebiedCode, sectionId) : false;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!gebiedCode) return;
    togglePresentatieSelectie(gebiedCode, sectionId);
  };

  if (!isSelectieModus || !gebiedCode) {
    return <Card {...cardProps}>{children}</Card>;
  }

  return (
    <div style={{ position: 'relative' }}>
      <Card {...cardProps}>{children}</Card>
      <button
        onClick={handleToggle}
        title={geselecteerd ? 'Verwijder uit presentatie' : 'Voeg toe aan presentatie'}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10,
          width: '32px',
          height: '32px',
          backgroundColor: geselecteerd ? '#eb6608' : 'rgba(255,255,255,0.95)',
          border: `2px solid ${geselecteerd ? '#eb6608' : '#d1d5db'}`,
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
          transition: 'all 0.15s',
          padding: 0,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={geselecteerd ? 'white' : 'none'}
          stroke={geselecteerd ? 'white' : '#6b7280'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    </div>
  );
}
