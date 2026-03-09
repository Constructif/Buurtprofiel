import { useGebiedStore } from '../../store/gebiedStore';

const AVAILABLE_YEARS = [2020, 2021, 2022, 2023, 2024, 2025];

export function YearSelector() {
  const { selectedJaar, setSelectedJaar, selectedGebied, isLoadingData } = useGebiedStore();

  if (!selectedGebied) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      flexShrink: 0,
      paddingRight: '4px',
    }}>
      {AVAILABLE_YEARS.map((jaar) => {
        const isActive = jaar === selectedJaar;
        return (
          <button
            key={jaar}
            onClick={() => setSelectedJaar(jaar)}
            disabled={isLoadingData}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: isActive ? 700 : 500,
              border: 'none',
              borderRadius: '4px',
              cursor: isLoadingData ? 'wait' : 'pointer',
              backgroundColor: isActive ? '#eb6608' : 'transparent',
              color: isActive ? 'white' : '#6b7280',
              transition: 'all 0.15s ease',
              opacity: isLoadingData && !isActive ? 0.5 : 1,
            }}
          >
            {jaar}
          </button>
        );
      })}
    </div>
  );
}
