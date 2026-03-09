import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { TrendPoint } from '../../hooks/useCardYear';

interface TrendLine {
  key: string;
  label: string;
  color: string;
}

interface CardTrendChartProps {
  data: TrendPoint[];
  lines: TrendLine[];
  height?: number;
}

const COLORS = ['#eb6608', '#1d1d1b', '#3498db', '#22c55e', '#8b5cf6', '#ef4444'];

export function CardTrendChart({ data, lines, height = 220 }: CardTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
        Geen trend data beschikbaar
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="jaar" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={50} />
        <Tooltip
          contentStyle={{ fontSize: '12px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
          formatter={((value: number | undefined, name: string | undefined) => {
            const line = lines.find((l) => l.key === name);
            return [typeof value === 'number' ? value.toLocaleString('nl-NL') : String(value ?? ''), line?.label || name || ''];
          }) as never}
        />
        {lines.length > 1 && (
          <Legend
            wrapperStyle={{ fontSize: '11px' }}
            formatter={(value: string) => {
              const line = lines.find((l) => l.key === value);
              return line?.label || value;
            }}
          />
        )}
        {lines.map((line, i) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            stroke={line.color || COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
