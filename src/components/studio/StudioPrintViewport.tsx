'use client';

import {
  Check,
  Compass,
  Download,
  Expand,
  FileDown,
  FileText,
  Image as ImageIcon,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  Move,
  Printer,
  QrCode,
  RotateCw,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { exportCardToPdf, exportElementToPng } from '@/lib/territory-card-export';
import { calculateTerritoryCoverage } from '@/lib/territory-coverage';
import type { Congregation, Household, Territory } from '@/types/api';
import { getTerritoryBoundaries } from './StudioGoogleMap';
import type { CardDimensionSettings } from './StudioSidebar';
import { toast } from 'sonner';

export interface StudioPrintViewportProps {
  active: boolean;
  onClose: () => void;
  cardSettings: CardDimensionSettings;
  onChangeCardSettings: (settings: CardDimensionSettings) => void;
  territory: Territory | null;
  congregation?: Congregation | null;
  households: Household[];
  onFitTerritoryToFrame: (padding: { top: number; right: number; bottom: number; left: number }) => void;
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
        <pattern id="card-map-grid-vp" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#E2E8F0" strokeWidth="0.75" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#card-map-grid-vp)" />

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

export function StudioPrintViewport({
  active,
  onClose,
  cardSettings,
  onChangeCardSettings,
  territory,
  congregation,
  households,
  onFitTerritoryToFrame,
}: StudioPrintViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 800 });
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const hiddenFrontRef = useRef<HTMLDivElement>(null);
  const hiddenBackRef = useRef<HTMLDivElement>(null);

  const coverageStats = useMemo(() => calculateTerritoryCoverage(households), [households]);

  // Group households by street name
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

  useEffect(() => {
    if (!active) return;
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth || window.innerWidth,
          height: containerRef.current.clientHeight || window.innerHeight,
        });
      } else {
        setContainerSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [active]);

  // Compute card dimensions and aspect ratio
  const { widthInches, heightInches, orientation, side } = cardSettings;
  const isLandscape = orientation === 'landscape';
  const effectiveW = isLandscape ? Math.max(widthInches, heightInches) : Math.min(widthInches, heightInches);
  const effectiveH = isLandscape ? Math.min(widthInches, heightInches) : Math.max(widthInches, heightInches);
  const aspectRatio = effectiveW / effectiveH;

  // Frame calculation within container
  const frameMetrics = useMemo(() => {
    const availW = containerSize.width;
    const availH = containerSize.height;

    // Leave margin for top toolbar and bottom controls
    const maxFrameW = Math.max(260, availW * 0.74);
    const maxFrameH = Math.max(220, (availH - 120) * 0.74);

    let frameW = maxFrameW;
    let frameH = frameW / aspectRatio;

    if (frameH > maxFrameH) {
      frameH = maxFrameH;
      frameW = frameH * aspectRatio;
    }

    const frameX = Math.round((availW - frameW) / 2);
    const frameY = Math.round((availH - frameH) / 2) + 16;

    const padding = {
      top: Math.max(30, frameY),
      bottom: Math.max(30, availH - (frameY + frameH)),
      left: Math.max(30, frameX),
      right: Math.max(30, availW - (frameX + frameW)),
    };

    return {
      frameW: Math.round(frameW),
      frameH: Math.round(frameH),
      frameX,
      frameY,
      padding,
    };
  }, [containerSize, aspectRatio]);

  if (!active) return null;

  const handleFitClick = () => {
    onFitTerritoryToFrame(frameMetrics.padding);
  };

  const handlePresetSelect = (preset: '4x6' | '5x7' | '8.5x11' | 'a5' | 'custom') => {
    if (preset === 'custom') {
      onChangeCardSettings({
        ...cardSettings,
        preset: 'custom',
      });
      return;
    }
    let w = 4;
    let h = 6;
    if (preset === '5x7') {
      w = 5;
      h = 7;
    } else if (preset === '8.5x11') {
      w = 8.5;
      h = 11;
    } else if (preset === 'a5') {
      w = 5.83;
      h = 8.27;
    }
    onChangeCardSettings({
      ...cardSettings,
      preset,
      widthInches: w,
      heightInches: h,
    });
  };

  const handleCustomWidthChange = (val: number) => {
    const w = Math.max(1.5, Math.min(30, val || 4));
    onChangeCardSettings({
      ...cardSettings,
      preset: 'custom',
      widthInches: w,
    });
  };

  const handleCustomHeightChange = (val: number) => {
    const h = Math.max(1.5, Math.min(30, val || 6));
    onChangeCardSettings({
      ...cardSettings,
      preset: 'custom',
      heightInches: h,
    });
  };

  const handleToggleOrientation = () => {
    onChangeCardSettings({
      ...cardSettings,
      orientation: orientation === 'portrait' ? 'landscape' : 'portrait',
    });
  };

  const handleSelectSide = (s: 'front' | 'back' | 'both') => {
    onChangeCardSettings({
      ...cardSettings,
      side: s,
    });
  };

  const territoryFilePrefix = `Territory-${territory?.number ? territory.number.padStart(2, '0') : 'Card'}`;

  const handleDownloadPng = async () => {
    setIsExportingPng(true);
    try {
      if (side === 'front' && hiddenFrontRef.current) {
        const filename = `${territoryFilePrefix}-Front.png`;
        await exportElementToPng(hiddenFrontRef.current, filename);
        toast.success(`Downloaded ${filename}`);
      } else if (side === 'back' && hiddenBackRef.current) {
        const filename = `${territoryFilePrefix}-Back.png`;
        await exportElementToPng(hiddenBackRef.current, filename);
        toast.success(`Downloaded ${filename}`);
      } else if (side === 'both') {
        if (hiddenFrontRef.current) {
          await exportElementToPng(hiddenFrontRef.current, `${territoryFilePrefix}-Front.png`);
        }
        if (hiddenBackRef.current) {
          await exportElementToPng(hiddenBackRef.current, `${territoryFilePrefix}-Back.png`);
        }
        toast.success(`Downloaded Front and Back PNG images`);
      }
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
        frontElement: hiddenFrontRef.current,
        backElement: hiddenBackRef.current,
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

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-30 pointer-events-none select-none overflow-hidden flex flex-col justify-between"
    >
      {/* SVG Vignette Mask with Transparent Cutout Window */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
        <defs>
          <mask id="studio-print-viewport-mask">
            {/* White background = fully opaque mask */}
            <rect width="100%" height="100%" fill="#FFFFFF" />
            {/* Black cutout = clear transparent window */}
            <rect
              x={frameMetrics.frameX}
              y={frameMetrics.frameY}
              width={frameMetrics.frameW}
              height={frameMetrics.frameH}
              rx="14"
              fill="#000000"
            />
          </mask>
        </defs>
        {/* Darkened semi-transparent vignette */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.62)"
          mask="url(#studio-print-viewport-mask)"
        />
      </svg>

      {/* Top Floating Viewport Control Bar */}
      <div className="relative z-10 p-3 flex flex-wrap items-center justify-between gap-2.5 pointer-events-auto max-w-6xl mx-auto w-full">
        {/* Left: Territory & Dimensions Pill */}
        <div className="flex items-center gap-2 bg-card/95 backdrop-blur-md border border-border/80 px-3.5 py-1.5 rounded-2xl shadow-xl">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Maximize2 size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">
                {territory ? `Territory #${territory.number}` : 'Print Viewport'}
              </span>
              <Badge variant="outline" className="text-[10px] font-semibold uppercase py-0 px-1.5">
                {effectiveW}″ × {effectiveH}″ ({orientation})
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Pan & zoom map to frame desired portion
            </p>
          </div>
        </div>

        {/* Center: Presets & Custom Dimensions */}
        <div className="flex items-center gap-1.5 bg-card/95 backdrop-blur-md border border-border/80 p-1.5 rounded-2xl shadow-xl">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => handlePresetSelect('4x6')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                cardSettings.preset === '4x6'
                  ? 'bg-card text-primary shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              4″ × 6″
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('5x7')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                cardSettings.preset === '5x7'
                  ? 'bg-card text-primary shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              5″ × 7″
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('8.5x11')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                cardSettings.preset === '8.5x11'
                  ? 'bg-card text-primary shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Letter
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('a5')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                cardSettings.preset === 'a5'
                  ? 'bg-card text-primary shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              A5
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('custom')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                cardSettings.preset === 'custom'
                  ? 'bg-card text-primary shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom Dimension Number Inputs */}
          {cardSettings.preset === 'custom' && (
            <div className="flex items-center gap-1 bg-background border border-input rounded-xl px-2 py-0.5 text-xs">
              <input
                type="number"
                step="0.25"
                min="1.5"
                max="30"
                value={cardSettings.widthInches}
                onChange={(e) => handleCustomWidthChange(parseFloat(e.target.value))}
                className="w-10 text-center font-bold bg-transparent outline-none text-foreground"
                title="Card width in inches"
              />
              <span className="text-muted-foreground">×</span>
              <input
                type="number"
                step="0.25"
                min="1.5"
                max="30"
                value={cardSettings.heightInches}
                onChange={(e) => handleCustomHeightChange(parseFloat(e.target.value))}
                className="w-10 text-center font-bold bg-transparent outline-none text-foreground"
                title="Card height in inches"
              />
              <span className="text-[10px] text-muted-foreground font-semibold">in</span>
            </div>
          )}

          {/* Orientation Toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleOrientation}
            className="h-8 rounded-xl text-xs gap-1.5 font-semibold"
            title={`Switch to ${orientation === 'portrait' ? 'Landscape' : 'Portrait'}`}
          >
            <RotateCw size={13} className="text-primary" />
            <span className="capitalize">{orientation}</span>
          </Button>

          {/* Fit Territory to Frame */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleFitClick}
            className="h-8 rounded-xl text-xs gap-1.5 font-semibold bg-primary/10 text-primary hover:bg-primary/20"
            title="Fit territory boundaries into the card frame"
          >
            <Expand size={13} />
            <span>Fit Territory</span>
          </Button>
        </div>

        {/* Right: Direct Download & Print Actions */}
        <div className="flex items-center gap-1.5 bg-card/95 backdrop-blur-md border border-border/80 p-1.5 rounded-2xl shadow-xl">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadPng}
            disabled={isExportingPng}
            className="h-8 rounded-xl text-xs gap-1.5 font-bold shadow-xs hover:border-primary/50"
          >
            {isExportingPng ? (
              <Loader2 size={13} className="animate-spin text-primary" />
            ) : (
              <ImageIcon size={13} className="text-primary" />
            )}
            <span>Download .PNG</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="h-8 rounded-xl text-xs gap-1.5 font-bold shadow-md bg-primary text-primary-foreground"
          >
            {isExportingPdf ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <FileDown size={13} />
            )}
            <span>Download .PDF</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => window.print()}
            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
            title="Quick print"
          >
            <Printer size={15} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
            title="Exit print viewport"
          >
            <X size={16} />
          </Button>
        </div>
      </div>

      {/* Center Framing Viewport Overlay Details */}
      <div
        className="absolute pointer-events-none border-2 border-primary/90 rounded-2xl shadow-2xl transition-all duration-200"
        style={{
          left: `${frameMetrics.frameX}px`,
          top: `${frameMetrics.frameY}px`,
          width: `${frameMetrics.frameW}px`,
          height: `${frameMetrics.frameH}px`,
          zIndex: 2,
        }}
      >
        {/* Card Header Preview Banner (Top Inside Cutout) */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between p-2 rounded-xl bg-card/90 backdrop-blur-md border border-border/70 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-extrabold text-xs text-foreground tracking-tight">
              {territory ? `TERRITORY #${territory.number}` : 'TERRITORY CARD'}
            </span>
            <span className="text-muted-foreground text-xs">•</span>
            <span className="text-xs text-muted-foreground font-medium truncate">
              {territory?.name || 'Assigned Territory'}
            </span>
          </div>
          <Badge variant="secondary" className="text-[10px] font-bold py-0.5 px-2 capitalize">
            {side} Side View
          </Badge>
        </div>

        {/* 0.25in Safe Print Area Dotted Guide */}
        <div className="absolute inset-3 rounded-xl border border-dashed border-primary/40 pointer-events-none flex items-end justify-end p-2">
          <span className="text-[9px] font-semibold text-primary/70 bg-background/80 px-1.5 py-0.5 rounded-md backdrop-blur-xs">
            0.25″ Safe Area Margin
          </span>
        </div>

        {/* Corner Framing L-Brackets */}
        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-primary rounded-tl-lg" />
        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-primary rounded-tr-lg" />
        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-primary rounded-bl-lg" />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-primary rounded-br-lg" />

        {/* Center Targeting Crosshair */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
          <Move size={20} className="text-primary animate-pulse" />
        </div>
      </div>

      {/* Bottom Floating Hint Bar */}
      <div className="relative z-10 p-3 pointer-events-auto flex items-center justify-center">
        <div className="flex items-center gap-3 bg-card/95 backdrop-blur-md border border-border/80 px-4 py-2 rounded-2xl shadow-xl text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <FileText size={14} className="text-primary" />
            <span>Side to Export:</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleSelectSide('front')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                cardSettings.side === 'front'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Front (Map)
            </button>
            <button
              type="button"
              onClick={() => handleSelectSide('back')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                cardSettings.side === 'back'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Back (Directory & Record)
            </button>
            <button
              type="button"
              onClick={() => handleSelectSide('both')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                cardSettings.side === 'both'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Both Sides
            </button>
          </div>
        </div>
      </div>

      {/* Hidden Off-Screen Physical Card Elements for Direct PNG & PDF Export */}
      <div
        style={{
          position: 'fixed',
          left: '-99999px',
          top: '-99999px',
          width: `${effectiveW * 140}px`,
          height: `${effectiveH * 140}px`,
          overflow: 'hidden',
          zIndex: -1,
        }}
      >
        {/* Front Side Card Render */}
        <div
          ref={hiddenFrontRef}
          className="w-full h-full flex flex-col p-4 bg-white text-slate-900 select-none"
        >
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

          {/* Vector Map */}
          <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden">
            <TerritoryCardVectorMap territory={territory} households={households} />
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-slate-200 mt-2 flex items-center justify-between text-[9px] text-slate-500 shrink-0 font-medium">
            <span>Please do not mark directly on this card.</span>
            <span>Return promptly when territory is covered.</span>
          </div>
        </div>

        {/* Back Side Card Render */}
        <div
          ref={hiddenBackRef}
          className="w-full h-full flex flex-col p-4 bg-white text-slate-900 select-none overflow-y-auto"
        >
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

          {/* Publisher Record Table */}
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
      </div>
    </div>
  );
}
