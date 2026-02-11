import { useState, useEffect } from 'react';
import { useGebiedStore } from '../../../store/gebiedStore';
import { BuurtMap } from '../../maps/BuurtMap';
import {
  berekenBuurtprofielScore,
  getClassificatieKleur,
} from '../../../utils/scoring';
import { NL_BENCHMARKS, getGemeenteBenchmarks } from '../../../utils/benchmarks';
import { fetchZorgWelzijnData } from '../../../services/rivm';
import { fetchLeefomgevingData } from '../../../services/leefomgeving';
import type { ZorgWelzijnData } from '../../../types/zorgWelzijn';
import type { LeefomgevingData } from '../../../types/leefomgeving';
import type { BuurtprofielScore, TabScore } from '../../../types/scoring';

export function Overzicht() {
  const {
    gebiedData, selectedGebied, isLoadingData, getVoorzieningenCache,
    benchmarkType, setBenchmarkType, gemeenteData,
  } = useGebiedStore();

  const [zorgData, setZorgData] = useState<ZorgWelzijnData | null>(null);
  const [leefomgevingData, setLeefomgevingData] = useState<LeefomgevingData | null>(null);
  const [isLoadingExtra, setIsLoadingExtra] = useState(false);

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
          ),
        ]);
        setZorgData(zorg);
        setLeefomgevingData(leefomgeving);
      } catch (err) {
        console.error('Fout bij laden extra data:', err);
      } finally {
        setIsLoadingExtra(false);
      }
    };

    loadExtraData();
  }, [selectedGebied, gebiedData]);

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
  const voorzieningen = voorzieningenCache?.voorzieningen ?? [];

  // Bepaal benchmarks
  const isGemeente = selectedGebied.type === 'gemeente';
  const activeBenchmarkType = isGemeente ? 'nederland' : benchmarkType;
  const benchmarks = activeBenchmarkType === 'gemeente'
    ? getGemeenteBenchmarks(gebiedData, gemeenteData, zorgData, leefomgevingData)
    : NL_BENCHMARKS;

  // Bereken score
  const buurtprofiel = berekenBuurtprofielScore(
    gebiedData, voorzieningen, zorgData, leefomgevingData, benchmarks,
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Map + Score */}
      <section>
        <div className="overzicht-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '16px', alignItems: 'stretch' }}>
          {/* Kaart */}
          <div className="overzicht-map" style={{ borderRadius: '8px', overflow: 'hidden', height: '100%', minHeight: '400px' }}>
            <BuurtMap />
          </div>

          {/* Score Sectie */}
          <div className="overzicht-stats" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Benchmark Toggle */}
            {!isGemeente && (
              <BenchmarkToggle
                value={benchmarkType}
                onChange={setBenchmarkType}
                gemeenteNaam={gemeenteData?.naam || gebiedData.gemeenteNaam}
              />
            )}

            {/* Hoofdscore */}
            <HoofdscoreCard buurtprofiel={buurtprofiel} isLoadingExtra={isLoadingExtra} />

            {/* Dimensie Cards */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0' }}>
              {Object.values(buurtprofiel.tabs).map((tab) => (
                <DimensieCard key={tab.naam} tab={tab} />
              ))}
            </div>

            {/* Loading indicator */}
            {(isLoadingExtra || !voorzieningenCache) && (
              <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', padding: '8px' }}>
                {isLoadingExtra ? 'Zorg & Leefomgeving data laden...' : 'Voorzieningen worden geladen...'}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// --- Benchmark Toggle ---

function BenchmarkToggle({
  value,
  onChange,
  gemeenteNaam,
}: {
  value: 'nederland' | 'gemeente';
  onChange: (v: 'nederland' | 'gemeente') => void;
  gemeenteNaam?: string;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      backgroundColor: '#f3f4f6',
      borderRadius: '6px',
      padding: '3px',
      fontSize: '12px',
    }}>
      <button
        onClick={() => onChange('nederland')}
        style={{
          flex: 1,
          padding: '6px 12px',
          borderRadius: '4px',
          border: 'none',
          cursor: 'pointer',
          fontWeight: value === 'nederland' ? 600 : 400,
          backgroundColor: value === 'nederland' ? '#fff' : 'transparent',
          color: value === 'nederland' ? '#1d1d1b' : '#6b7280',
          boxShadow: value === 'nederland' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
        }}
      >
        Nederland
      </button>
      <button
        onClick={() => onChange('gemeente')}
        style={{
          flex: 1,
          padding: '6px 12px',
          borderRadius: '4px',
          border: 'none',
          cursor: 'pointer',
          fontWeight: value === 'gemeente' ? 600 : 400,
          backgroundColor: value === 'gemeente' ? '#fff' : 'transparent',
          color: value === 'gemeente' ? '#1d1d1b' : '#6b7280',
          boxShadow: value === 'gemeente' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
        }}
      >
        {gemeenteNaam || 'Gemeente'}
      </button>
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
  const kleur = getClassificatieKleur(buurtprofiel.classificatie);

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

function DimensieCard({ tab }: { tab: TabScore }) {
  const kleur = tab.isGemeten ? getClassificatieKleur(tab.classificatie) : '#9ca3af';

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
          {tab.isGemeenteData && <span style={{ fontStyle: 'italic', marginLeft: '4px' }}>(gem.)</span>}
          {tab.confidence !== 'high' && tab.isGemeten && (
            <span style={{ fontStyle: 'italic', marginLeft: '4px' }}>
              ({tab.confidence === 'medium' ? 'beperkt' : 'weinig data'})
            </span>
          )}
        </div>
      </div>

      {/* Rechts: score */}
      {tab.isGemeten ? (
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
