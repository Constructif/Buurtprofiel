import { useState, useRef, useEffect } from 'react';
import { useGebiedStore } from '../../store/gebiedStore';
import type { TabScore } from '../../types/scoring';
import { getClassificatieKleur } from '../../utils/scoring';

interface TabScoreHeaderProps {
  tabScore: TabScore | null;
}

export function TabScoreHeader({ tabScore }: TabScoreHeaderProps) {
  const { benchmarkType, gemeenteData } = useGebiedStore();
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  // Sluit tooltip bij klik buiten
  useEffect(() => {
    if (!showInfo) return;
    const handleClick = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setShowInfo(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showInfo]);

  if (!tabScore || !tabScore.isGemeten) return null;

  const kleur = getClassificatieKleur(tabScore.classificatie);
  const benchmarkLabel = benchmarkType === 'nederland'
    ? 't.o.v. Nederland'
    : `t.o.v. ${gemeenteData?.gemeenteNaam || gemeenteData?.naam || 'gemeente'}`;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '12px 16px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '16px',
    }}>
      {/* Cijfer */}
      <div style={{
        fontSize: '36px',
        fontWeight: 700,
        color: kleur,
        lineHeight: 1,
        minWidth: '56px',
        textAlign: 'center',
      }}>
        {tabScore.score.toFixed(1)}
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          color: kleur,
        }}>
          {tabScore.classificatie}
        </div>
        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
          {benchmarkLabel}
          {tabScore.isGemeenteData && (
            <span style={{ marginLeft: '8px', fontStyle: 'italic' }}>(gemeente-niveau)</span>
          )}
          {tabScore.confidence !== 'high' && (
            <span style={{ marginLeft: '8px', fontStyle: 'italic' }}>
              ({tabScore.confidence === 'medium' ? 'beperkte data' : 'weinig data'})
            </span>
          )}
        </div>
      </div>

      {/* Info knop */}
      {tabScore.indicatoren.length > 0 && (
        <div ref={infoRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowInfo(!showInfo)}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: '1.5px solid #d1d5db',
              backgroundColor: showInfo ? '#f3f4f6' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
            title="Berekening bekijken"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </button>

          {showInfo && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              padding: '16px',
              backgroundColor: '#1d1d1b',
              color: 'white',
              borderRadius: '8px',
              fontSize: '12px',
              lineHeight: 1.5,
              width: '380px',
              zIndex: 100,
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            }}>
              {/* Tooltip pijltje */}
              <div style={{
                position: 'absolute',
                top: '-6px',
                right: '12px',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderBottom: '6px solid #1d1d1b',
              }} />

              <p style={{ fontWeight: 600, marginBottom: '12px', fontSize: '13px' }}>
                Berekening {tabScore.naam} ({tabScore.score.toFixed(1)})
              </p>

              {/* Tabel header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 65px 65px 50px 55px',
                gap: '4px',
                padding: '4px 0',
                borderBottom: '1px solid rgba(255,255,255,0.2)',
                fontSize: '10px',
                color: '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                <span>Indicator</span>
                <span style={{ textAlign: 'right' }}>Waarde</span>
                <span style={{ textAlign: 'right' }}>Gem.</span>
                <span style={{ textAlign: 'right' }}>Z</span>
                <span style={{ textAlign: 'right' }}>Gewicht</span>
              </div>

              {/* Indicator rijen */}
              {tabScore.indicatoren.filter(i => i.gewicht > 0).map((ind, idx) => (
                <div key={idx} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 65px 65px 50px 55px',
                  gap: '4px',
                  padding: '6px 0',
                  borderBottom: idx < tabScore.indicatoren.filter(i => i.gewicht > 0).length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                }}>
                  <span style={{ fontSize: '11px' }}>{ind.naam}</span>
                  <span style={{ textAlign: 'right', fontWeight: 500 }}>
                    {ind.eenheid === '€'
                      ? `€${ind.waarde.toLocaleString('nl-NL')}`
                      : `${ind.waarde}${ind.eenheid === '%' ? '%' : ind.eenheid ? ` ${ind.eenheid}` : ''}`
                    }
                  </span>
                  <span style={{ textAlign: 'right', color: '#9ca3af' }}>
                    {ind.gemiddelde > 0
                      ? ind.eenheid === '€'
                        ? `€${ind.gemiddelde.toLocaleString('nl-NL')}`
                        : `${ind.gemiddelde}${ind.eenheid === '%' ? '%' : ''}`
                      : '-'
                    }
                  </span>
                  <span style={{
                    textAlign: 'right',
                    color: ind.zScore > 0.5 ? '#4ade80' : ind.zScore < -0.5 ? '#f87171' : '#9ca3af',
                    fontWeight: ind.zScore !== 0 ? 500 : 400,
                  }}>
                    {ind.zScore !== 0 ? (ind.zScore > 0 ? '+' : '') + ind.zScore.toFixed(2) : '-'}
                  </span>
                  <span style={{ textAlign: 'right', color: '#9ca3af' }}>
                    {Math.round(ind.gewicht * 100)}%
                  </span>
                </div>
              ))}

              {/* Methode uitleg */}
              <div style={{
                marginTop: '12px',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255,255,255,0.15)',
                fontSize: '10px',
                color: '#9ca3af',
                lineHeight: 1.6,
              }}>
                <p>Methode: Z-score naar cijfer = 6.0 + z x 1.5</p>
                <p>Gewogen gemiddelde van bovenstaande indicatoren</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
