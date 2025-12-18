interface InfoItem {
  label: string;
  value: string | number;
}

interface InfoGridProps {
  items: InfoItem[];
  columns?: 2 | 3 | 4;
}

export function InfoGrid({ items, columns = 4 }: InfoGridProps) {
  const gridClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[columns];

  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {items.map((item, index) => (
        <div
          key={index}
          className="p-4 bg-gray-50 border-l-4 border-transparent hover:border-primary transition-colors duration-200"
          style={{ paddingLeft: '5px' }}
        >
          <p className="text-sm text-gray-500 mb-1">{item.label}</p>
          <p className="text-xl font-semibold text-gray-900">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
