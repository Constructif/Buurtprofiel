import { useGebiedStore } from '../../../store/gebiedStore';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../services/supabase';
import type { Favoriet } from '../../../types/favorieten';
import type { Gebied } from '../../../types/gebied';

function favorietNaarGebied(f: Favoriet): Gebied {
  return {
    code: f.gebied_code,
    naam: f.gebied_naam,
    type: f.gebied_type,
    gemeenteNaam: f.gebied_gemeente_naam ?? undefined,
  };
}

export function ProfielTab() {
  const user = useAuthStore((s) => s.user);
  const favorieten = useGebiedStore((s) => s.favorieten);
  const toggleFavoriet = useGebiedStore((s) => s.toggleFavoriet);
  const setProfielOpen = useGebiedStore((s) => s.setProfielOpen);
  const selectAndLoadGebied = useGebiedStore((s) => s.selectAndLoadGebied);
  const resolveGebiedByCode = useGebiedStore((s) => s.resolveGebiedByCode);

  const openFavoriet = async (f: Favoriet) => {
    setProfielOpen(false);
    const resolved = await resolveGebiedByCode(f.gebied_code);
    const gebied = resolved ?? favorietNaarGebied(f); // fallback bij inactief/verwijderd gebied
    // selectAndLoadGebied bewaakt zelf tegen race conditions bij snel wisselen.
    await selectAndLoadGebied(gebied);
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      {/* Kop */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1d1d1b', margin: '0 0 4px' }}>
          Profiel
        </h2>
        {user?.email && (
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{user.email}</p>
        )}
      </div>

      {/* Favorieten */}
      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1d1d1b', margin: '0 0 12px' }}>
        Mijn favorieten
      </h3>

      {favorieten.length === 0 ? (
        <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px' }}>
          Nog geen favorieten — klik op het sterretje bij een gebied.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          {favorieten.map((f) => (
            <div
              key={f.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
              }}
            >
              <button
                onClick={() => openFavoriet(f)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flex: 1,
                  minWidth: 0,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: 0,
                }}
              >
                <span style={{
                  padding: '2px 8px',
                  backgroundColor: '#1d1d1b',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderRadius: '3px',
                  flexShrink: 0,
                }}>
                  {f.gebied_type}
                </span>
                <span style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '8px',
                  overflow: 'hidden',
                }}>
                  <span style={{
                    fontWeight: 600,
                    fontSize: '14px',
                    color: '#1d1d1b',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {f.gebied_naam}
                  </span>
                  {f.gebied_gemeente_naam && f.gebied_type !== 'gemeente' && (
                    <span style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      · {f.gebied_gemeente_naam}
                    </span>
                  )}
                </span>
              </button>
              <button
                onClick={() => toggleFavoriet(favorietNaarGebied(f))}
                title="Verwijder uit favorieten"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Acties */}
      <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
        <button
          onClick={() => setProfielOpen(false)}
          style={{
            background: 'none',
            border: '1px solid #d1d5db',
            color: '#1d1d1b',
            cursor: 'pointer',
            padding: '8px 16px',
            fontSize: '13px',
            borderRadius: '4px',
          }}
        >
          Terug naar dashboard
        </button>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{
            background: '#eb6608',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '4px',
          }}
        >
          Uitloggen
        </button>
      </div>
    </div>
  );
}
