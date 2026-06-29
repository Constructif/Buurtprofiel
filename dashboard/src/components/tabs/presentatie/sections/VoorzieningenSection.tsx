import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet';
import type { Map, GeoJSON as LeafletGeoJSON } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useGebiedStore } from '../../../../store/gebiedStore';
import { fetchGeometry } from '../../../../services/pdok';
import {
  getTypeLabel, getTypeColor, groupVoorzieningenByType, type Voorziening, type VoorzieningType,
} from '../../../../services/overpass';
import { logger } from '../../../../utils/logger';

// Fix Leaflet default icons
// @ts-expect-error - Leaflet internal
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createMarkerIcon(type: VoorzieningType): L.DivIcon {
  const color = getTypeColor(type);
  const emojis: Record<VoorzieningType, string> = {
    basisschool: '🏫', middelbare_school: '🎓', kinderdagverblijf: '👶',
    supermarkt: '🛒', huisarts: '⚕️', religieus_centrum: '⛪',
    sportvereniging: '⚽', speelterrein: '🏃', wijkcentrum: '🏛️',
  };
  return L.divIcon({
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:12px">${emojis[type]}</div>`,
    className: 'custom-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

function MapBoundsController({ geometry }: { geometry: GeoJSON.Feature | null }) {
  const map = useMap();
  const geoRef = useRef<LeafletGeoJSON | null>(null);

  // Fit kaart zodra geometry of ref beschikbaar is
  useEffect(() => {
    if (!geometry) return;
    // Geef Leaflet een tick om de GeoJSON laag te initialiseren
    const t = setTimeout(() => {
      if (geoRef.current) {
        const bounds = geoRef.current.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } else {
        // Fallback: bereken bounds direct uit geometry zonder ref
        const bounds = L.geoJSON(geometry).getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    }, 50);
    return () => clearTimeout(t);
  }, [geometry, map]);

  if (!geometry) return null;
  const props = geometry.properties as Record<string, unknown>;
  const code = (props?.statcode || props?.buurtcode || props?.wijkcode || props?.gemeentecode || props?.code || '') as string;
  const color = code.startsWith('BU') ? '#f97316' : code.startsWith('WK') ? '#3b82f6' : '#8b5cf6';
  return (
    <GeoJSON
      key={code || JSON.stringify(geometry).slice(0, 40)}
      ref={geoRef}
      data={geometry}
      style={{ color, weight: 3, fillColor: color, fillOpacity: 0.15 }}
    />
  );
}

export function VoorzieningenSection({ sectionId }: { sectionId: string }) {
  const { selectedGebied, getVoorzieningenCache, waitForVoorzieningen } = useGebiedStore();
  const [geometry, setGeometry] = useState<GeoJSON.Feature | null>(null);
  const [voorzieningen, setVoorzieningen] = useState<Voorziening[]>([]);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!selectedGebied) { setGeometry(null); setVoorzieningen([]); return; }
    let cancelled = false;
    setLoading(true);
    const cached = getVoorzieningenCache(selectedGebied.code);
    if (cached) {
      setGeometry(cached.geometry);
      setVoorzieningen(cached.voorzieningen);
      setLoading(false);
      return;
    }
    waitForVoorzieningen(selectedGebied.code).then(result => {
      if (cancelled) return;
      if (result) { setGeometry(result.geometry); setVoorzieningen(result.voorzieningen); }
    }).catch(e => logger.error('voorzieningen fetch', e)).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedGebied, getVoorzieningenCache, waitForVoorzieningen]);

  if (sectionId === 'voorzieningen-kaart') {
    return (
      <div style={{ width: '100%', height: '100%', minHeight: '400px', position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid #eb6608', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        )}
        <MapContainer
          ref={mapRef}
          center={[52.1326, 5.2913]}
          zoom={7}
          style={{ width: '100%', height: '100%', minHeight: '400px' }}
          scrollWheelZoom={true}
        >
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapBoundsController geometry={geometry} />
          {voorzieningen.map(v => (
            typeof v.lat === 'number' && typeof v.lon === 'number' ? (
              <Marker key={v.id} position={[v.lat, v.lon]} icon={createMarkerIcon(v.type)}>
                <Popup>
                  <div style={{ minWidth: '160px' }}>
                    <div style={{ fontWeight: 700, color: getTypeColor(v.type), marginBottom: '2px', fontSize: '12px' }}>{getTypeLabel(v.type)}</div>
                    <div style={{ fontSize: '13px' }}>{v.name}</div>
                  </div>
                </Popup>
              </Marker>
            ) : null
          ))}
        </MapContainer>
      </div>
    );
  }

  if (sectionId === 'voorzieningen-lijst') {
    const grouped = groupVoorzieningenByType(voorzieningen);
    return (
      <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px', color: '#1d1d1b' }}>Voorzieningen</h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>Laden...</div>
        ) : Object.keys(grouped).length > 0 ? (
          Object.entries(grouped).map(([type, items]) => (
            <div key={type} style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: getTypeColor(type as VoorzieningType), textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                {getTypeLabel(type as VoorzieningType)} ({items.length})
              </div>
              {items.slice(0, 4).map(v => (
                <div key={v.id} style={{ fontSize: '12px', color: '#374151', padding: '3px 0', borderBottom: '1px solid #f3f4f6' }}>{v.name}</div>
              ))}
              {items.length > 4 && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>+{items.length - 4} meer</div>}
            </div>
          ))
        ) : <div style={{ color: '#9ca3af', fontSize: '13px' }}>Geen voorzieningen gevonden</div>}
      </div>
    );
  }

  return null;
}

export function OverzichtKaartSection() {
  const { selectedGebied } = useGebiedStore();
  const [geometry, setGeometry] = useState<GeoJSON.Feature | null>(null);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!selectedGebied) { setGeometry(null); return; }
    let cancelled = false;
    setLoading(true);
    fetchGeometry(selectedGebied.code)
      .then(geo => { if (!cancelled) setGeometry(geo); })
      .catch(e => logger.error('geometry fetch', e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedGebied]);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '400px', position: 'relative' }}>
      {loading && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #eb6608', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      )}
      <MapContainer
        ref={mapRef}
        center={[52.1326, 5.2913]}
        zoom={7}
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
        scrollWheelZoom={true}
      >
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapBoundsController geometry={geometry} />
      </MapContainer>
    </div>
  );
}
