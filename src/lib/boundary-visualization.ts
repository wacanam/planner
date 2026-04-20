/**
 * Territory boundary visualization helpers
 * Displays saved boundaries on MapLibre GL maps
 */

import maplibregl from 'maplibre-gl';

export interface BoundaryLayer {
  id: string;
  name: string;
  boundary: string; // GeoJSON string
}

/**
 * Add a boundary layer to the map
 */
export function addBoundaryToMap(
  map: maplibregl.Map,
  boundary: string | null | undefined,
  layerId: string = 'territory-boundary',
  color: string = '#3b82f6',
  opacity: number = 0.3
): void {
  if (!boundary) return;

  try {
    const geojson = typeof boundary === 'string' ? JSON.parse(boundary) : boundary;

    // Add source
    if (!map.getSource(layerId)) {
      map.addSource(layerId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: geojson,
            },
          ],
        },
      });
    }

    // Add fill layer
    if (!map.getLayer(`${layerId}-fill`)) {
      map.addLayer({
        id: `${layerId}-fill`,
        type: 'fill',
        source: layerId,
        paint: {
          'fill-color': color,
          'fill-opacity': opacity,
        },
      });
    }

    // Add outline layer
    if (!map.getLayer(`${layerId}-outline`)) {
      map.addLayer({
        id: `${layerId}-outline`,
        type: 'line',
        source: layerId,
        paint: {
          'line-color': color,
          'line-width': 2,
          'line-opacity': 0.8,
        },
      });
    }
  } catch (err) {
    console.error('[addBoundaryToMap] Failed to add boundary:', err);
  }
}

/**
 * Remove a boundary layer from the map
 */
export function removeBoundaryFromMap(
  map: maplibregl.Map,
  layerId: string = 'territory-boundary'
): void {
  try {
    if (map.getLayer(`${layerId}-fill`)) {
      map.removeLayer(`${layerId}-fill`);
    }
    if (map.getLayer(`${layerId}-outline`)) {
      map.removeLayer(`${layerId}-outline`);
    }
    if (map.getSource(layerId)) {
      map.removeSource(layerId);
    }
  } catch (err) {
    console.error('[removeBoundaryFromMap] Failed to remove boundary:', err);
  }
}

/**
 * Update boundary on map (if already exists)
 */
export function updateBoundaryOnMap(
  map: maplibregl.Map,
  boundary: string | null | undefined,
  layerId: string = 'territory-boundary'
): void {
  removeBoundaryFromMap(map, layerId);
  addBoundaryToMap(map, boundary, layerId);
}

/**
 * Fit map to boundary bounds
 */
export function fitMapToBoundary(
  map: maplibregl.Map,
  boundary: string | null | undefined,
  padding: number = 100
): void {
  if (!boundary) return;

  try {
    const geojson = typeof boundary === 'string' ? JSON.parse(boundary) : boundary;
    let bounds = null;

    if (geojson.type === 'Polygon') {
      const coords = geojson.coordinates[0];
      bounds = getBounds(coords);
    } else if (geojson.type === 'MultiPolygon') {
      const allCoords = geojson.coordinates.flat();
      bounds = getBounds(allCoords);
    }

    if (bounds) {
      map.fitBounds(bounds, { padding });
    }
  } catch (err) {
    console.error('[fitMapToBoundary] Failed to fit bounds:', err);
  }
}

/**
 * Calculate bounding box from coordinates
 */
function getBounds(coords: [number, number][]): [[number, number], [number, number]] | null {
  if (coords.length === 0) return null;

  let minLng = coords[0][0];
  let minLat = coords[0][1];
  let maxLng = coords[0][0];
  let maxLat = coords[0][1];

  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }

  return [[minLng, minLat], [maxLng, maxLat]];
}
