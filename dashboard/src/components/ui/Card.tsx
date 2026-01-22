import { useState, type ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  badge?: 'data' | 'placeholder' | 'info';
  badgeText?: string;
  badgeTooltip?: string;
  year?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function Card({ title, children, badge, badgeText, badgeTooltip, year, className = '', style, onClick }: CardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
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
            {badge === 'data' && (
              <span style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '0', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {badgeText || `CBS${year ? ` ${year}` : ''}`}
                {badgeTooltip && (
                  <div
                    style={{ position: 'relative', display: 'inline-flex' }}
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ cursor: 'help' }}
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4" />
                      <path d="M12 8h.01" />
                    </svg>
                    {showTooltip && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          marginTop: '8px',
                          padding: '8px 12px',
                          backgroundColor: '#1d1d1b',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '11px',
                          lineHeight: '1.5',
                          width: '220px',
                          zIndex: 100,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          whiteSpace: 'normal'
                        }}
                      >
                        {badgeTooltip}
                        <div
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 0,
                            height: 0,
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderBottom: '6px solid #1d1d1b',
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </span>
            )}
            {badge === 'placeholder' && (
              <span style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: '#fef3c7', color: '#b45309', borderRadius: '0', fontWeight: 500 }}>
                Placeholder
              </span>
            )}
            {badge === 'info' && (
              <span style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: '#dbeafe', color: '#1d4ed8', borderRadius: '0', fontWeight: 500 }}>
                {badgeText || 'Info'}
              </span>
            )}
          </h3>
        </div>
      )}
      <div style={{ padding: title ? '16px' : '0', flex: 1 }}>{children}</div>
    </div>
  );
}
