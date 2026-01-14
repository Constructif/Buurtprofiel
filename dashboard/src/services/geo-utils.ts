/**
 * Berekent de bounding box van een GeoJSON feature met 500m buffer
 */
export function calculateBBox(feature: GeoJSON.Feature): [number, number, number, number] {
  const coords = extractCoordinates(feature.geometry);

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  coords.forEach(([lon, lat]) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  });

  // Voeg 500m buffer toe aan alle kanten
  // 500m in graden: ~0.0045° latitude, ~0.006° longitude (voor Nederland op ~52° NB)
  const bufferLat = 0.0045;
  const bufferLon = 0.006;

  return [
    minLat - bufferLat,
    minLon - bufferLon,
    maxLat + bufferLat,
    maxLon + bufferLon
  ];
}

/**
 * Extraheert alle coördinaten uit een GeoJSON geometrie
 */
export function extractCoordinates(geometry: GeoJSON.Geometry): [number, number][] {
  const coords: [number, number][] = [];

  function extract(geom: GeoJSON.Geometry) {
    if (geom.type === 'Point') {
      coords.push(geom.coordinates as [number, number]);
    } else if (geom.type === 'LineString' || geom.type === 'MultiPoint') {
      coords.push(...(geom.coordinates as [number, number][]));
    } else if (geom.type === 'Polygon' || geom.type === 'MultiLineString') {
      (geom.coordinates as [number, number][][]).forEach((ring) => {
        coords.push(...ring);
      });
    } else if (geom.type === 'MultiPolygon') {
      (geom.coordinates as [number, number][][][]).forEach((polygon) => {
        polygon.forEach((ring) => {
          coords.push(...ring);
        });
      });
    } else if (geom.type === 'GeometryCollection') {
      geom.geometries.forEach(extract);
    }
  }

  extract(geometry);
  return coords;
}
