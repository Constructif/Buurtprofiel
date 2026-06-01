import { useGebiedStore } from '../../store/gebiedStore';

export function FavorietButton() {
  const selectedGebied = useGebiedStore((s) => s.selectedGebied);
  const toggleFavoriet = useGebiedStore((s) => s.toggleFavoriet);
  // Abonneer direct op favorieten zodat de ster-status meeverandert bij toggle
  const favorieten = useGebiedStore((s) => s.favorieten);

  if (!selectedGebied) return null;

  const actief = favorieten.some((f) => f.gebied_code === selectedGebied.code);

  return (
    <button
      onClick={() => toggleFavoriet(selectedGebied)}
      title={actief ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten'}
      aria-pressed={actief}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '8px 12px',
        fontSize: '13px',
        fontWeight: 500,
        color: actief ? '#eb6608' : '#6b7280',
        whiteSpace: 'nowrap',
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={actief ? '#eb6608' : 'none'}
        stroke={actief ? '#eb6608' : 'currentColor'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      {actief ? 'Favoriet' : 'Favoriet maken'}
    </button>
  );
}
