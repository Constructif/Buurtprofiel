interface KpiCardProps {
  label: string;
  value: string | number;
  change?: string;
  positive?: boolean;
}

export function KpiCard({ label, value, change, positive }: KpiCardProps) {
  return (
    <div style={{ backgroundColor: 'white', padding: '16px 20px', borderRadius: '0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb', borderLeft: '4px solid #eb6608' }}>
      <p style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '4px' }}>
        {label}
      </p>
      <p style={{ fontSize: '28px', fontWeight: 700, color: '#1d1d1b' }}>{value}</p>
      {change && (
        <p style={{ fontSize: '13px', marginTop: '4px', fontWeight: 500, color: positive ? '#059669' : '#dc2626' }}>
          {change}
        </p>
      )}
    </div>
  );
}
