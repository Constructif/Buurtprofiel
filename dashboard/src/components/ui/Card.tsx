import { useState, useRef, useEffect, type ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  badge?: 'data' | 'placeholder' | 'info' | 'fallback';
  badgeText?: string;
  badgeTooltip?: string;
  year?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  // Per-card jaar-switching
  onYearChange?: (jaar: number | 'trend') => void;
  availableYears?: number[];
  activeYearMode?: number | 'trend';
  /** Jaren die daadwerkelijk data bevatten — niet-beschikbare jaren worden gedempt in dropdown */
  yearsWithData?: number[];
}

export function Card({ title, subtitle, children, badge, badgeText, badgeTooltip, year, className = '', style, onClick, onYearChange, availableYears, activeYearMode, yearsWithData }: CardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sluit dropdown bij klik buiten
  useEffect(() => {
    if (!showYearDropdown) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowYearDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showYearDropdown]);

  const isYearSwitchable = onYearChange && availableYears && availableYears.length > 0;
  const displayYear = activeYearMode === 'trend' ? 'Trend' : (activeYearMode ?? year);

  const renderBadge = () => {
    if (badge === 'placeholder') {
      return (
        <span style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: '#fef3c7', color: '#b45309', borderRadius: '0', fontWeight: 500 }}>
          Placeholder
        </span>
      );
    }
    if (badge === 'info') {
      return (
        <span style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: '#dbeafe', color: '#1d4ed8', borderRadius: '0', fontWeight: 500 }}>
          {badgeText || 'Info'}
        </span>
      );
    }
    if (badge !== 'data' && badge !== 'fallback') return null;

    const badgeLabel = badgeText || `CBS${displayYear ? ` ${displayYear}` : ''}`;

    return (
      <div style={{ position: 'relative', display: 'inline-flex' }} ref={dropdownRef}>
        <span
          style={{
            fontSize: '11px',
            padding: '3px 8px',
            backgroundColor: activeYearMode === 'trend' ? '#ede9fe' : (badge === 'fallback' ? '#dbeafe' : '#dcfce7'),
            color: activeYearMode === 'trend' ? '#6d28d9' : (badge === 'fallback' ? '#1d4ed8' : '#15803d'),
            borderRadius: '0',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: isYearSwitchable ? 'pointer' : 'default',
            userSelect: 'none',
          }}
          onClick={isYearSwitchable ? (e) => {
            e.stopPropagation();
            setShowYearDropdown(!showYearDropdown);
          } : undefined}
        >
          {badgeLabel}
          {isYearSwitchable && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ transform: showYearDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          )}
          {badgeTooltip && !isYearSwitchable && (
            <div
              style={{ position: 'relative', display: 'inline-flex' }}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'help' }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              {showTooltip && (
                <div style={{
                  position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                  marginTop: '8px', padding: '8px 12px', backgroundColor: '#1d1d1b', color: 'white',
                  borderRadius: '4px', fontSize: '11px', lineHeight: '1.5', width: '220px',
                  zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', whiteSpace: 'normal'
                }}>
                  {badgeTooltip}
                  <div style={{
                    position: 'absolute', top: '-6px', left: '50%', transform: 'translateX(-50%)',
                    width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '6px solid #1d1d1b',
                  }} />
                </div>
              )}
            </div>
          )}
        </span>

        {/* Jaar dropdown */}
        {showYearDropdown && isYearSwitchable && (
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: '4px',
            backgroundColor: 'white', border: '1px solid #e5e7eb',
            boxShadow: '0 8px 16px rgba(0,0,0,0.12)', zIndex: 200,
            minWidth: '120px',
          }}>
            {availableYears.map((y) => {
              const hasData = !yearsWithData || yearsWithData.length === 0 || yearsWithData.includes(y);
              const isActive = activeYearMode === y;
              return (
                <button
                  key={y}
                  onClick={(e) => {
                    e.stopPropagation();
                    onYearChange(y);
                    setShowYearDropdown(false);
                  }}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    width: '100%', padding: '6px 12px', border: 'none',
                    backgroundColor: isActive ? '#f5f1ee' : 'white',
                    color: isActive ? '#eb6608' : hasData ? '#374151' : '#c0c0c0',
                    fontSize: '12px', fontWeight: isActive ? 600 : 400,
                    textAlign: 'left', cursor: 'pointer',
                  }}
                  onMouseOver={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                  onMouseOut={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'white'; }}
                >
                  <span>{y}</span>
                  {hasData ? (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isActive ? '#eb6608' : '#22c55e', flexShrink: 0 }} />
                  ) : (
                    <span style={{ fontSize: '9px', color: '#c0c0c0' }}>—</span>
                  )}
                </button>
              );
            })}
            {/* Trend optie */}
            <div style={{ borderTop: '1px solid #e5e7eb' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onYearChange('trend');
                  setShowYearDropdown(false);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  width: '100%', padding: '6px 12px', border: 'none',
                  backgroundColor: activeYearMode === 'trend' ? '#f5f0ff' : 'white',
                  color: activeYearMode === 'trend' ? '#6d28d9' : '#374151',
                  fontSize: '12px', fontWeight: activeYearMode === 'trend' ? 600 : 400,
                  textAlign: 'left', cursor: 'pointer',
                }}
                onMouseOver={(e) => { if (activeYearMode !== 'trend') e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                onMouseOut={(e) => { if (activeYearMode !== 'trend') e.currentTarget.style.backgroundColor = 'white'; }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h4l3-9 4 18 3-9h4" />
                </svg>
                Trend
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        backgroundColor: 'white',
        borderRadius: '0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        ...style
      }}
    >
      {title && (
        <div style={{ padding: '14px 18px', borderBottom: '2px solid #eb6608', flexShrink: 0, backgroundColor: '#fafafa' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1d1d1b', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            {title}
            {renderBadge()}
          </h3>
          {subtitle && (
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>{subtitle}</p>
          )}
        </div>
      )}
      <div style={{ padding: title ? '16px' : '0', flex: 1 }}>{children}</div>
    </div>
  );
}
