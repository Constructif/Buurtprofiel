import { useGebiedStore } from '../../store/gebiedStore';

const AVAILABLE_YEARS = [2020, 2021, 2022, 2023, 2024, 2025];

export function YearSelector() {
  const { selectedJaar, setSelectedJaar, selectedGebied, isLoadingData } = useGebiedStore();

  if (!selectedGebied) return null;

  return (
    <>
      {/* Desktop: knoppen */}
      <div className="year-selector-desktop" style={{
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

      {/* Mobiel: dropdown */}
      <select
        className="year-selector-mobile"
        value={selectedJaar}
        onChange={(e) => setSelectedJaar(Number(e.target.value))}
        disabled={isLoadingData}
        style={{
          display: 'none',
          padding: '5px 8px',
          fontSize: '12px',
          fontWeight: 600,
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          backgroundColor: '#fff',
          color: '#1d1d1b',
          cursor: 'pointer',
        }}
      >
        {AVAILABLE_YEARS.map((jaar) => (
          <option key={jaar} value={jaar}>{jaar}</option>
        ))}
      </select>
    </>
  );
}
