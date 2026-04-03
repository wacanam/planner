'use client';

import { useEffect, useRef } from 'react';

export interface TerritoryMapProps {
  /** Active territory boundary — highlighted in primary color */
  boundary?: string | null;
  /** All other congregation territory boundaries — shown as muted context layers */
  allBoundaries?: Array<{ id: string; name: string; boundary: string }>;
  /** Households with coordinates */
  households?: Array<{
    id: string;
    latitude?: string | null;
    longitude?: string | null;
    address: string;
    status: string;
  }>;
  /** Default center */
  center?: [number, number];
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: '#94a3b8',
  active: '#3b82f6',
  not_home: '#f59e0b',
  return_visit: '#a855f7',
  do_not_visit: '#ef4444',
  moved: '#9ca3af',
  inactive: '#9ca3af',
};

export default function TerritoryMap({
  boundary,
  allBoundaries = [],
  households = [],
  center,
  className = '',
}: TerritoryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once on mount
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    if (typeof window === 'undefined') return;

    // Dynamically import Leaflet (client-only)
    import('leaflet').then((L) => {
      // Fix default icon paths broken by webpack
      // @ts-expect-error — Leaflet internal
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Determine center
      let mapCenter: [number, number] = center ?? [0, 0];
      const zoom = 15;

      // Try to center on households if available
      const validHouseholds = households.filter((h) => h.latitude && h.longitude);
      if (validHouseholds.length > 0 && !center) {
        const lats = validHouseholds.map((h) => Number.parseFloat(h.latitude ?? '0'));
        const lngs = validHouseholds.map((h) => Number.parseFloat(h.longitude ?? '0'));
        mapCenter = [
          (Math.min(...lats) + Math.max(...lats)) / 2,
          (Math.min(...lngs) + Math.max(...lngs)) / 2,
        ];
      }

      const map = L.map(mapRef.current as HTMLElement, { zoomControl: true, scrollWheelZoom: false });
      mapInstanceRef.current = map;

      // OpenStreetMap tiles — no API key
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      map.setView(mapCenter, zoom);

      // Collect all bounds for fitting the map view
      const allLayers: ReturnType<typeof L.geoJSON>[] = [];

      // Draw other territory boundaries as muted context layers
      for (const tb of allBoundaries) {
        try {
          const geoJson = tb.boundary.startsWith('{') ? JSON.parse(tb.boundary) : null;
          if (geoJson) {
            const layer = L.geoJSON(geoJson, {
              style: { color: '#94a3b8', weight: 1.5, fillOpacity: 0.04, fillColor: '#94a3b8', dashArray: '4 4' },
            }).addTo(map);
            layer.bindTooltip(tb.name, { permanent: false, direction: 'center', className: 'text-xs' });
            allLayers.push(layer);
          }
        } catch { /* skip */ }
      }

      // Draw active territory as SPOTLIGHT — world mask with hole cut out
      // The territory interior is clear; everything outside is dimmed
      if (boundary) {
        try {
          const geoJson = boundary.startsWith('{') ? JSON.parse(boundary) : null;
          // innerCoords[0] is the outer ring of the territory polygon
          const outerRing = geoJson?.geometry?.coordinates?.[0];
          if (outerRing) {
            // Spotlight: world as outer ring [lng, lat], territory ring as hole
            // GeoJSON uses [lng, lat] order; outer ring = CCW, holes = CW
            const worldRing = [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]];
            // Territory outer ring is already CCW; reverse it to CW to act as a hole
            const holeRing = [...outerRing].reverse();
            const spotlightGeoJson = {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                // Outer = world (CCW), hole = territory (CW reversed to CCW hole)
                coordinates: [worldRing, holeRing],
              },
            };
            L.geoJSON(spotlightGeoJson as Parameters<typeof L.geoJSON>[0], {
              style: {
                color: '#6B9ECC',
                weight: 2,
                fillColor: '#64748b',
                fillOpacity: 0.35,
                stroke: true,
              },
            }).addTo(map);

            // Also draw the territory border cleanly on top
            const borderLayer = L.geoJSON(geoJson, {
              style: { color: '#6B9ECC', weight: 2.5, fillOpacity: 0, stroke: true },
            }).addTo(map);
            allLayers.push(borderLayer);
          }
        } catch { /* skip */ }
      }

      // Fit map to ALL polygons so user sees the full context
      if (allLayers.length > 0) {
        const group = L.featureGroup(allLayers);
        map.fitBounds(group.getBounds(), { padding: [24, 24] });
      }

      // Plot household markers
      for (const h of validHouseholds) {
        const lat = Number.parseFloat(h.latitude ?? '0');
        const lng = Number.parseFloat(h.longitude ?? '0');
        const color = STATUS_COLORS[h.status] ?? '#94a3b8';

        const icon = L.divIcon({
          html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>`,
          className: '',
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });

        L.marker([lat, lng], { icon })
          .bindPopup(
            `<strong>${h.address}</strong><br/><span style="font-size:11px;text-transform:capitalize">${h.status.replace(/_/g, ' ')}</span>`
          )
          .addTo(map);
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  return (
    <div className={`relative ${className}`}>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div ref={mapRef} className="w-full h-full rounded-2xl overflow-hidden" />

      {/* Placeholder overlay when no boundary yet */}
      {!boundary && households.filter((h) => h.latitude && h.longitude).length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/60 rounded-2xl text-center p-4 pointer-events-none">
          <p className="text-xs font-medium text-muted-foreground">Map coming soon</p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            Add household coordinates to see markers
          </p>
        </div>
      )}
    </div>
  );
}
