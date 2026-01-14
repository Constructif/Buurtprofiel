import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet';
import type { Map, GeoJSON as LeafletGeoJSON, DivIcon } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useGebiedStore } from '../../../store/gebiedStore';
import { fetchGeometry } from '../../../services/pdok';
import {
  fetchVoorzieningen,
  getTypeLabel,
  getTypeColor,
  groupVoorzieningenByType,
  type Voorziening,
  type VoorzieningType,
} from '../../../services/overpass';
import { calculateBBox } from '../../../services/geo-utils';
import { Card } from '../../ui/Card';

// Fix voor Leaflet default marker icons in Vite
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom marker iconen per type
function createMarkerIcon(type: VoorzieningType, isSelected: boolean = false): DivIcon {
  const color = getTypeColor(type);
  const size = isSelected ? 40 : 30;
  const border = isSelected ? '4px solid #22c55e' : '3px solid white';

  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background-color: ${color};
        border: ${border};
        box-shadow: 0 ${isSelected ? '4' : '2'}px ${isSelected ? '8' : '4'}px rgba(0,0,0,${isSelected ? '0.4' : '0.3'});
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${isSelected ? '18' : '14'}px;
        transition: all 0.2s;
      ">
        ${getTypeEmoji(type)}
      </div>
    `,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function getTypeEmoji(type: VoorzieningType): string {
  const emojis: Record<VoorzieningType, string> = {
    basisschool: '🏫',
    middelbare_school: '🎓',
    kinderdagverblijf: '👶',
    supermarkt: '🛒',
    huisarts: '⚕️',
    religieus_centrum: '⛪',
    sportvereniging: '⚽',
    speelterrein: '🏃',
    wijkcentrum: '🏛️',
  };

  return emojis[type];
}

interface MapControllerProps {
  geometry: GeoJSON.Feature | null;
  voorzieningen: Voorziening[];
  selectedVoorzieningId: string | null;
}

function MapController({ geometry, voorzieningen, selectedVoorzieningId }: MapControllerProps) {
  const map = useMap();
  const geoJsonRef = useRef<LeafletGeoJSON | null>(null);

  useEffect(() => {
    if (!geometry || !geoJsonRef.current) return;

    try {
      const bounds = geoJsonRef.current.getBounds();
      if (bounds && bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 15,
          animate: true,
          duration: 0.5
        });
      }
    } catch (error) {
      console.error('Fout bij fitBounds:', error);
    }
  }, [geometry, map]);

  if (!geometry || !geometry.properties) return null;

  const getColor = () => {
    const props = geometry.properties as Record<string, unknown>;
    const code = (props?.statcode || props?.buurtcode || props?.wijkcode || props?.gemeentecode || props?.code) as string || '';
    if (code.startsWith('BU')) return '#f97316'; // Buurt - oranje
    if (code.startsWith('WK')) return '#3b82f6'; // Wijk - blauw
    return '#8b5cf6'; // Gemeente - paars
  };

  const gebiedCode = (geometry.properties as Record<string, unknown>)?.statcode as string || '';

  return (
    <>
      <GeoJSON
        key={gebiedCode}
        ref={geoJsonRef}
        data={geometry}
        style={{
          color: getColor(),
          weight: 3,
          fillColor: getColor(),
          fillOpacity: 0.15,
        }}
      />
      {Array.isArray(voorzieningen) && voorzieningen.length > 0 && voorzieningen.map((v) => {
        // Valideer dat voorziening geldige coordinaten heeft
        if (!v || typeof v.lat !== 'number' || typeof v.lon !== 'number') return null;

        return (
          <Marker
            key={v.id}
            position={[v.lat, v.lon]}
            icon={createMarkerIcon(v.type, v.id === selectedVoorzieningId)}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: getTypeColor(v.type) }}>
                  {getTypeLabel(v.type)}
                </div>
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                  {v.name}
                </div>
                {v.tags?.['addr:street'] && (
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {v.tags['addr:street']} {v.tags['addr:housenumber']}
                    {v.tags['addr:postcode'] && `, ${v.tags['addr:postcode']}`}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export function Voorzieningen() {
  const { selectedGebied, getVoorzieningenCache, setVoorzieningenCache } = useGebiedStore();

  // Lazy initializer: check cache bij eerste mount
  const [geometry, setGeometry] = useState<GeoJSON.Feature | null>(() => {
    if (!selectedGebied) return null;
    const cached = getVoorzieningenCache(selectedGebied.code);
    return cached?.geometry ?? null;
  });
  const [voorzieningen, setVoorzieningen] = useState<Voorziening[]>(() => {
    if (!selectedGebied) return [];
    const cached = getVoorzieningenCache(selectedGebied.code);
    return cached?.voorzieningen ?? [];
  });
  const [loading, setLoading] = useState(() => {
    if (!selectedGebied) return false;
    const cached = getVoorzieningenCache(selectedGebied.code);
    return !cached;
  });
  const [selectedTypes, setSelectedTypes] = useState<Set<VoorzieningType>>(
    new Set([
      'basisschool',
      'middelbare_school',
      'kinderdagverblijf',
      'supermarkt',
      'huisarts',
      'religieus_centrum',
      'sportvereniging',
      'speelterrein',
      'wijkcentrum',
    ])
  );
  const [selectedVoorziening, setSelectedVoorziening] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const mapRef = useRef<Map | null>(null);

  // Track window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Reset alle state als er geen gebied geselecteerd is
    if (!selectedGebied) {
      setGeometry(null);
      setVoorzieningen([]);
      setSelectedVoorziening(null);
      setLoading(false);
      return;
    }

    let isCancelled = false;

    async function loadData() {
      if (!selectedGebied || isCancelled) return;

      // Reset selectie bij nieuw gebied
      setSelectedVoorziening(null);

      // Check cache EERST
      const cached = getVoorzieningenCache(selectedGebied.code);
      if (cached) {
        // Uit cache laden (instant)
        if (isCancelled) return;
        setGeometry(cached.geometry);
        setVoorzieningen(cached.voorzieningen);
        setLoading(false);
        return;
      }

      // Geen cache - reset en laad nieuwe data
      setGeometry(null);
      setVoorzieningen([]);
      setLoading(true);

      try {
        // Haal geometrie op
        const geo = await fetchGeometry(selectedGebied.code);

        // Check of component nog gemount is en gebied nog hetzelfde is
        if (isCancelled) return;

        setGeometry(geo);

        if (geo && geo.geometry) {
          // Bereken bounding box uit geometrie
          const bbox = calculateBBox(geo);

          // Haal voorzieningen op
          const voorzieningenData = await fetchVoorzieningen(bbox);

          // Check nogmaals of we niet gecancelled zijn
          if (isCancelled) return;

          setVoorzieningen(voorzieningenData);

          // Sla op in cache
          setVoorzieningenCache(selectedGebied.code, {
            geometry: geo,
            voorzieningen: voorzieningenData,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error('Fout bij laden voorzieningen:', error);
        if (!isCancelled) {
          setGeometry(null);
          setVoorzieningen([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    // Cleanup functie om race conditions te voorkomen
    return () => {
      isCancelled = true;
    };
  }, [selectedGebied, getVoorzieningenCache, setVoorzieningenCache]);

  const toggleType = (type: VoorzieningType) => {
    const newSet = new Set(selectedTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setSelectedTypes(newSet);
  };

  const handleVoorzieningClick = (voorziening: Voorziening) => {
    if (selectedVoorziening === voorziening.id) {
      setSelectedVoorziening(null);
    } else {
      setSelectedVoorziening(voorziening.id);
      if (mapRef.current) {
        mapRef.current.setView([voorziening.lat, voorziening.lon], 17, {
          animate: true,
          duration: 0.5
        });
      }
    }
  };

  const filteredVoorzieningen = Array.isArray(voorzieningen)
    ? voorzieningen.filter((v) => v && v.type && selectedTypes.has(v.type))
    : [];
  const grouped = groupVoorzieningenByType(filteredVoorzieningen);

  if (!selectedGebied) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>
          Selecteer een buurt, wijk of gemeente om voorzieningen te bekijken
        </p>
      </div>
    );
  }

  return (
    <div className="voorzieningen-layout" style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '240px 1fr 320px',
      gap: isMobile ? '12px' : '20px',
      alignItems: 'start'
    }}>
      {/* Filter Sidebar - Links */}
      <div className="voorzieningen-sidebar voorzieningen-filters" style={{
        position: isMobile ? 'static' : 'sticky',
        top: '16px',
        maxHeight: isMobile ? 'none' : 'calc(100vh - 240px)',
        overflowY: isMobile ? 'visible' : 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: isMobile ? 'row' : 'column',
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        gap: isMobile ? '8px' : '12px',
        paddingRight: isMobile ? '0' : '4px'
      }}>
        {/* Data bron Card */}
        <Card
          badge="data"
          badgeText="Overpass"
          badgeTooltip="Deze gegevens worden bijgehouden door de OSM community."
          title="OpenStreetMap"
          style={{
            display: isMobile ? 'none' : 'block'
          }}
        >
          <div></div>
        </Card>

        {/* Filter Items - Compact Cards */}
        {Object.entries(grouped).map(([type, items]) => (
            <div
              key={type}
              onClick={() => toggleType(type as VoorzieningType)}
              style={{
                cursor: 'pointer',
                opacity: selectedTypes.has(type as VoorzieningType) ? 1 : 0.4,
                padding: isMobile ? '8px 10px' : '10px',
                borderLeft: isMobile ? 'none' : `3px solid ${getTypeColor(type as VoorzieningType)}`,
                borderBottom: isMobile ? `3px solid ${getTypeColor(type as VoorzieningType)}` : 'none',
                transition: 'all 0.15s',
                backgroundColor: selectedTypes.has(type as VoorzieningType) ? 'white' : '#fafafa',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: isMobile ? '6px' : '8px',
                minHeight: isMobile ? '56px' : '44px',
                flex: isMobile ? '0 0 calc(50% - 4px)' : 'none',
                borderRadius: isMobile ? '6px' : '0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '6px', flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: isMobile ? '20px' : '14px', flexShrink: 0 }}>{getTypeEmoji(type as VoorzieningType)}</span>
                <span style={{
                  fontSize: isMobile ? '13px' : '11px',
                  color: '#4b5563',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: isMobile ? 'normal' : 'nowrap',
                  fontWeight: 500,
                  lineHeight: isMobile ? '1.2' : 'normal'
                }}>
                  {getTypeLabel(type as VoorzieningType)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '6px', flexShrink: 0, flexDirection: isMobile ? 'column' : 'row' }}>
                <span style={{
                  fontSize: isMobile ? '18px' : '16px',
                  fontWeight: 700,
                  color: '#1d1d1b',
                  minWidth: isMobile ? 'auto' : '24px',
                  textAlign: 'right'
                }}>
                  {items.length}
                </span>
                <input
                  type="checkbox"
                  checked={selectedTypes.has(type as VoorzieningType)}
                  onChange={() => toggleType(type as VoorzieningType)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: isMobile ? '18px' : '14px',
                    height: isMobile ? '18px' : '14px',
                    cursor: 'pointer',
                    accentColor: getTypeColor(type as VoorzieningType)
                  }}
                />
              </div>
            </div>
        ))}

        {/* Totaal Card */}
        <Card style={{
          padding: isMobile ? '12px' : '10px',
          backgroundColor: '#1d1d1b',
          flex: isMobile ? '0 0 100%' : 'none',
          borderRadius: isMobile ? '6px' : '0'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: isMobile ? '10px' : '9px',
              color: '#9ca3af',
              marginBottom: '3px',
              fontWeight: 600,
              letterSpacing: '0.5px'
            }}>
              TOTAAL ZICHTBAAR
            </div>
            <div style={{
              fontSize: isMobile ? '28px' : '24px',
              fontWeight: 700,
              color: 'white'
            }}>
              {filteredVoorzieningen.length}
            </div>
            <div style={{
              fontSize: isMobile ? '10px' : '9px',
              color: '#9ca3af',
              marginTop: '2px'
            }}>
              van {voorzieningen.length}
            </div>
          </div>
        </Card>
      </div>

      {/* Kaart - Midden (Sticky) */}
      <div className="voorzieningen-map" style={{
        position: isMobile ? 'static' : 'sticky',
        top: '16px',
        height: isMobile ? '400px' : 'calc(100vh - 240px)',
        minHeight: isMobile ? '400px' : '400px',
        borderRadius: isMobile ? '6px' : '8px',
        overflow: 'hidden',
        border: '1px solid #e5e7eb',
        touchAction: 'none'
      }}>
        {loading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '4px solid #eb6608',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        )}
        <MapContainer
          key={selectedGebied?.code || 'default'}
          ref={mapRef}
          center={[52.1326, 5.2913]}
          zoom={7}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController geometry={geometry} voorzieningen={filteredVoorzieningen} selectedVoorzieningId={selectedVoorziening} />
        </MapContainer>
      </div>

      {/* Details lijst - Rechts (Sticky) */}
      <div className="voorzieningen-details" style={{
        position: isMobile ? 'static' : 'sticky',
        top: '16px',
        height: isMobile ? 'auto' : 'calc(100vh - 240px)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {filteredVoorzieningen.length > 0 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: isMobile ? '6px' : '0',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb',
            height: isMobile ? 'auto' : '100%',
            maxHeight: isMobile ? '600px' : 'none',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Card header */}
            <div style={{
              padding: isMobile ? '12px 16px' : '14px 18px',
              borderBottom: '2px solid #eb6608',
              flexShrink: 0,
              backgroundColor: '#fafafa'
            }}>
              <h3 style={{
                fontSize: isMobile ? '16px' : '15px',
                fontWeight: 600,
                color: '#1d1d1b',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                margin: 0
              }}>
                Details
                <span style={{
                  fontSize: isMobile ? '12px' : '11px',
                  padding: isMobile ? '4px 10px' : '3px 8px',
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  borderRadius: isMobile ? '4px' : '0',
                  fontWeight: 500
                }}>
                  Overpass
                </span>
              </h3>
            </div>
            {/* Scrollable content */}
            <div style={{
              overflowY: 'auto',
              flex: 1,
              padding: isMobile ? '12px' : '16px'
            }}>
              {Object.entries(grouped).map(([type, items]) => {
                if (items.length === 0 || !selectedTypes.has(type as VoorzieningType)) return null;
                return (
                  <div key={type} style={{ marginBottom: isMobile ? '16px' : '20px' }}>
                    <h4 style={{
                      fontSize: isMobile ? '14px' : '13px',
                      fontWeight: 600,
                      color: getTypeColor(type as VoorzieningType),
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: isMobile ? '8px' : '6px',
                      position: 'sticky',
                      top: 0,
                      backgroundColor: 'white',
                      paddingTop: '8px',
                      paddingBottom: '4px',
                      zIndex: 1
                    }}>
                      <span style={{ fontSize: isMobile ? '18px' : '16px' }}>{getTypeEmoji(type as VoorzieningType)}</span>
                      {getTypeLabel(type as VoorzieningType)} ({items.length})
                    </h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {items.map((item) => (
                        <li
                          key={item.id}
                          onClick={() => handleVoorzieningClick(item)}
                          style={{
                            padding: isMobile ? '10px 12px' : '8px 10px',
                            backgroundColor: item.id === selectedVoorziening ? '#dcfce7' : '#f9fafb',
                            marginBottom: isMobile ? '6px' : '4px',
                            fontSize: isMobile ? '14px' : '13px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            borderLeft: item.id === selectedVoorziening ? '3px solid #22c55e' : '3px solid transparent',
                            borderRadius: isMobile ? '4px' : '0',
                            minHeight: isMobile ? '44px' : 'auto'
                          }}
                          onMouseEnter={(e) => {
                            if (item.id !== selectedVoorziening) {
                              e.currentTarget.style.backgroundColor = '#f3f4f6';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (item.id !== selectedVoorziening) {
                              e.currentTarget.style.backgroundColor = '#f9fafb';
                            }
                          }}
                        >
                          <div style={{ fontWeight: 500 }}>{item.name}</div>
                          {item.tags?.['addr:street'] && (
                            <div style={{
                              fontSize: isMobile ? '12px' : '11px',
                              color: '#6b7280',
                              marginTop: '2px',
                              lineHeight: '1.4'
                            }}>
                              {item.tags['addr:street']} {item.tags['addr:housenumber']}
                              {item.tags['addr:postcode'] && `, ${item.tags['addr:postcode']}`}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <Card title="Details" style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', height: '100%' }}>
            {loading ? 'Voorzieningen laden...' : 'Selecteer voorzieningen om details te zien'}
          </Card>
        )}
      </div>
    </div>
  );
}
