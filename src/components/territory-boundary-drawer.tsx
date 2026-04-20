'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { type GeoJSONGeometry, useTerritoryBoundary, validateGeoJSON } from '@/hooks/use-territory-boundary';
import { X, Trash2, Save, Undo2, CheckCircle2, Info } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TerritoryBoundaryDrawerProps {
  territoryId: string;
  initialCenter?: [number, number];
  initialZoom?: number;
  onClose: () => void;
  onBoundarySaved?: (boundary: GeoJSONGeometry) => void;
}

type LngLat = [number, number];
type Ring = LngLat[];

// ─── Constants ────────────────────────────────────────────────────────────────

const DBL_CLICK_MS = 300;
const MIN_RING_POINTS = 3;

const SRC = {
  polygons: 'boundary-polygons',
  active:   'boundary-active',
  points:   'boundary-points',
  preview:  'boundary-preview',
} as const;

const LAYER = {
  polygonsFill:    'boundary-polygons-fill',
  polygonsLine:    'boundary-polygons-line',
  activeLine:      'boundary-active-line',
  activeClosingLine: 'boundary-active-closing',
  points:          'boundary-points-circle',
  pointsFirst:     'boundary-points-first',
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ringsToFeatureCollection(rings: Ring[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: rings.map((ring) => ({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]]] },
      properties: {},
    })),
  };
}

function activeRingToFeatureCollection(ring: LngLat[]): GeoJSON.FeatureCollection {
  if (ring.length < 2) return { type: 'FeatureCollection', features: [] };
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: ring },
        properties: {},
      },
      // Closing line back to first point (preview)
      ...(ring.length >= 3 ? [{
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [ring[ring.length - 1], ring[0]],
        },
        properties: {},
      }] : []),
    ],
  };
}

function pointsToFeatureCollection(ring: LngLat[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: ring.map((pt, i) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: pt },
      properties: { index: i, isFirst: i === 0 },
    })),
  };
}

function ringsToGeoJSON(rings: Ring[]): GeoJSONGeometry {
  if (rings.length === 1) {
    return {
      type: 'Polygon',
      coordinates: [[...rings[0], rings[0][0]]],
    };
  }
  return {
    type: 'MultiPolygon',
    coordinates: rings.map((ring) => [[...ring, ring[0]]]),
  };
}

function setSource(map: maplibregl.Map, id: string, data: GeoJSON.FeatureCollection) {
  const src = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
  if (src) src.setData(data);
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Territory Boundary Drawer
 *
 * Full-screen overlay that renders a MapLibre map with interactive polygon
 * drawing. Designed to overlay the existing territory map without navigation.
 *
 * Interactions:
 *  - Click        → add point to current ring
 *  - Double-click → close and commit current ring (≥ 3 pts)
 *  - Escape       → cancel current ring
 *  - Z / Ctrl+Z   → undo last point
 *  - Enter        → commit ring if ≥ 3 pts
 */
export function TerritoryBoundaryDrawer({
  territoryId,
  initialCenter = [0, 0],
  initialZoom = 14,
  onClose,
  onBoundarySaved,
}: TerritoryBoundaryDrawerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);
  const lastClickRef = useRef<number>(0);

  const [rings, setRings]             = useState<Ring[]>([]);
  const [activeRing, setActiveRing]   = useState<LngLat[]>([]);
  const [mapReady, setMapReady]       = useState(false);
  const [isSaving, setIsSaving]       = useState(false);
  const [saved, setSaved]             = useState(false);
  const [notice, setNotice]           = useState<string | null>(null);

  const { boundary, isLoading, saveBoundary, fetchBoundary } = useTerritoryBoundary();

  // ── Map init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const m = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: initialCenter,
      zoom: initialZoom,
    });

    m.once('load', () => {
      // ── Sources ──────────────────────────────────────────────────────────
      m.addSource(SRC.polygons, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource(SRC.active,   { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource(SRC.points,   { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

      // ── Completed polygon layers ──────────────────────────────────────────
      m.addLayer({ id: LAYER.polygonsFill, type: 'fill', source: SRC.polygons,
        paint: { 'fill-color': '#10b981', 'fill-opacity': 0.25 } });
      m.addLayer({ id: LAYER.polygonsLine, type: 'line', source: SRC.polygons,
        paint: { 'line-color': '#059669', 'line-width': 2.5 } });

      // ── Active ring layer ─────────────────────────────────────────────────
      m.addLayer({ id: LAYER.activeLine, type: 'line', source: SRC.active,
        paint: { 'line-color': '#3b82f6', 'line-width': 2, 'line-dasharray': [2, 1] } });

      // ── Points layer ──────────────────────────────────────────────────────
      m.addLayer({ id: LAYER.points, type: 'circle', source: SRC.points,
        filter: ['==', ['get', 'isFirst'], false],
        paint: {
          'circle-radius': 5,
          'circle-color': '#3b82f6',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });
      // First point highlighted differently
      m.addLayer({ id: LAYER.pointsFirst, type: 'circle', source: SRC.points,
        filter: ['==', ['get', 'isFirst'], true],
        paint: {
          'circle-radius': 7,
          'circle-color': '#f59e0b',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });

      mapRef.current = m;
      setMapReady(true);
      fetchBoundary(territoryId);
    });

    return () => {
      m.remove();
      mapRef.current = null;
    };
  }, [territoryId, initialCenter, initialZoom, fetchBoundary]);

  // ── Load existing boundary into rings ────────────────────────────────────
  useEffect(() => {
    if (!boundary || !mapReady) return;
    try {
      const loaded: Ring[] = [];
      if (boundary.type === 'Polygon') {
        loaded.push(boundary.coordinates[0].slice(0, -1) as LngLat[]);
      } else if (boundary.type === 'MultiPolygon') {
        for (const poly of boundary.coordinates) {
          loaded.push((poly as number[][][])[0].slice(0, -1) as LngLat[]);
        }
      }
      if (loaded.length > 0) setRings(loaded);
    } catch {
      // ignore parse errors
    }
  }, [boundary, mapReady]);

  // ── Sync map sources ─────────────────────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;
    setSource(m, SRC.polygons, ringsToFeatureCollection(rings));
    setSource(m, SRC.active,   activeRingToFeatureCollection(activeRing));
    setSource(m, SRC.points,   pointsToFeatureCollection(activeRing));
  }, [rings, activeRing, mapReady]);

  // ── Map click handler ────────────────────────────────────────────────────
  const handleClick = useCallback((e: maplibregl.MapMouseEvent) => {
    const now = Date.now();
    const isDbl = now - lastClickRef.current < DBL_CLICK_MS;
    lastClickRef.current = now;

    const pt: LngLat = [e.lngLat.lng, e.lngLat.lat];

    if (isDbl) {
      // Commit ring on double-click
      setActiveRing((prev) => {
        const ring = [...prev, pt];
        if (ring.length < MIN_RING_POINTS) {
          setNotice(`Need at least ${MIN_RING_POINTS} points to close a polygon`);
          return prev;
        }
        setRings((r) => [...r, ring]);
        return [];
      });
    } else {
      setActiveRing((prev) => [...prev, pt]);
    }
  }, []);

  useEffect(() => {
    const m = mapRef.current;
    if (!m || !mapReady) return;
    m.on('click', handleClick);
    m.getCanvas().style.cursor = 'crosshair';
    return () => {
      m.off('click', handleClick);
      m.getCanvas().style.cursor = '';
    };
  }, [mapReady, handleClick]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveRing([]);
        setNotice(null);
      } else if (e.key === 'Enter') {
        setActiveRing((prev) => {
          if (prev.length < MIN_RING_POINTS) {
            setNotice(`Need at least ${MIN_RING_POINTS} points`);
            return prev;
          }
          setRings((r) => [...r, prev]);
          return [];
        });
      } else if (e.key === 'z' && (e.metaKey || e.ctrlKey || e.key === 'z')) {
        setActiveRing((prev) => prev.slice(0, -1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Auto-dismiss notice ────────────────────────────────────────────────────
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const undoPoint = () => setActiveRing((p) => p.slice(0, -1));
  const cancelRing = () => setActiveRing([]);
  const removeLastRing = () => setRings((p) => p.slice(0, -1));
  const clearAll = () => { setRings([]); setActiveRing([]); };

  const commitCurrentRing = () => {
    if (activeRing.length < MIN_RING_POINTS) {
      setNotice(`Need at least ${MIN_RING_POINTS} points to close a polygon`);
      return;
    }
    setRings((r) => [...r, activeRing]);
    setActiveRing([]);
  };

  const handleSave = async () => {
    if (rings.length === 0) {
      setNotice('Draw at least one polygon first');
      return;
    }
    setIsSaving(true);
    try {
      const geojson = ringsToGeoJSON(rings);
      await saveBoundary(territoryId, geojson);
      setSaved(true);
      onBoundarySaved?.(geojson);
      setTimeout(onClose, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotice(`Save failed: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const totalPoints = rings.reduce((n, r) => n + r.length, 0) + activeRing.length;
  const canSave     = rings.length > 0 && activeRing.length === 0;

  return (
    <div className="fixed inset-0 z-[2500] flex flex-col bg-black/10">
      {/* Map */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center gap-3 px-4 py-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Close without saving"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
            Draw Territory Boundary
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {activeRing.length > 0
              ? `${activeRing.length} pts — double-click or press Enter to close`
              : rings.length > 0
              ? `${rings.length} polygon${rings.length > 1 ? 's' : ''} · ${totalPoints} pts total`
              : 'Click on the map to start drawing'}
          </p>
        </div>

        {saved ? (
          <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Saved!
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>

      {/* Notice toast */}
      {notice && (
        <div className="relative z-10 mx-auto mt-3 max-w-sm px-4 py-2 bg-amber-50 dark:bg-amber-900/80 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-100 text-xs rounded-lg shadow-md flex items-center gap-2">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          {notice}
        </div>
      )}

      {/* Right-side floating controls (styled like map controls) */}
      <div className="absolute right-3 top-20 z-10 flex flex-col gap-1.5">
        {/* Undo point */}
        <button
          type="button"
          onClick={undoPoint}
          disabled={activeRing.length === 0}
          title="Undo last point (Ctrl+Z)"
          className="flex items-center justify-center w-9 h-9 bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        {/* Commit ring */}
        {activeRing.length >= MIN_RING_POINTS && (
          <button
            type="button"
            onClick={commitCurrentRing}
            title="Close polygon (Enter)"
            className="flex items-center justify-center w-9 h-9 bg-blue-600 text-white shadow rounded-lg hover:bg-blue-700 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
        )}

        {/* Cancel current ring */}
        {activeRing.length > 0 && (
          <button
            type="button"
            onClick={cancelRing}
            title="Cancel current ring (Esc)"
            className="flex items-center justify-center w-9 h-9 bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
        )}

        {/* Remove last polygon */}
        {rings.length > 0 && activeRing.length === 0 && (
          <button
            type="button"
            onClick={removeLastRing}
            title="Remove last polygon"
            className="flex items-center justify-center w-9 h-9 bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        )}
      </div>

      {/* Bottom instructions bar */}
      <div className="absolute bottom-0 inset-x-0 z-10">
        <div className="mx-auto max-w-md mb-4 px-4 py-2.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur rounded-xl shadow border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-400">
          <span>Click → add point</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span>Dbl-click → close ring</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span>Esc → cancel</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span>⌘Z → undo</span>
        </div>
      </div>
    </div>
  );
}
