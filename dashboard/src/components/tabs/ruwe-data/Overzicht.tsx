import { useState, useEffect, useRef, useMemo } from 'react';
import { SelectableWrapper } from '../../ui/SelectableCard';
import { useGebiedStore } from '../../../store/gebiedStore';
import { BuurtMap } from '../../maps/BuurtMap';
import {
  berekenBuurtprofielScore,
  getClassificatieKleur,
} from '../../../utils/scoring';
import { useActiveBenchmarks } from '../../../hooks/useActiveBenchmarks';
import { fetchZorgWelzijnData } from '../../../services/rivm';
import { fetchLeefomgevingData } from '../../../services/leefomgeving';
import type { ZorgWelzijnData } from '../../../types/zorgWelzijn';
import type { LeefomgevingData } from '../../../types/leefomgeving';
import type { BuurtprofielScore, TabScore } from '../../../types/scoring';
import { logger } from '../../../utils/logger';

export function Overzicht() {
  const {
    gebiedData, selectedGebied, isLoadingData, getVoorzieningenCache,
    selectedJaar,
  } = useGebiedStore();

  const [zorgData, setZorgData] = useState<ZorgWelzijnData | null>(null);
  const [leefomgevingData, setLeefomgevingData] = useState<LeefomgevingData | null>(null);
  const [isLoadingExtra, setIsLoadingExtra] = useState(false);

  // Actieve benchmarks: schakelt mee met de Nederland/gemeente-toggle.
  const { set: benchmarks } = useActiveBenchmarks(zorgData, leefomgevingData);

  // Fetch zorg & leefomgeving data voor scoreberekening
  useEffect(() => {
    if (!selectedGebied || !gebiedData) {
      setZorgData(null);
      setLeefomgevingData(null);
      return;
    }

    const loadExtraData = async () => {
      setIsLoadingExtra(true);
      try {
        const [zorg, leefomgeving] = await Promise.all([
          fetchZorgWelzijnData(
            selectedGebied.code,
            selectedGebied.wijkCode,
            selectedGebied.gemeenteCode,
            selectedGebied.naam,
            selectedGebied.wijkNaam,
            selectedGebied.gemeenteNaam,
            selectedJaar,
          ),
          fetchLeefomgevingData(
            selectedGebied.code,
            selectedGebied.type,
            selectedGebied.naam,
            gebiedData.bevolking.totaal,
            selectedGebied.wijkCode,
            selectedGebied.wijkNaam,
            selectedGebied.gemeenteCode,
            selectedGebied.gemeenteNaam,
            selectedJaar,
          ),
        ]);
        setZorgData(zorg);
        setLeefomgevingData(leefomgeving);
      } catch (err) {
        logger.error('Fout bij laden extra data:', err);
      } finally {
        setIsLoadingExtra(false);
      }
    };

    loadExtraData();
  }, [selectedGebied, gebiedData, selectedJaar]);

  // Haal voorzieningen uit cache
  const voorzieningenCache = selectedGebied ? getVoorzieningenCache(selectedGebied.code) : null;
  const voorzieningen = voorzieningenCache?.voorzieningen ?? [];

  // De actieve vergelijking (nederland of gemeente) bepaalt de fallback-waarschuwing per dimensie.
  const activeBenchmarkType = benchmarks.type;

  // Bereken score (gememoized — herberekent alleen bij gewijzigde inputs)
  const buurtprofiel = useMemo(
    () => gebiedData ? berekenBuurtprofielScore(gebiedData, voorzieningen, zorgData, leefomgevingData, benchmarks) : null,
    [gebiedData, voorzieningen, zorgData, leefomgevingData, benchmarks],
  );

  // Early returns NA alle hooks — voorkomt "Rendered more hooks" error
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

  if (!gebiedData || !buurtprofiel) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>
        <p>Geen data beschikbaar voor dit gebied</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Map + Score */}
      <section>
        <div className="overzicht-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '16px', alignItems: 'stretch' }}>
          {/* Kaart */}
          <SelectableWrapper sectionId="overzicht-kaart" style={{ borderRadius: '8px', overflow: 'hidden', height: '100%', minHeight: '400px' }}>
            <BuurtMap />
          </SelectableWrapper>

          {/* Score Sectie */}
          <SelectableWrapper sectionId="overzicht-score" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Hoofdscore */}
            <HoofdscoreCard buurtprofiel={buurtprofiel} isLoadingExtra={isLoadingExtra} />

            {/* Dimensie Cards */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0' }}>
              {Object.values(buurtprofiel.tabs).map((tab) => (
                <DimensieCard
                  key={tab.naam}
                  tab={tab}
                  benchmarkType={activeBenchmarkType}
                  // Voorzieningen worden async op de achtergrond geladen; tot de cache
                  // er is, is een 'weinig data'-score nog niet definitief maar nog ladend.
                  isLoading={tab.naam === 'Voorzieningen' && !voorzieningenCache}
                />
              ))}
            </div>

            {/* Loading indicator */}
            {(isLoadingExtra || !voorzieningenCache) && (
              <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', padding: '8px' }}>
                {isLoadingExtra ? 'Zorg & Leefomgeving data laden...' : 'Voorzieningen worden geladen...'}
              </div>
            )}
          </SelectableWrapper>
        </div>
      </section>
    </div>
  );
}

// --- Hoofdscore Card ---

function HoofdscoreCard({
  buurtprofiel,
  isLoadingExtra,
}: {
  buurtprofiel: BuurtprofielScore;
  isLoadingExtra: boolean;
}) {
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);
  const kleur = getClassificatieKleur(buurtprofiel.classificatie);

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

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '8px',
      padding: '20px',
      textAlign: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        BUURTPROFIEL
      </p>

      <div style={{ fontSize: '56px', fontWeight: 700, color: kleur, lineHeight: 1 }}>
        {buurtprofiel.totaalCijfer.toFixed(1)}
      </div>

      <p style={{ fontSize: '13px', fontWeight: 600, color: kleur, marginTop: '8px' }}>
        {buurtprofiel.classificatie}
      </p>

      <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>
        t.o.v. {buurtprofiel.benchmarkNaam}
      </p>

      {/* Info icon */}
      <div ref={infoRef} style={{ position: 'relative', display: 'inline-block', marginTop: '8px' }}>
        <button
          onClick={() => setShowInfo(!showInfo)}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            border: '1.5px solid #d1d5db',
            backgroundColor: showInfo ? '#f3f4f6' : 'transparent',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
          title="Hoe is dit cijfer opgebouwd?"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </button>

        {showInfo && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            padding: '14px 16px',
            backgroundColor: '#1d1d1b',
            color: 'white',
            borderRadius: '8px',
            fontSize: '12px',
            lineHeight: 1.5,
            width: '280px',
            zIndex: 100,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            textAlign: 'left',
          }}>
            <div style={{
              position: 'absolute',
              top: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '6px solid #1d1d1b',
            }} />
            <p style={{ fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>
              Hoe werkt het Buurtprofiel cijfer?
            </p>
            <p style={{ fontSize: '11px', color: '#d1d5db', marginBottom: '8px' }}>
              Dit cijfer is samengesteld uit {buurtprofiel.aantalGemetenTabs} thema's: veiligheid, gezondheid, inkomen, wonen, voorzieningen, groen en bewoners.
            </p>
            <p style={{ fontSize: '11px', color: '#d1d5db', marginBottom: '8px' }}>
              Elk thema wordt vergeleken met het gemiddelde. Een score van 6,0 betekent precies gemiddeld.
            </p>
            <p style={{ fontSize: '11px', color: '#9ca3af' }}>
              Klik op een tab voor de details per thema.
            </p>
          </div>
        )}
      </div>

      {/* Datakwaliteit */}
      <div style={{
        marginTop: '12px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        backgroundColor: buurtprofiel.datakwaliteit === 'volledig' ? '#f0fdf4'
          : buurtprofiel.datakwaliteit === 'gedeeltelijk' ? '#fffbeb'
          : '#fef2f2',
        borderRadius: '12px',
        fontSize: '11px',
        color: buurtprofiel.datakwaliteit === 'volledig' ? '#16a34a'
          : buurtprofiel.datakwaliteit === 'gedeeltelijk' ? '#ca8a04'
          : '#dc2626',
      }}>
        <span>{buurtprofiel.aantalGemetenTabs} van 7 tabs</span>
        {isLoadingExtra && <span style={{ fontStyle: 'italic' }}>(laden...)</span>}
      </div>
    </div>
  );
}

// --- Dimensie Card ---

function DimensieCard({ tab, benchmarkType, isLoading = false }: { tab: TabScore; benchmarkType: 'nederland' | 'gemeente'; isLoading?: boolean }) {
  const kleur = tab.isGemeten ? getClassificatieKleur(tab.classificatie) : '#9ca3af';

  // Toon of data werkelijk gemeente-specifiek is, of terugvalt op NL
  const showFallbackWarning = benchmarkType === 'gemeente' && tab.isGemeenteData;

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderBottom: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 16px',
      opacity: tab.isGemeten ? 1 : 0.6,
    }}>
      {/* Links: naam + gewicht */}
      <div>
        <div style={{ fontWeight: 600, fontSize: '13px', color: '#1d1d1b' }}>
          {tab.naam}
        </div>
        <div style={{ fontSize: '11px', color: '#6b7280' }}>
          {Math.round(tab.gewicht * 100)}% gewicht
          {showFallbackWarning && (
            <span style={{ fontStyle: 'italic', marginLeft: '4px', color: '#d97706' }} title="Data deels op gemeenteniveau, niet buurt-specifiek">
              (gem. data)
            </span>
          )}
          {isLoading ? (
            <span style={{ fontStyle: 'italic', marginLeft: '4px' }}>
              (laden…)
            </span>
          ) : (
            tab.confidence !== 'high' && tab.isGemeten && (
              <span style={{ fontStyle: 'italic', marginLeft: '4px' }}>
                ({tab.confidence === 'medium' ? 'beperkt' : 'weinig data'})
              </span>
            )
          )}
        </div>
      </div>

      {/* Rechts: score */}
      {isLoading ? (
        <span style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
          laden…
        </span>
      ) : tab.isGemeten ? (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: kleur }}>
            {tab.score.toFixed(1)}
          </div>
          <div style={{ fontSize: '10px', color: kleur, fontWeight: 500 }}>
            {tab.classificatie}
          </div>
        </div>
      ) : (
        <span style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
          GEEN DATA
        </span>
      )}
    </div>
  );
}
