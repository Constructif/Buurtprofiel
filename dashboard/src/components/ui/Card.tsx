import type { ReactNode } from 'react';

interface CardProps {
  title: string;
  children: ReactNode;
  badge?: 'data' | 'placeholder';
  className?: string;
}

export function Card({ title, children, badge, className = '' }: CardProps) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: 'white',
        borderRadius: '0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{ padding: '14px 18px', borderBottom: '2px solid #eb6608', flexShrink: 0, backgroundColor: '#fafafa' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1d1d1b', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          {title}
          {badge === 'data' && (
            <span style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '0', fontWeight: 500 }}>
              CBS Data
            </span>
          )}
          {badge === 'placeholder' && (
            <span style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: '#fef3c7', color: '#b45309', borderRadius: '0', fontWeight: 500 }}>
              Placeholder
            </span>
          )}
        </h3>
      </div>
      <div style={{ padding: '16px', flex: 1 }}>{children}</div>
    </div>
  );
}
