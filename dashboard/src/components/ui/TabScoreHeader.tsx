import { useState, useRef, useEffect } from 'react';
import { useGebiedStore } from '../../store/gebiedStore';
import type { TabScore, IndicatorDetail } from '../../types/scoring';
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
            title="Hoe is dit cijfer berekend?"
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
              maxHeight: '70vh',
              overflowY: 'auto',
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

              <p style={{ fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>
                Hoe is de {tabScore.naam}-score berekend?
              </p>

              <p style={{ fontSize: '11px', color: '#d1d5db', marginBottom: '14px' }}>
                Dit cijfer ({tabScore.score.toFixed(1)}) is opgebouwd uit {tabScore.indicatoren.filter(i => i.gewicht > 0).length} onderdelen.
                Elk onderdeel wordt vergeleken met het {benchmarkType === 'nederland' ? 'landelijk' : 'gemeente-'}gemiddelde.
                Een score van 6,0 betekent precies gemiddeld.
              </p>

              {/* Indicator kaartjes */}
              {tabScore.indicatoren.filter(i => i.gewicht > 0).map((ind, idx) => (
                <IndicatorRow key={idx} ind={ind} benchmarkType={benchmarkType} isLast={idx === tabScore.indicatoren.filter(i => i.gewicht > 0).length - 1} />
              ))}

              {/* Uitleg methode */}
              <div style={{
                marginTop: '14px',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255,255,255,0.15)',
                fontSize: '11px',
                color: '#9ca3af',
                lineHeight: 1.6,
              }}>
                <p style={{ marginBottom: '4px' }}>
                  <strong style={{ color: '#d1d5db' }}>Hoe werkt de scoring?</strong>
                </p>
                <p>Elke waarde wordt vergeleken met het gemiddelde. Beter dan gemiddeld verhoogt de score, slechter verlaagt hem. De onderdelen worden gewogen samengevoegd tot het eindcijfer.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IndicatorRow({ ind, isLast }: { ind: IndicatorDetail; benchmarkType: string; isLast: boolean }) {
  // Bereken een simpele vergelijking
  const vergelijking = getVergelijking(ind);

  return (
    <div style={{
      padding: '8px 0',
      borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.08)',
    }}>
      {/* Naam + gewicht */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
        <span style={{ fontSize: '12px', fontWeight: 500 }}>{ind.naam}</span>
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>
          telt {Math.round(ind.gewicht * 100)}% mee
        </span>
      </div>

      {/* Waarde + vergelijking */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600 }}>
          {formatWaarde(ind)}
        </span>
        {ind.gemiddelde > 0 && (
          <span style={{
            fontSize: '11px',
            color: vergelijking.kleur,
            fontWeight: 500,
          }}>
            {vergelijking.tekst}
          </span>
        )}
      </div>

      {/* Toelichting */}
      {ind.toelichting && (
        <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px', lineHeight: 1.4 }}>
          {ind.toelichting}
        </p>
      )}
    </div>
  );
}

function formatWaarde(ind: IndicatorDetail): string {
  if (ind.eenheid === '€') return `\u20AC${ind.waarde.toLocaleString('nl-NL')}`;
  if (ind.eenheid === '%') return `${ind.waarde}%`;
  if (ind.eenheid === 'entropy') return `${ind.waarde}`;
  if (ind.eenheid === 'van 3' || ind.eenheid === 'van 9') return `${ind.waarde} ${ind.eenheid}`;
  if (ind.eenheid === 'm²') return `${ind.waarde} m\u00B2`;
  if (ind.eenheid) return `${ind.waarde} ${ind.eenheid}`;
  return `${ind.waarde}`;
}

function getVergelijking(ind: IndicatorDetail): { tekst: string; kleur: string } {
  if (ind.gemiddelde <= 0) return { tekst: '', kleur: '#9ca3af' };

  // Bereken verschil als percentage
  const verschil = ((ind.waarde - ind.gemiddelde) / ind.gemiddelde) * 100;
  const absVerschil = Math.abs(verschil);

  if (absVerschil < 5) {
    return { tekst: `(gemiddeld: ${formatGemiddelde(ind)})`, kleur: '#9ca3af' };
  }

  const richting = verschil > 0 ? 'hoger' : 'lager';
  const kleur = getVerschilKleur(ind, verschil);

  return {
    tekst: `${Math.round(absVerschil)}% ${richting} dan gem.`,
    kleur,
  };
}

function formatGemiddelde(ind: IndicatorDetail): string {
  if (ind.eenheid === '€') return `\u20AC${ind.gemiddelde.toLocaleString('nl-NL')}`;
  if (ind.eenheid === '%') return `${ind.gemiddelde}%`;
  return `${ind.gemiddelde}`;
}

function getVerschilKleur(ind: IndicatorDetail, verschil: number): string {
  // Voor indicatoren waar lager beter is (eenzaamheid, moeite rondkomen, etc.)
  const lagerIsBeter = ind.zScore < 0 ? verschil < 0 : verschil > 0;
  // Als z-score 0 is (entropy/custom berekeningen), gebruik afwijking van gemiddelde
  if (ind.zScore === 0) return '#9ca3af';

  return lagerIsBeter ? '#4ade80' : '#f87171';
}
