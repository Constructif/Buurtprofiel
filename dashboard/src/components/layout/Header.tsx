import { useGebiedStore } from '../../store/gebiedStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../services/supabase';
import { GebiedSearch } from '../search/GebiedSearch';

export function Header() {
  const { selectedGebied, clearSelectedGebied } = useGebiedStore();
  const user = useAuthStore((s) => s.user);

  return (
    <header style={{ backgroundColor: '#eb6608', color: 'white', position: 'sticky', top: 0, zIndex: 50 }}>
      <div className="header-container" style={{ maxWidth: '1800px', margin: '0 auto', padding: '0 24px' }}>
        <div
          className="header-layout"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            height: '72px'
          }}
        >
          {/* Search - links */}
          <div className="header-search" style={{ width: '320px', flexShrink: 0 }}>
            <GebiedSearch />
          </div>

          {/* Titel - midden */}
          <div className="header-title" style={{ textAlign: 'center', flexShrink: 0 }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '0.02em', margin: 0 }}>
              Buurtprofiel
            </h1>
          </div>

          {/* Selected area info + user - rechts */}
          <div className="header-selected" style={{ width: '320px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
            {selectedGebied && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                backgroundColor: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)'
              }}>
                <span style={{
                  padding: '2px 8px',
                  backgroundColor: '#1d1d1b',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {selectedGebied.type}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600, color: 'white', margin: 0, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedGebied.naam}
                  </p>
                </div>
                <button
                  onClick={clearSelectedGebied}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.8
                  }}
                  title="Selectie wissen"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
              <button
                onClick={() => supabase.auth.signOut()}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '6px 12px',
                  fontSize: '12px',
                }}
              >
                Uitloggen
              </button>
              {user?.email && (
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>
                  {user.email}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
