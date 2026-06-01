import { useState } from 'react';
import { useGebiedStore } from '../../store/gebiedStore';
import { useAuthStore } from '../../store/authStore';
import { GebiedSearch } from '../search/GebiedSearch';

export function Header() {
  const { selectedGebied, clearSelectedGebied } = useGebiedStore();
  const setProfielOpen = useGebiedStore((s) => s.setProfielOpen);
  const user = useAuthStore((s) => s.user);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header style={{ backgroundColor: '#eb6608', color: 'white', position: 'sticky', top: 0, zIndex: 50 }}>
      <div className="header-container" style={{ maxWidth: '1800px', margin: '0 auto', padding: '0 24px' }}>

        {/* ── DESKTOP HEADER ── (verborgen op mobiel via CSS) */}
        <div
          className="header-desktop"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            height: '72px',
          }}
        >
          {/* Links: zoekbalk */}
          <div style={{ width: '320px', flexShrink: 0 }}>
            <GebiedSearch onSelect={() => {}} />
          </div>

          {/* Midden: titel */}
          <h1 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '0.02em', margin: 0, flexShrink: 0 }}>
            Buurtprofiel
          </h1>

          {/* Rechts: geselecteerd gebied + uitloggen */}
          <div style={{ width: '320px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
            {selectedGebied && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                backgroundColor: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
              }}>
                <span style={{
                  padding: '2px 8px',
                  backgroundColor: '#1d1d1b',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {selectedGebied.type}
                </span>
                <p style={{ fontWeight: 600, color: 'white', margin: 0, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedGebied.naam}
                </p>
                <button
                  onClick={clearSelectedGebied}
                  style={{
                    background: 'none', border: 'none', color: 'white',
                    cursor: 'pointer', padding: '4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8,
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
                onClick={() => setProfielOpen(true)}
                style={{
                  background: 'none', border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white', cursor: 'pointer', padding: '6px 12px', fontSize: '12px',
                }}
              >
                Profiel
              </button>
              {user?.email && (
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>
                  {user.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── MOBIEL HEADER ── (verborgen op desktop via CSS) */}
        <div className="header-mobile" style={{ display: 'none' }}>
          {/* Regel 1: Buurtprofiel | zoek-icoon | uitloggen */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            height: '48px',
          }}>
            <h1 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.02em', margin: 0, flexShrink: 0 }}>
              Buurtprofiel
            </h1>
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              style={{
                background: 'none', border: 'none', color: 'white',
                cursor: 'pointer', padding: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button
              onClick={() => setProfielOpen(true)}
              style={{
                background: 'none', border: '1px solid rgba(255,255,255,0.3)',
                color: 'white', cursor: 'pointer', padding: '5px 12px',
                fontSize: '12px', borderRadius: '4px', flexShrink: 0,
              }}
            >
              Profiel
            </button>
          </div>

          {/* Zoekbalk (toggle) */}
          {searchOpen && (
            <div style={{ paddingBottom: '12px' }}>
              <GebiedSearch onSelect={() => setSearchOpen(false)} />
            </div>
          )}

          {/* Regel 2: geselecteerde buurt */}
          {selectedGebied && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '10px', paddingBottom: '10px',
            }}>
              <span style={{
                padding: '2px 8px', backgroundColor: '#1d1d1b', color: 'white',
                fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.05em', borderRadius: '3px',
              }}>
                {selectedGebied.type}
              </span>
              <span style={{ fontWeight: 600, fontSize: '16px' }}>
                {selectedGebied.naam}
              </span>
              <button
                onClick={clearSelectedGebied}
                style={{
                  background: 'none', border: 'none', color: 'white',
                  cursor: 'pointer', padding: '2px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
