import { useState, useEffect, useCallback } from 'react';
import { useGebiedStore } from '../../../store/gebiedStore';
import { fetchObservaties } from '../../../services/wijkronde';
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
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

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

  const handleGpsLocatie = () => {
    if (!navigator.geolocation) {
      setGpsError('Locatie wordt niet ondersteund door deze browser');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      (err) => {
        const messages: Record<number, string> = {
          1: 'Locatietoegang geweigerd. Klik op de kaart om een locatie te kiezen.',
          2: 'Locatie niet beschikbaar. Klik op de kaart.',
          3: 'Locatieverzoek verlopen. Klik op de kaart.',
        };
        setGpsError(messages[err.code] || 'Locatie niet beschikbaar');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const handleMapClick = (lat: number, lng: number) => {
    setFormCoords({ lat, lng });
    setGpsError(null);
  };

  const handleFormSaved = () => {
    setFormCoords(null);
    loadObservaties();
  };

  return (
    <div>
      {/* Kaart */}
      <ObservatieMap
        gebiedCode={selectedGebied.code}
        observaties={observaties}
        onMapClick={handleMapClick}
      />

      {/* Acties (alleen bij actieve ronde) */}
      {(
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={handleGpsLocatie}
            disabled={gpsLoading}
            style={{
              padding: '14px 20px',
              backgroundColor: '#eb6608',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: gpsLoading ? 'default' : 'pointer',
              minHeight: '48px',
              opacity: gpsLoading ? 0.7 : 1,
            }}
          >
            {gpsLoading ? 'Locatie ophalen...' : 'Observatie op mijn locatie'}
          </button>

          <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', margin: 0 }}>
            Of klik op de kaart om een locatie te kiezen
          </p>

          {gpsError && (
            <p style={{ fontSize: '13px', color: '#c0392b', textAlign: 'center', margin: 0 }}>
              {gpsError}
            </p>
          )}
        </div>
      )}

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
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: '20px', fontSize: '13px' }}>
          Nog geen observaties. {'Klik op de kaart of gebruik de knop hierboven.'}
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
