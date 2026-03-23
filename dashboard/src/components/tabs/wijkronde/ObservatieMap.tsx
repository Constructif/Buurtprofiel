import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchGeometry } from '../../../services/pdok';
import type { Wijkobservatie } from '../../../types/wijkronde';
import { CATEGORIE_KLEUREN, type ObservatieCategorie } from '../../../types/wijkronde';

// SVG pin icon factory
function createPinIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.27 21.73 0 14 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
    <circle cx="14" cy="14" r="6" fill="#fff"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -40],
  });
}

// Cache icons per category
const pinIcons: Record<string, L.DivIcon> = {};
function getPinIcon(categorie: ObservatieCategorie) {
  const color = CATEGORIE_KLEUREN[categorie];
  if (!pinIcons[color]) {
    pinIcons[color] = createPinIcon(color);
  }
  return pinIcons[color];
}

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
        color: '#eb6608',
        weight: 3,
        fillColor: '#eb6608',
        fillOpacity: 0.08,
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
      height: '55vh',
      minHeight: '350px',
      maxHeight: '600px',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #e5e7eb',
      position: 'relative',
    }}>
      {loading && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="animate-spin" style={{
            width: '32px', height: '32px',
            border: '4px solid #eb6608', borderTopColor: 'transparent', borderRadius: '50%',
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
          <Marker
            key={obs.id}
            position={[obs.lat, obs.lng]}
            icon={getPinIcon(obs.categorie)}
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
                      width: '100%', borderRadius: '6px',
                      marginTop: '6px', maxHeight: '150px', objectFit: 'cover',
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
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
