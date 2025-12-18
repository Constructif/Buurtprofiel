import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import type { Map, GeoJSON as LeafletGeoJSON } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useGebiedStore } from '../../store/gebiedStore';
import { fetchGeometry } from '../../services/pdok';

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

  const getColor = () => {
    const code = (geometry.properties as Record<string, unknown>)?.statcode as string || '';
    if (code.startsWith('BU')) return '#f0a500';
    if (code.startsWith('WK')) return '#0066cc';
    return '#cc0066';
  };

  return (
    <GeoJSON
      ref={geoJsonRef}
      data={geometry}
      style={{
        color: getColor(),
        weight: 3,
        fillColor: getColor(),
        fillOpacity: 0.15,
      }}
    />
  );
}

export function BuurtMap() {
  const { selectedGebied } = useGebiedStore();
  const [geometry, setGeometry] = useState<GeoJSON.Feature | null>(null);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!selectedGebied) {
      setGeometry(null);
      return;
    }

    async function loadGeometry() {
      if (!selectedGebied) return;
      setLoading(true);
      try {
        const geo = await fetchGeometry(selectedGebied.code);
        setGeometry(geo);
      } catch (error) {
        console.error('Fout bij laden geometrie:', error);
      } finally {
        setLoading(false);
      }
    }

    loadGeometry();
  }, [selectedGebied]);

  return (
    <div className="h-full min-h-[400px] rounded-xl overflow-hidden border border-gray-200 relative">
      {loading && (
        <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}
      <MapContainer
        ref={mapRef}
        center={[52.1326, 5.2913]}
        zoom={7}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController geometry={geometry} />
      </MapContainer>
    </div>
  );
}
