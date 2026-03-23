import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchGeometry } from '../../../services/pdok';
import type { Wijkobservatie } from '../../../types/wijkronde';
import { CATEGORIE_KLEUREN } from '../../../types/wijkronde';

// Fit kaart op geometrie
function MapController({ geometry }: { geometry: GeoJSON.Feature | null }) {
  const map = useMap();
  const geoJsonRef = useRef<LeafletGeoJSON | null>(null);

  useEffect(() => {
    if (geometry && geoJsonRef.current) {
      const bounds = geoJsonRef.current.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [geometry, map]);

  if (!geometry) return null;

  return (
    <GeoJSON
      ref={geoJsonRef}
      data={geometry}
      style={{
        color: '#f97316',
        weight: 3,
        fillColor: '#f97316',
        fillOpacity: 0.1,
      }}
    />
  );
}

// Klik-handler voor de kaart
function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface ObservatieMapProps {
  gebiedCode: string;
  observaties: Wijkobservatie[];
  onMapClick: (lat: number, lng: number) => void;
}

export function ObservatieMap({ gebiedCode, observaties, onMapClick }: ObservatieMapProps) {
  const [geometry, setGeometry] = useState<GeoJSON.Feature | null>(null);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);

  const loadGeo = useCallback(async () => {
    if (!gebiedCode) return;
    setLoading(true);
    try {
      const geo = await fetchGeometry(gebiedCode);
      setGeometry(geo);
    } catch (error) {
      console.error('Fout bij laden geometrie:', error);
    } finally {
      setLoading(false);
    }
  }, [gebiedCode]);

  useEffect(() => {
    loadGeo();
  }, [loadGeo]);

  return (
    <div style={{
      width: '100%',
      height: '400px',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #e5e7eb',
      position: 'relative',
    }}>
      {loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(255,255,255,0.8)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div className="animate-spin" style={{
            width: '32px',
            height: '32px',
            border: '4px solid #eb6608',
            borderTopColor: 'transparent',
            borderRadius: '50%',
          }} />
        </div>
      )}
      <MapContainer
        ref={mapRef}
        center={[52.1326, 5.2913]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController geometry={geometry} />
        <ClickHandler onMapClick={onMapClick} />

        {observaties.map((obs) => (
          <CircleMarker
            key={obs.id}
            center={[obs.lat, obs.lng]}
            radius={10}
            pathOptions={{
              color: CATEGORIE_KLEUREN[obs.categorie],
              fillColor: CATEGORIE_KLEUREN[obs.categorie],
              fillOpacity: 0.8,
              weight: 2,
            }}
          >
            <Popup>
              <div style={{ maxWidth: '220px' }}>
                <strong style={{ fontSize: '13px', color: CATEGORIE_KLEUREN[obs.categorie] }}>
                  {obs.categorie}
                </strong>
                {obs.foto_url && (
                  <img
                    src={obs.foto_url}
                    alt="Observatie"
                    style={{
                      width: '100%',
                      borderRadius: '6px',
                      marginTop: '6px',
                      maxHeight: '150px',
                      objectFit: 'cover',
                    }}
                  />
                )}
                {obs.opmerking && (
                  <p style={{ fontSize: '12px', color: '#374151', marginTop: '6px', marginBottom: 0 }}>
                    {obs.opmerking}
                  </p>
                )}
                <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', marginBottom: 0 }}>
                  {new Date(obs.created_at).toLocaleString('nl-NL')}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
