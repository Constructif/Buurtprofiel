import { useState, useEffect, useCallback } from 'react';
import { useGebiedStore } from '../../../store/gebiedStore';
import { fetchObservaties, deleteObservatie } from '../../../services/wijkronde';
import type { Wijkobservatie } from '../../../types/wijkronde';
import { CATEGORIE_KLEUREN } from '../../../types/wijkronde';
import { ObservatieMap } from './ObservatieMap';
import { ObservatieForm } from './ObservatieForm';

export function ObservatiesPanel() {
  const selectedGebied = useGebiedStore((s) => s.selectedGebied);
  const actieveRonde = useGebiedStore((s) => s.actieveRonde);

  const [observaties, setObservaties] = useState<Wijkobservatie[]>([]);
  const [loading, setLoading] = useState(false);
  const [formCoords, setFormCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [confirmDeleteObs, setConfirmDeleteObs] = useState<string | null>(null);
  const [deletingObs, setDeletingObs] = useState<string | null>(null);

  const loadObservaties = useCallback(async () => {
    if (!actieveRonde) return;
    setLoading(true);
    try {
      const data = await fetchObservaties(actieveRonde.id);
      setObservaties(data);
    } catch (error) {
      console.error('Fout bij laden observaties:', error);
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

  const handleDeleteObs = async (id: string) => {
    setDeletingObs(id);
    try {
      await deleteObservatie(id);
      setConfirmDeleteObs(null);
      loadObservaties();
    } catch (error) {
      console.error('Fout bij verwijderen observatie:', error);
    } finally {
      setDeletingObs(null);
    }
  };

  return (
    <div>
      {/* Kaart */}
      <ObservatieMap
        gebiedCode={selectedGebied.code}
        observaties={observaties}
        onMapClick={handleMapClick}
      />

      <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', margin: '8px 0 0' }}>
        Tik op de kaart om een observatie toe te voegen
      </p>

      {/* Observatie lijst */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>Laden...</p>
      ) : observaties.length > 0 ? (
        <div style={{ marginTop: '16px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1b', marginBottom: '8px' }}>
            Observaties ({observaties.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {observaties.map((obs) => (
              <div
                key={obs.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  alignItems: 'flex-start',
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
                {/* Verwijderknop */}
                <div style={{ flexShrink: 0 }}>
                  {confirmDeleteObs === obs.id ? (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleDeleteObs(obs.id)}
                        disabled={deletingObs === obs.id}
                        style={{
                          padding: '4px 8px', fontSize: '11px', fontWeight: 600,
                          border: 'none', borderRadius: '4px',
                          backgroundColor: '#c0392b', color: '#fff',
                          cursor: deletingObs === obs.id ? 'default' : 'pointer',
                        }}
                      >
                        {deletingObs === obs.id ? '...' : 'Ja'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteObs(null)}
                        style={{
                          padding: '4px 8px', fontSize: '11px',
                          border: '1px solid #d1d5db', borderRadius: '4px',
                          backgroundColor: '#fff', color: '#374151', cursor: 'pointer',
                        }}
                      >
                        Nee
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteObs(obs.id)}
                      style={{
                        padding: '4px 8px', fontSize: '11px',
                        border: '1px solid #e5c7c4', borderRadius: '4px',
                        backgroundColor: '#fff', color: '#c0392b', cursor: 'pointer',
                      }}
                    >
                      X
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: '20px', fontSize: '13px' }}>
          Nog geen observaties. Tik op de kaart om te beginnen.
        </p>
      )}

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
    </div>
  );
}
