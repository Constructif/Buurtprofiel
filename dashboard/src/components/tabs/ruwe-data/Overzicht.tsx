import { useState } from 'react';
import { useGebiedStore } from '../../../store/gebiedStore';
import { Card } from '../../ui/Card';
import { BuurtMap } from '../../maps/BuurtMap';
import {
  berekenLeefbaarheidScore,
  getClassificatie,
  getClassificatieKleur,
  type LeefbaarheidScore,
  type DimensieScore,
} from '../../../utils/leefbaarheid';

export function Overzicht() {
  const { gebiedData, selectedGebied, isLoadingData, getVoorzieningenCache } = useGebiedStore();
  const [expandedDimensies, setExpandedDimensies] = useState<Set<string>>(new Set());

  if (!selectedGebied) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>
        <p style={{ fontSize: '20px' }}>Selecteer een buurt, wijk of gemeente om te beginnen</p>
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid #eb6608', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#6b7280' }}>Data laden...</p>
      </div>
    );
  }

  if (!gebiedData) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>
        <p>Geen data beschikbaar voor dit gebied</p>
      </div>
    );
  }

  // Haal voorzieningen uit cache
  const voorzieningenCache = getVoorzieningenCache(selectedGebied.code);
  const aantalVoorzieningen = voorzieningenCache?.voorzieningen?.length ?? 0;

  // Bereken leefbaarheidsscore
  const leefbaarheid = berekenLeefbaarheidScore(gebiedData, aantalVoorzieningen);

  const toggleDimensie = (naam: string) => {
    const newSet = new Set(expandedDimensies);
    if (newSet.has(naam)) {
      newSet.delete(naam);
    } else {
      newSet.add(naam);
    }
    setExpandedDimensies(newSet);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Map + Score + Stats */}
      <section>
        <div className="overzicht-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px', alignItems: 'stretch' }}>
          {/* Kaart */}
          <div className="overzicht-map" style={{ borderRadius: '8px', overflow: 'hidden', height: '100%', minHeight: '400px' }}>
            <BuurtMap />
          </div>

          {/* Leefbaarheid Sectie */}
          <div className="overzicht-stats" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Hoofdscore Card */}
            <LeefbaarheidScoreCard leefbaarheid={leefbaarheid} />

            {/* Dimensie Cards */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0' }}>
              {Object.values(leefbaarheid.dimensies).map((dimensie) => (
                <DimensieCard
                  key={dimensie.naam}
                  dimensie={dimensie}
                  isExpanded={expandedDimensies.has(dimensie.naam)}
                  onToggle={() => toggleDimensie(dimensie.naam)}
                />
              ))}
            </div>

            {/* Loading indicator voor voorzieningen */}
            {!voorzieningenCache && (
              <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', padding: '8px' }}>
                Voorzieningen worden geladen...
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Trends - placeholder sectie */}
      <section>
        <Card title="Trends - Laatste 5 jaar" badge="placeholder">
          <div className="trends-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
            <TrendCard label="Bevolking" value="-" />
            <TrendCard label="Criminaliteit" value="-" />
            <TrendCard label="Groen" value="-" />
            <TrendCard label="Inkomen" value="-" />
            <TrendCard label="Voorzieningen" value="-" />
            <TrendCard label="Werkloosheid" value="-" />
          </div>
        </Card>
      </section>
    </div>
  );
}

// Leefbaarheid Hoofdscore Card
function LeefbaarheidScoreCard({ leefbaarheid }: { leefbaarheid: LeefbaarheidScore }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '8px',
      padding: '20px',
      textAlign: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      position: 'relative'
    }}>
      {/* Info icoon rechtsboven */}
      <div
        style={{ position: 'absolute', top: '12px', right: '12px' }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ cursor: 'help' }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        {showTooltip && (
          <div style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: '8px',
            padding: '12px',
            backgroundColor: '#1d1d1b',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            width: '260px',
            zIndex: 9999,
            textAlign: 'left'
          }}>
            <strong>Leefbaarometer 3.0</strong>
            <br /><br />
            De leefbaarheidsscore is gebaseerd op de officiële Leefbaarometer methodiek met 5 dimensies en Z-score normalisatie.
            <br /><br />
            <a href="https://www.leefbaarometer.nl" target="_blank" rel="noopener noreferrer" style={{ color: '#eb6608' }}>
              Meer informatie
            </a>
          </div>
        )}
      </div>

      <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        LEEFBAARHEID
      </p>

      <div style={{
        fontSize: '56px',
        fontWeight: 700,
        color: getClassificatieKleur(leefbaarheid.classificatie),
        lineHeight: 1
      }}>
        {leefbaarheid.totaalScore}
      </div>

      <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
        van 100
      </p>

      <p style={{
        marginTop: '8px',
        fontSize: '13px',
        fontWeight: 600,
        color: getClassificatieKleur(leefbaarheid.classificatie)
      }}>
        {leefbaarheid.classificatie}
      </p>

      <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '12px' }}>
        Gebaseerd op Leefbaarometer 3.0
      </p>
    </div>
  );
}

// Dimensie Card (inklapbaar)
function DimensieCard({
  dimensie,
  isExpanded,
  onToggle
}: {
  dimensie: DimensieScore;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);

  const dimensieBeschrijvingen: Record<string, string> = {
    'Veiligheid & Overlast': 'Gebaseerd op criminaliteitscijfers per 1.000 inwoners: totaal misdrijven, geweld, vermogen, vernieling en overlast.',
    'Voorzieningen': 'Aantal basisvoorzieningen (scholen, winkels, huisartsen, etc.) per 1.000 inwoners binnen het gebied.',
    'Woningvoorraad': 'Combinatie van eigendomsverdeling (koop vs. huur) en woningtypen (vrijstaand, 2-onder-1-kap, etc.).',
    'Sociale Cohesie': 'Gebaseerd op huishoudenssamenstelling: eenpersoonshuishoudens, gezinnen met kinderen en gemiddelde grootte.',
    'Fysieke Omgeving': 'Groenvoorzieningen, luchtkwaliteit en geluidsoverlast. Momenteel nog niet gemeten.',
  };

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderBottom: 'none',
      overflow: 'hidden'
    }}>
      {/* Header - altijd zichtbaar */}
      <div
        onClick={dimensie.isGemeten ? onToggle : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          cursor: dimensie.isGemeten ? 'pointer' : 'default',
          backgroundColor: !dimensie.isGemeten ? '#f9fafb' : 'white',
          opacity: !dimensie.isGemeten ? 0.7 : 1
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#1d1d1b' }}>
            {dimensie.naam}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>
            {Math.round(dimensie.gewicht * 100)}% gewicht
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {dimensie.isGemeten ? (
            <>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: getClassificatieKleur(dimensie.classificatie)
                }}>
                  {dimensie.score}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: getClassificatieKleur(dimensie.classificatie),
                  fontWeight: 500
                }}>
                  {dimensie.classificatie}
                </div>
              </div>

              {/* Info icoon */}
              <div
                style={{ position: 'relative' }}
                onMouseEnter={() => setShowInfoTooltip(true)}
                onMouseLeave={() => setShowInfoTooltip(false)}
                onClick={(e) => e.stopPropagation()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ cursor: 'help' }}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                {showInfoTooltip && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: '8px',
                    padding: '10px',
                    backgroundColor: '#1d1d1b',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '11px',
                    width: '240px',
                    zIndex: 9999
                  }}>
                    {dimensieBeschrijvingen[dimensie.naam] || ''}
                  </div>
                )}
              </div>

              {/* Chevron */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="2"
                style={{
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              >
                <polyline points="6,9 12,15 18,9" />
              </svg>
            </>
          ) : (
            <>
              <span style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
                NOG NIET GEMETEN
              </span>
              {/* Info icoon voor niet-gemeten dimensie */}
              <div
                style={{ position: 'relative' }}
                onMouseEnter={() => setShowInfoTooltip(true)}
                onMouseLeave={() => setShowInfoTooltip(false)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ cursor: 'help' }}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                {showInfoTooltip && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: '8px',
                    padding: '10px',
                    backgroundColor: '#1d1d1b',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '11px',
                    width: '240px',
                    zIndex: 9999
                  }}>
                    {dimensieBeschrijvingen[dimensie.naam] || ''}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Uitklapbare details */}
      {isExpanded && dimensie.isGemeten && dimensie.indicatoren.length > 0 && (
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#fafafa'
        }}>
          <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px', fontWeight: 500 }}>
            Gebruikte gegevens:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {dimensie.indicatoren.map((indicator, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#374151' }}>{indicator.naam}</span>
                <span style={{ fontWeight: 500, color: '#111827' }}>
                  {indicator.waarde}{indicator.eenheid ? ` ${indicator.eenheid}` : ''}
                </span>
              </div>
            ))}
          </div>

          {/* Berekende waarden sectie */}
          {dimensie.indicatoren.some(i => i.gemiddelde > 0) && (
            <>
              <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '12px', marginBottom: '8px', fontWeight: 500 }}>
                Berekende waarden:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {dimensie.indicatoren.filter(i => i.gemiddelde > 0).map((indicator, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: '#374151' }}>{indicator.naam}</span>
                      <span style={{ fontWeight: 500, color: getClassificatieKleur(getClassificatie(normalizeIndicatorScore(indicator.zScore))) }}>
                        {indicator.waarde}{indicator.eenheid ? ` ${indicator.eenheid}` : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280' }}>
                      <span>Nederlands gemiddelde</span>
                      <span>{indicator.gemiddelde}{indicator.eenheid ? ` ${indicator.eenheid}` : ''}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ color: '#6b7280' }}>Z-score</span>
                      <span style={{ color: indicator.zScore > 0 ? '#10b981' : indicator.zScore < 0 ? '#ef4444' : '#6b7280' }}>
                        {indicator.zScore > 0 ? '+' : ''}{indicator.zScore.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Hulpfunctie om Z-score naar 0-100 schaal te converteren (voor kleur bepaling)
function normalizeIndicatorScore(zScore: number): number {
  const normalized = ((zScore + 2) / 4) * 100;
  return Math.max(0, Math.min(100, normalized));
}

// Trend Card
function TrendCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f5f1ee' }}>
      <p style={{ fontSize: '13px', color: '#4b5563', marginBottom: '8px' }}>{label}</p>
      <p style={{ fontWeight: 600, fontSize: '18px', color: '#9ca3af' }}>{value}</p>
    </div>
  );
}
