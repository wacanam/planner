'use client';

import {
  Check,
  ChevronLeft,
  Download,
  FileDown,
  FileText,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Printer,
  QrCode,
  RotateCw,
  X,
} from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { exportCardToPdf, exportElementToPng } from '@/lib/territory-card-export';
import { calculateTerritoryCoverage } from '@/lib/territory-coverage';
import type { Congregation, Household, Territory } from '@/types/api';
import { getTerritoryBoundaries } from './StudioGoogleMap';
import type { CardDimensionSettings } from './StudioSidebar';
import { toast } from 'sonner';

export interface StudioPrintModalProps {
  open: boolean;
  onClose: () => void;
  onBackToViewport: () => void;
  territory: Territory | null;
  congregation: Congregation | null;
  households: Household[];
  cardSettings: CardDimensionSettings;
  onChangeCardSettings: (settings: CardDimensionSettings) => void;
}

function TerritoryCardVectorMap({
  territory,
  households,
}: {
  territory: Territory | null;
  households: Household[];
}) {
  const boundaries = getTerritoryBoundaries(territory);
  const roads = territory?.annotations?.roads || [];
  const landmarks = territory?.annotations?.landmarks || [];
  const startFlag = territory?.annotations?.startFlag;

  const bounds = useMemo(() => {
    let minLat = 90;
    let maxLat = -90;
    let minLng = 180;
    let maxLng = -180;
    let count = 0;

    boundaries.forEach((b) =>
      b.points.forEach((p) => {
        minLat = Math.min(minLat, p.lat);
        maxLat = Math.max(maxLat, p.lat);
        minLng = Math.min(minLng, p.lng);
        maxLng = Math.max(maxLng, p.lng);
        count++;
      })
    );

    households.forEach((h) => {
      const lat = typeof h.latitude === 'number' ? h.latitude : parseFloat(String(h.latitude || ''));
      const lng = typeof h.longitude === 'number' ? h.longitude : parseFloat(String(h.longitude || ''));
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat !== 0 && lng !== 0) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        count++;
      }
    });

    if (count === 0) {
      return { minLat: 8.35, maxLat: 8.38, minLng: 124.85, maxLng: 124.88 };
    }

    const latSpan = Math.max(0.0015, maxLat - minLat);
    const lngSpan = Math.max(0.0015, maxLng - minLng);
    const padLat = latSpan * 0.14;
    const padLng = lngSpan * 0.14;

    return {
      minLat: minLat - padLat,
      maxLat: maxLat + padLat,
      minLng: minLng - padLng,
      maxLng: maxLng + padLng,
    };
  }, [boundaries, households]);

  const svgW = 500;
  const svgH = 340;

  const mapToSvg = (lat: number, lng: number) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * svgW;
    const y = svgH - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * svgH;
    return { x: Math.max(10, Math.min(svgW - 10, x)), y: Math.max(10, Math.min(svgH - 10, y)) };
  };

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full h-full bg-slate-50 rounded-lg overflow-hidden border border-slate-300"
    >
      <defs>
        <pattern id="card-map-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#E2E8F0" strokeWidth="0.75" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#card-map-grid)" />

      {/* Boundaries */}
      {boundaries.map((b) => {
        const pts = b.points
          .map((p) => {
            const { x, y } = mapToSvg(p.lat, p.lng);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(' ');
        return (
          <g key={b.id}>
            <polygon
              points={pts}
              fill="#3B82F6"
              fillOpacity="0.12"
              stroke="#2563EB"
              strokeWidth="2.5"
              strokeDasharray="6,3"
            />
          </g>
        );
      })}

      {/* Roads */}
      {roads.map((r) => {
        if (!r.points || r.points.length < 2) return null;
        const pts = r.points
          .map((p) => {
            const { x, y } = mapToSvg(p.lat, p.lng);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(' ');
        return (
          <g key={r.id}>
            <polyline
              points={pts}
              fill="none"
              stroke="#334155"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={pts}
              fill="none"
              stroke="#FEF9C3"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      })}

      {/* Landmarks */}
      {landmarks.map((lm) => {
        if (typeof lm.lat !== 'number' || typeof lm.lng !== 'number') return null;
        const { x, y } = mapToSvg(lm.lat, lm.lng);
        return (
          <g key={lm.id} transform={`translate(${x}, ${y})`}>
            <circle r="6" fill="#8B5CF6" stroke="#FFFFFF" strokeWidth="1.5" />
            {lm.label && (
              <text
                x="9"
                y="3"
                fontSize="8"
                fontWeight="700"
                fill="#4C1D95"
                paintOrder="stroke fill"
                stroke="#FFFFFF"
                strokeWidth="2"
              >
                {lm.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Household Pins */}
      {households.map((h) => {
        const lat = typeof h.latitude === 'number' ? h.latitude : parseFloat(String(h.latitude || ''));
        const lng = typeof h.longitude === 'number' ? h.longitude : parseFloat(String(h.longitude || ''));
        if (Number.isNaN(lat) || Number.isNaN(lng) || lat === 0 || lng === 0) return null;
        const { x, y } = mapToSvg(lat, lng);
        const pinColor =
          h.status === 'active'
            ? '#16A34A'
            : h.status === 'return_visit'
              ? '#2563EB'
              : h.status === 'not_home'
                ? '#D97706'
                : h.status === 'do_not_visit'
                  ? '#DC2626'
                  : '#64748B';
        return (
          <g key={h.id} transform={`translate(${x}, ${y})`}>
            <circle r="4.5" fill={pinColor} stroke="#FFFFFF" strokeWidth="1.5" />
          </g>
        );
      })}

      {/* Start Flag */}
      {startFlag && typeof startFlag.lat === 'number' && typeof startFlag.lng === 'number' && (
        <g
          transform={`translate(${mapToSvg(startFlag.lat, startFlag.lng).x}, ${mapToSvg(startFlag.lat, startFlag.lng).y})`}
        >
          <circle r="6" fill="#059669" stroke="#FFFFFF" strokeWidth="2" />
          <path d="M 0 -4 L 4 -2 L 0 0 Z" fill="#FFFFFF" />
        </g>
      )}

      {/* North Arrow */}
      <g transform="translate(24, 28)">
        <circle r="12" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
        <path d="M 0 -8 L 3 3 L -3 3 Z" fill="#DC2626" />
        <path d="M 0 8 L 3 3 L -3 3 Z" fill="#64748B" />
        <text x="0" y="-9" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#DC2626">
          N
        </text>
      </g>
    </svg>
  );
}

export function StudioPrintModal({
  open,
  onClose,
  onBackToViewport,
  territory,
  congregation,
  households,
  cardSettings,
  onChangeCardSettings,
}: StudioPrintModalProps) {
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const previewCardRef = useRef<HTMLDivElement>(null);
  const hiddenFrontRef = useRef<HTMLDivElement>(null);
  const hiddenBackRef = useRef<HTMLDivElement>(null);

  const coverageStats = useMemo(() => calculateTerritoryCoverage(households), [households]);

  // Group households by street name for street directory on back
  const streetsSummary = useMemo(() => {
    const map = new Map<string, Household[]>();
    for (const h of households) {
      const street =
        h.streetName || h.address.split(',')[0]?.replace(/^\d+\s*/, '') || 'Unspecified Street';
      if (!map.has(street)) {
        map.set(street, []);
      }
      map.get(street)!.push(h);
    }
    return Array.from(map.entries()).map(([street, list]) => ({
      street,
      count: list.length,
      houseNumbers: list
        .map((item) => item.houseNumber || item.address.match(/^\d+/)?.[0])
        .filter(Boolean)
        .slice(0, 8)
        .join(', '),
    }));
  }, [households]);

  const { widthInches, heightInches, orientation, side } = cardSettings;
  const isLandscape = orientation === 'landscape';
  const effectiveW = isLandscape ? Math.max(widthInches, heightInches) : Math.min(widthInches, heightInches);
  const effectiveH = isLandscape ? Math.min(widthInches, heightInches) : Math.max(widthInches, heightInches);

  const territoryFilePrefix = `Territory-${territory?.number ? territory.number.padStart(2, '0') : 'Card'}`;

  const handleDownloadPng = async () => {
    if (!previewCardRef.current) return;
    setIsExportingPng(true);
    try {
      const filename = `${territoryFilePrefix}-${activeSide === 'front' ? 'Front' : 'Back'}.png`;
      await exportElementToPng(previewCardRef.current, filename);
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to export PNG. Please try again.');
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const filename = `${territoryFilePrefix}-PrintCard.pdf`;
      await exportCardToPdf({
        frontElement: hiddenFrontRef.current || previewCardRef.current,
        backElement: hiddenBackRef.current || previewCardRef.current,
        filename,
        widthInches: effectiveW,
        heightInches: effectiveH,
        orientation,
        side,
      });
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to export PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderFrontCard = () => (
    <div className="h-full flex flex-col p-4 bg-white text-slate-900 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2 mb-2 shrink-0">
        <div>
          <span className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase">
            {congregation?.name || 'CONGREGATION TERRITORY'}
          </span>
          <h2 className="text-base font-black tracking-tight text-slate-950 leading-tight">
            TERRITORY #{territory?.number || ''}
          </h2>
          <p className="text-[11px] font-semibold text-slate-700">
            {territory?.name || 'Downtown Territory'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <Badge variant="outline" className="text-[10px] font-bold border-slate-400 text-slate-800 uppercase">
            {territory?.city || congregation?.city || 'Local Area'}
          </Badge>
          <p className="text-[10px] font-bold text-slate-600 mt-1">
            {coverageStats.totalDoors} Doors ({coverageStats.coveragePercent}% worked)
          </p>
        </div>
      </div>

      {/* Vector Territory Map Canvas */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden">
        <TerritoryCardVectorMap territory={territory} households={households} />
      </div>

      {/* Front Footer */}
      <div className="pt-2 border-t border-slate-200 mt-2 flex items-center justify-between text-[9px] text-slate-500 shrink-0 font-medium">
        <span>Please do not mark directly on this card.</span>
        <span>Return promptly when territory is covered.</span>
      </div>
    </div>
  );

  const renderBackCard = () => (
    <div className="h-full flex flex-col p-4 bg-white text-slate-900 select-none overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-slate-800 pb-1.5 mb-2 shrink-0">
        <div>
          <h2 className="text-sm font-black text-slate-950 uppercase">
            Territory #{territory?.number} Directory & Activity Record
          </h2>
          <p className="text-[10px] font-semibold text-slate-600">{territory?.name}</p>
        </div>
        {cardSettings.showQrCode && (
          <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 p-1 rounded-md border border-slate-200">
            <QrCode size={20} className="text-slate-800" />
            <span className="text-[8px] font-bold text-slate-600">Mobile Link</span>
          </div>
        )}
      </div>

      {/* Streets Summary */}
      {cardSettings.showStreetsList && streetsSummary.length > 0 && (
        <div className="mb-2 shrink-0">
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
            Streets & Doors
          </p>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            {streetsSummary.slice(0, 6).map((s) => (
              <div key={s.street} className="p-1 rounded bg-slate-50 border border-slate-200 flex justify-between">
                <span className="font-bold text-slate-800 truncate">{s.street}</span>
                <span className="text-slate-500 font-semibold shrink-0 ml-1">{s.count} doors</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Publisher Record Table (S-13 Format) */}
      {cardSettings.showNotesArea && (
        <div className="flex-1 min-h-0 flex flex-col">
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
            Publisher Working Record (S-13)
          </p>
          <div className="flex-1 border border-slate-300 rounded-md overflow-hidden text-[9px]">
            <div className="grid grid-cols-12 bg-slate-100 font-bold text-slate-700 py-1 px-1.5 border-b border-slate-300">
              <span className="col-span-3">Date</span>
              <span className="col-span-4">Publisher</span>
              <span className="col-span-5">Remarks</span>
            </div>
            <div className="divide-y divide-slate-200">
              {[1, 2, 3, 4, 5, 6].map((row) => (
                <div key={row} className="grid grid-cols-12 py-1 px-1.5 text-slate-400">
                  <span className="col-span-3">___/___</span>
                  <span className="col-span-4">________________</span>
                  <span className="col-span-5">________________</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Territory Notes */}
      {territory?.notes && (
        <div className="mt-2 p-1.5 bg-amber-50 rounded border border-amber-200 text-[9px] text-amber-900 shrink-0">
          <span className="font-bold">Territory Notes: </span>
          <span>{territory.notes}</span>
        </div>
      )}
    </div>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title={`Print & Download Territory Card — #${territory?.number ?? ''}`}
      description="Download as high-res PNG image, print-ready PDF, or open system print dialog."
      className="max-w-4xl max-h-[94vh] overflow-hidden flex flex-col p-0"
    >
      <div className="flex-1 min-h-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border overflow-hidden">
        {/* Left Side: Configuration & Export Actions */}
        <div className="w-full md:w-80 p-5 space-y-5 bg-muted/20 shrink-0 overflow-y-auto">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Card Configuration
            </h3>
            <p className="text-xs text-foreground font-semibold mt-1">
              {effectiveW}″ × {effectiveH}″ ({orientation})
            </p>
          </div>

          {/* Side Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Card Output</Label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/60 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  onChangeCardSettings({ ...cardSettings, side: 'front' });
                  setActiveSide('front');
                }}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  cardSettings.side === 'front'
                    ? 'bg-card text-primary shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Front
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeCardSettings({ ...cardSettings, side: 'back' });
                  setActiveSide('back');
                }}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  cardSettings.side === 'back'
                    ? 'bg-card text-primary shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => onChangeCardSettings({ ...cardSettings, side: 'both' })}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  cardSettings.side === 'both'
                    ? 'bg-card text-primary shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Both Sides
              </button>
            </div>
          </div>

          {/* Included Features */}
          <div className="space-y-2.5 pt-2 border-t border-border">
            <Label className="text-xs font-semibold">Included Elements</Label>
            <div className="space-y-2 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-muted-foreground">Publisher Working Record Table</span>
                <input
                  type="checkbox"
                  checked={cardSettings.showNotesArea}
                  onChange={(e) =>
                    onChangeCardSettings({ ...cardSettings, showNotesArea: e.target.checked })
                  }
                  className="h-4 w-4 rounded accent-primary"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-muted-foreground">Streets & Doors Directory</span>
                <input
                  type="checkbox"
                  checked={cardSettings.showStreetsList}
                  onChange={(e) =>
                    onChangeCardSettings({ ...cardSettings, showStreetsList: e.target.checked })
                  }
                  className="h-4 w-4 rounded accent-primary"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-muted-foreground">Digital Assignment QR Code</span>
                <input
                  type="checkbox"
                  checked={cardSettings.showQrCode}
                  onChange={(e) =>
                    onChangeCardSettings({ ...cardSettings, showQrCode: e.target.checked })
                  }
                  className="h-4 w-4 rounded accent-primary"
                />
              </label>
            </div>
          </div>

          {/* Download & Print Actions */}
          <div className="space-y-2 pt-4 border-t border-border">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadPng}
                disabled={isExportingPng}
                className="h-10 rounded-xl text-xs gap-1.5 font-bold shadow-xs hover:border-primary/50"
              >
                {isExportingPng ? (
                  <Loader2 size={14} className="animate-spin text-primary" />
                ) : (
                  <ImageIcon size={14} className="text-primary" />
                )}
                <span>Download .PNG</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="h-10 rounded-xl text-xs gap-1.5 font-bold shadow-xs hover:border-primary/50"
              >
                {isExportingPdf ? (
                  <Loader2 size={14} className="animate-spin text-primary" />
                ) : (
                  <FileDown size={14} className="text-primary" />
                )}
                <span>Download .PDF</span>
              </Button>
            </div>

            <Button
              type="button"
              onClick={handlePrint}
              className="w-full h-11 rounded-2xl gap-2 font-bold shadow-lg bg-primary text-primary-foreground mt-2"
            >
              <Printer size={16} />
              <span>Open System Print Dialog</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={onBackToViewport}
              className="w-full h-8 rounded-xl text-xs gap-1.5 font-semibold text-muted-foreground"
            >
              <ChevronLeft size={14} />
              <span>Adjust Viewport Framing</span>
            </Button>
          </div>
        </div>

        {/* Right Side: Interactive Live Card Preview */}
        <div className="flex-1 min-h-0 p-6 flex flex-col items-center justify-center bg-muted/40 overflow-y-auto">
          {/* Side Toggle for Preview */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              type="button"
              size="sm"
              variant={activeSide === 'front' ? 'default' : 'outline'}
              onClick={() => setActiveSide('front')}
              className="rounded-xl text-xs font-semibold h-8"
            >
              Preview Front (Map View)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeSide === 'back' ? 'default' : 'outline'}
              onClick={() => setActiveSide('back')}
              className="rounded-xl text-xs font-semibold h-8"
            >
              Preview Back (Directory & S-13)
            </Button>
          </div>

          {/* Physical Card Simulation Box (Target for screen & PNG download) */}
          <div
            ref={previewCardRef}
            className="w-full max-w-[480px] bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col transition-all"
            style={{
              aspectRatio: `${effectiveW} / ${effectiveH}`,
              maxHeight: '520px',
            }}
          >
            {activeSide === 'front' ? renderFrontCard() : renderBackCard()}
          </div>
        </div>
      </div>

      {/* Hidden Off-Screen Elements for PDF Generation of Both Sides */}
      <div
        style={{
          position: 'fixed',
          left: '-99999px',
          top: '-99999px',
          width: `${effectiveW * 120}px`,
          height: `${effectiveH * 120}px`,
          overflow: 'hidden',
          zIndex: -1,
        }}
      >
        <div ref={hiddenFrontRef} className="w-full h-full">
          {renderFrontCard()}
        </div>
        <div ref={hiddenBackRef} className="w-full h-full">
          {renderBackCard()}
        </div>
      </div>
    </ResponsiveDialog>
  );
}
