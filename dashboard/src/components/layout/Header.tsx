import { useState } from 'react';
import { useGebiedStore } from '../../store/gebiedStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../services/supabase';
import { GebiedSearch } from '../search/GebiedSearch';

export function Header() {
  const { selectedGebied, clearSelectedGebied } = useGebiedStore();
  const user = useAuthStore((s) => s.user);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header style={{ backgroundColor: '#eb6608', color: 'white', position: 'sticky', top: 0, zIndex: 50 }}>
      <div className="header-container" style={{ maxWidth: '1800px', margin: '0 auto', padding: '0 24px' }}>
        {/* Regel 1: Buurtprofiel | zoek-icoon | uitloggen */}
        <div
          className="header-layout"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '52px',
          }}
        >
          {/* Links: titel */}
          <h1 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '0.02em', margin: 0, flexShrink: 0 }}>
            Buurtprofiel
          </h1>

          {/* Midden: vergrootglas icoon */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: searchOpen ? 1 : 0.85,
            }}
            title="Zoeken"
          >
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Rechts: uitloggen */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
            <button
              onClick={() => supabase.auth.signOut()}
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                cursor: 'pointer',
                padding: '5px 12px',
                fontSize: '12px',
                borderRadius: '4px',
              }}
            >
              Uitloggen
            </button>
            {user?.email && (
              <span className="header-email" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>
                {user.email}
              </span>
            )}
          </div>
        </div>

        {/* Zoekbalk (toggle) */}
        {searchOpen && (
          <div style={{ paddingBottom: '12px' }}>
            <GebiedSearch onSelect={() => setSearchOpen(false)} />
          </div>
        )}

        {/* Regel 2: geselecteerde buurt/wijk/gemeente */}
        {selectedGebied && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            paddingBottom: '10px',
          }}>
            <span style={{
              padding: '2px 8px',
              backgroundColor: '#1d1d1b',
              color: 'white',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderRadius: '3px',
            }}>
              {selectedGebied.type}
            </span>
            <span style={{
              fontWeight: 600,
              fontSize: '16px',
            }}>
              {selectedGebied.naam}
            </span>
            <button
              onClick={clearSelectedGebied}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.7,
              }}
              title="Selectie wissen"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
