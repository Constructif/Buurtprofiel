interface InfoItem {
  label: string;
  value: string | number;
}

interface InfoGridProps {
  items: InfoItem[];
  columns?: 2 | 3 | 4;
}

export function InfoGrid({ items, columns = 4 }: InfoGridProps) {
  return (
    <div
      className="info-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '16px'
      }}
    >
      {items.map((item, index) => (
        <div
          key={index}
          style={{
            padding: '16px',
            paddingLeft: '12px',
            backgroundColor: '#f9fafb',
            borderLeft: '4px solid transparent',
            transition: 'border-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.borderLeftColor = '#eb6608'}
          onMouseOut={(e) => e.currentTarget.style.borderLeftColor = 'transparent'}
        >
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>{item.label}</p>
          <p style={{ fontSize: '20px', fontWeight: 600, color: '#111827' }}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
