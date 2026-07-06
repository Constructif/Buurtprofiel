import { useState, useEffect, useCallback } from 'react';
import { useGebiedStore } from '../../../store/gebiedStore';
import { fetchObservaties, getFotoSignedUrl, updateRondeGebied } from '../../../services/wijkronde';
import type { Wijkobservatie } from '../../../types/wijkronde';
import { CATEGORIE_KLEUREN, parseFotoPaths } from '../../../types/wijkronde';
import { logger } from '../../../utils/logger';
import { ObservatieMap } from './ObservatieMap';
import { ObservatieForm } from './ObservatieForm';
import { ObservatieDetail } from './ObservatieDetail';

export function ObservatiesPanel() {
  const selectedGebied = useGebiedStore((s) => s.selectedGebied);
  const actieveRonde = useGebiedStore((s) => s.actieveRonde);
  const setActieveRonde = useGebiedStore((s) => s.setActieveRonde);
  const toonBuurtgrens = useGebiedStore((s) => s.toonBuurtgrens);
  const setToonBuurtgrens = useGebiedStore((s) => s.setToonBuurtgrens);

  const [observaties, setObservaties] = useState<Wijkobservatie[]>([]);
  const [loading, setLoading] = useState(false);
  const [formCoords, setFormCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedObs, setSelectedObs] = useState<Wijkobservatie | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Gebied afbakenen (tekenmodus)
  const [tekenModus, setTekenModus] = useState(false);
  const [conceptPunten, setConceptPunten] = useState<[number, number][]>([]);
  const [gebiedOpslaan, setGebiedOpslaan] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadObservaties = useCallback(async () => {
    if (!actieveRonde) return;
    setLoading(true);
    try {
      const data = await fetchObservaties(actieveRonde.id);

      // Genereer signed URL voor eerste foto als thumbnail
      await Promise.all(data.map(async (obs) => {
        const paths = parseFotoPaths(obs.foto_path);
        if (paths.length > 0) {
          obs.foto_url = await getFotoSignedUrl(paths[0]);
        }
      }));

      setObservaties(data);
    } catch (error) {
      logger.error('Fout bij laden observaties:', error);
    } finally {
      setLoading(false);
    }
  }, [actieveRonde]);

  useEffect(() => {
    loadObservaties();
  }, [loadObservaties]);

  if (!selectedGebied || !actieveRonde) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
        {!selectedGebied
          ? 'Selecteer eerst een buurt om observaties te bekijken.'
          : 'Selecteer of start een ronde om observaties toe te voegen.'}
      </div>
    );
  }

  const handleMapClick = (lat: number, lng: number) => {
    setFormCoords({ lat, lng });
  };

  const handleFormSaved = () => {
    setFormCoords(null);
    loadObservaties();
  };

  // ── Gebied afbakenen ──────────────────────────────────
  const startTekenen = () => {
    setConceptPunten(actieveRonde.gebied_polygon?.punten ?? []);
    setTekenModus(true);
  };

  const annuleerTekenen = () => {
    setTekenModus(false);
    setConceptPunten([]);
  };

  const puntToevoegen = (lat: number, lng: number) => {
    setConceptPunten((p) => [...p, [lat, lng]]);
  };

  const laatstePuntVerwijderen = () => {
    setConceptPunten((p) => p.slice(0, -1));
  };

  const gebiedOpslaanHandler = async () => {
    setGebiedOpslaan(true);
    try {
      const gebied = conceptPunten.length >= 3 ? { punten: conceptPunten } : null;
      const ronde = await updateRondeGebied(actieveRonde.id, gebied);
      setActieveRonde(ronde);
      setTekenModus(false);
      setConceptPunten([]);
    } catch (error) {
      logger.error('Fout bij opslaan gebied:', error);
    } finally {
      setGebiedOpslaan(false);
    }
  };

  const gebiedWissen = async () => {
    setGebiedOpslaan(true);
    try {
      const ronde = await updateRondeGebied(actieveRonde.id, null);
      setActieveRonde(ronde);
      setConceptPunten([]);
      setTekenModus(false);
    } catch (error) {
      logger.error('Fout bij wissen gebied:', error);
    } finally {
      setGebiedOpslaan(false);
    }
  };

  return (
    <div style={{
      display: isMobile ? 'block' : 'grid',
      gridTemplateColumns: isMobile ? undefined : 'minmax(0, 1fr) 360px',
      gap: isMobile ? undefined : '20px',
      alignItems: 'start',
    }}>
      {/* Kaart-kolom */}
      <div>
        {/* Werkbalk boven de kaart */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}>
          {!tekenModus ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={startTekenen}
                title="Gebied afbakenen"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  backgroundColor: actieveRonde.gebied_polygon ? '#eff6ff' : '#fff',
                  border: `1px solid ${actieveRonde.gebied_polygon ? '#2563eb' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: actieveRonde.gebied_polygon ? '#2563eb' : '#374151',
                }}
              >
                {/* Potlood-icoon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
                {actieveRonde.gebied_polygon ? 'Gebied bewerken' : 'Gebied afbakenen'}
              </button>

              <button
                onClick={() => setToonBuurtgrens(!toonBuurtgrens)}
                title={toonBuurtgrens ? 'Buurt selectie verbergen' : 'Buurt selectie tonen'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#374151',
                }}
              >
                {/* Oog-icoon (open of doorgestreept) */}
                {toonBuurtgrens ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
                {toonBuurtgrens ? 'Buurt selectie verbergen' : 'Buurt selectie tonen'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={gebiedOpslaanHandler}
                disabled={conceptPunten.length < 3 || gebiedOpslaan}
                style={{
                  padding: '8px 12px',
                  backgroundColor: conceptPunten.length >= 3 ? '#2563eb' : '#cbd5e1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: conceptPunten.length >= 3 && !gebiedOpslaan ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {gebiedOpslaan ? 'Opslaan…' : 'Klaar'}
              </button>
              <button
                onClick={laatstePuntVerwijderen}
                disabled={conceptPunten.length === 0 || gebiedOpslaan}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: conceptPunten.length > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  color: '#374151',
                }}
              >
                Laatste punt
              </button>
              <button
                onClick={annuleerTekenen}
                disabled={gebiedOpslaan}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#374151',
                }}
              >
                Annuleren
              </button>
              {actieveRonde.gebied_polygon && (
                <button
                  onClick={gebiedWissen}
                  disabled={gebiedOpslaan}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#fff',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#dc2626',
                  }}
                >
                  Gebied wissen
                </button>
              )}
            </div>
          )}
        </div>

        <ObservatieMap
          gebiedCode={selectedGebied.code}
          observaties={observaties}
          onMapClick={handleMapClick}
          onObservatieClick={setSelectedObs}
          tekenModus={tekenModus}
          gebiedPunten={conceptPunten}
          onPuntToegevoegd={puntToevoegen}
          opgeslagenGebied={actieveRonde.gebied_polygon}
          toonBuurtgrens={toonBuurtgrens}
        />

        <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', margin: '8px 0 0' }}>
          {tekenModus
            ? 'Tik op de kaart om punten te plaatsen die het gebied afbakenen (minimaal 3).'
            : 'Tik op de kaart om een observatie toe te voegen'}
        </p>
      </div>

      {/* Observatie lijst — op desktop sticky rechterkolom */}
      <div>
      {loading ? (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>Laden...</p>
      ) : observaties.length > 0 ? (
        <div style={{
          marginTop: isMobile ? '16px' : 0,
          position: isMobile ? 'static' : 'sticky',
          top: isMobile ? undefined : '16px',
          maxHeight: isMobile ? undefined : 'calc(100vh - 160px)',
          overflowY: isMobile ? undefined : 'auto',
        }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1b', marginBottom: '8px' }}>
            Observaties ({observaties.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {observaties.map((obs) => (
              <button
                key={obs.id}
                onClick={() => setSelectedObs(obs)}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                {obs.foto_url && (
                  <img
                    src={obs.foto_url}
                    alt=""
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '6px',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: CATEGORIE_KLEUREN[obs.categorie],
                    display: 'inline-block',
                    padding: '2px 8px',
                    backgroundColor: `${CATEGORIE_KLEUREN[obs.categorie]}15`,
                    borderRadius: '4px',
                    marginBottom: '4px',
                  }}>
                    {obs.categorie}
                  </span>
                  {obs.opmerking && (
                    <p style={{ fontSize: '13px', color: '#374151', margin: '4px 0 0' }}>
                      {obs.opmerking}
                    </p>
                  )}
                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0' }}>
                    {new Date(obs.created_at).toLocaleString('nl-NL')}
                  </p>
                </div>
                {/* Pijltje rechts */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ flexShrink: 0, alignSelf: 'center' }}>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: '20px', fontSize: '13px' }}>
          Nog geen observaties. Tik op de kaart om te beginnen.
        </p>
      )}
      </div>

      {/* Formulier als bottom sheet */}
      {formCoords && (
        <ObservatieForm
          buurtcode={selectedGebied.code}
          rondeId={actieveRonde.id}
          lat={formCoords.lat}
          lng={formCoords.lng}
          onClose={() => setFormCoords(null)}
          onSaved={handleFormSaved}
        />
      )}

      {/* Detailscherm (weergave + bewerken) */}
      {selectedObs && (
        <ObservatieDetail
          observatie={selectedObs}
          onClose={() => setSelectedObs(null)}
          onUpdated={loadObservaties}
        />
      )}
    </div>
  );
}
