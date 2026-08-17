'use client';

import {
  Expand,
  FileDown,
  FileText,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Move,
  QrCode,
  RotateCw,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  captureMapViewportSnapshot,
  exportCardToPdf,
  exportElementToPng,
} from '@/lib/territory-card-export';
import { calculateTerritoryCoverage } from '@/lib/territory-coverage';
import type { Congregation, Household, Territory } from '@/types/api';
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
  const [mapSnapshotUrl, setMapSnapshotUrl] = useState<string | null>(null);

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
  const { widthInches, heightInches, preset, orientation, side } = cardSettings;

  // Determine effective dimensions & orientation
  let effectiveW: number;
  let effectiveH: number;
  let effectiveOrientation: 'portrait' | 'landscape';

  if (preset === 'custom') {
    // In custom mode, widthInches is exact horizontal width, heightInches is exact vertical height
    effectiveW = Math.max(1, widthInches || 4);
    effectiveH = Math.max(1, heightInches || 6);
    effectiveOrientation = effectiveW >= effectiveH ? 'landscape' : 'portrait';
  } else {
    // In preset mode, base dimensions adjust to chosen orientation
    let baseW = 4;
    let baseH = 6;
    if (preset === '5x7') {
      baseW = 5;
      baseH = 7;
    } else if (preset === '8.5x11') {
      baseW = 8.5;
      baseH = 11;
    } else if (preset === 'a5') {
      baseW = 5.83;
      baseH = 8.27;
    }
    const isLandscape = orientation === 'landscape';
    effectiveW = isLandscape ? Math.max(baseW, baseH) : Math.min(baseW, baseH);
    effectiveH = isLandscape ? Math.min(baseW, baseH) : Math.max(baseW, baseH);
    effectiveOrientation = orientation;
  }

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

  const handlePresetSelect = (newPreset: '4x6' | '5x7' | '8.5x11' | 'a5' | 'custom') => {
    if (newPreset === 'custom') {
      onChangeCardSettings({
        ...cardSettings,
        preset: 'custom',
        widthInches: effectiveW,
        heightInches: effectiveH,
        orientation: effectiveOrientation,
      });
      return;
    }
    let baseW = 4;
    let baseH = 6;
    if (newPreset === '5x7') {
      baseW = 5;
      baseH = 7;
    } else if (newPreset === '8.5x11') {
      baseW = 8.5;
      baseH = 11;
    } else if (newPreset === 'a5') {
      baseW = 5.83;
      baseH = 8.27;
    }
    const isLandscape = orientation === 'landscape';
    const w = isLandscape ? Math.max(baseW, baseH) : Math.min(baseW, baseH);
    const h = isLandscape ? Math.min(baseW, baseH) : Math.max(baseW, baseH);
    onChangeCardSettings({
      ...cardSettings,
      preset: newPreset,
      widthInches: w,
      heightInches: h,
    });
  };

  const handleCustomWidthChange = (val: number) => {
    if (Number.isNaN(val) || val <= 0) return;
    const w = Math.max(1, Math.min(40, val));
    onChangeCardSettings({
      ...cardSettings,
      preset: 'custom',
      widthInches: w,
      heightInches: effectiveH,
      orientation: w >= effectiveH ? 'landscape' : 'portrait',
    });
  };

  const handleCustomHeightChange = (val: number) => {
    if (Number.isNaN(val) || val <= 0) return;
    const h = Math.max(1, Math.min(40, val));
    onChangeCardSettings({
      ...cardSettings,
      preset: 'custom',
      widthInches: effectiveW,
      heightInches: h,
      orientation: effectiveW >= h ? 'landscape' : 'portrait',
    });
  };

  const handleToggleOrientation = () => {
    if (cardSettings.preset === 'custom') {
      // Swapping width & height seamlessly changes orientation
      onChangeCardSettings({
        ...cardSettings,
        widthInches: effectiveH,
        heightInches: effectiveW,
        orientation: effectiveH >= effectiveW ? 'landscape' : 'portrait',
      });
    } else {
      const nextOrientation = orientation === 'portrait' ? 'landscape' : 'portrait';
      let baseW = 4;
      let baseH = 6;
      if (preset === '5x7') {
        baseW = 5;
        baseH = 7;
      } else if (preset === '8.5x11') {
        baseW = 8.5;
        baseH = 11;
      } else if (preset === 'a5') {
        baseW = 5.83;
        baseH = 8.27;
      }
      const isLandscape = nextOrientation === 'landscape';
      onChangeCardSettings({
        ...cardSettings,
        orientation: nextOrientation,
        widthInches: isLandscape ? Math.max(baseW, baseH) : Math.min(baseW, baseH),
        heightInches: isLandscape ? Math.min(baseW, baseH) : Math.max(baseW, baseH),
      });
    }
  };

  const handleSelectSide = (s: 'front' | 'back' | 'both') => {
    onChangeCardSettings({
      ...cardSettings,
      side: s,
    });
  };

  const territoryFilePrefix = `Territory-${territory?.number ? territory.number.padStart(2, '0') : 'Card'}`;

  // Helper to capture the exact live map viewport
  const acquireViewportSnapshot = async (): Promise<string> => {
    const mapElement =
      document.getElementById('studio-google-map-element') ||
      document.getElementById('studio-google-map-canvas-container') ||
      document.querySelector('[data-map-container="true"]') ||
      document.querySelector('.gm-style');

    if (!mapElement) {
      throw new Error('Google Map element not found for snapshot capture.');
    }

    return await captureMapViewportSnapshot({
      mapContainer: mapElement as HTMLElement,
      frameX: frameMetrics.frameX,
      frameY: frameMetrics.frameY,
      frameW: frameMetrics.frameW,
      frameH: frameMetrics.frameH,
    });
  };

  const handleDownloadPng = async () => {
    setIsExportingPng(true);
    try {
      // 1. Capture exact live viewport snapshot
      const snapshot = await acquireViewportSnapshot();
      setMapSnapshotUrl(snapshot);

      // Wait a moment for image to render in hidden DOM
      await new Promise((resolve) => setTimeout(resolve, 80));

      // 2. Export requested side(s)
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
        toast.success('Downloaded Front and Back PNG cards');
      }
    } catch (err) {
      console.error('Error exporting PNG snapshot:', err);
      toast.error('Failed to export PNG snapshot. Please try again.');
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      // 1. Capture exact live viewport snapshot
      const snapshot = await acquireViewportSnapshot();
      setMapSnapshotUrl(snapshot);

      // Wait a moment for image to render in hidden DOM
      await new Promise((resolve) => setTimeout(resolve, 80));

      // 2. Export PDF
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
      console.error('Error exporting PDF:', err);
      toast.error('Failed to export PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div
      ref={containerRef}
      id="studio-print-viewport-overlay"
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

      {/* Top Floating Viewport Control Bar replacing StudioTopBar */}
      <div className="absolute top-3 inset-x-0 z-40 flex flex-col items-center px-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center justify-between gap-1.5 p-1.5 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-2xl transition-all duration-200 max-w-[98vw] overflow-x-auto scrollbar-none">
          {/* Left: Territory & Dimensions Pill */}
          <div className="flex items-center gap-1.5 px-1.5 shrink-0">
            <div className="p-1 rounded-lg bg-primary/10 text-primary">
              <Maximize2 size={14} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground whitespace-nowrap">
                {territory ? `Territory #${territory.number}` : 'Territory'}
              </span>
              <Badge variant="outline" className="text-[10px] font-semibold uppercase py-0 px-1.5 whitespace-nowrap">
                {effectiveW}″ × {effectiveH}″ ({effectiveOrientation === 'portrait' ? 'Port' : 'Land'})
              </Badge>
            </div>
          </div>

          <div className="h-4 w-px bg-border shrink-0 hidden sm:block" />

          {/* Center: Presets & Custom Dimensions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Preset Buttons */}
            <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => handlePresetSelect('4x6')}
                className={`px-1.5 py-0.5 rounded-lg text-xs font-medium transition-all ${
                  cardSettings.preset === '4x6'
                    ? 'bg-card text-primary shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                4×6
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect('5x7')}
                className={`px-1.5 py-0.5 rounded-lg text-xs font-medium transition-all ${
                  cardSettings.preset === '5x7'
                    ? 'bg-card text-primary shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                5×7
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect('8.5x11')}
                className={`px-1.5 py-0.5 rounded-lg text-xs font-medium transition-all ${
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
                className={`px-1.5 py-0.5 rounded-lg text-xs font-medium transition-all ${
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
                className={`px-1.5 py-0.5 rounded-lg text-xs font-medium transition-all ${
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
              <div className="flex items-center gap-0.5 bg-background border border-input rounded-xl px-1.5 py-0.5 text-xs shrink-0">
                <input
                  type="number"
                  step="0.25"
                  min="1"
                  max="40"
                  value={effectiveW}
                  onChange={(e) => handleCustomWidthChange(parseFloat(e.target.value))}
                  className="w-9 text-center font-bold bg-transparent outline-none text-foreground"
                  title="Card width (horizontal) in inches"
                />
                <span className="text-muted-foreground text-[10px]">×</span>
                <input
                  type="number"
                  step="0.25"
                  min="1"
                  max="40"
                  value={effectiveH}
                  onChange={(e) => handleCustomHeightChange(parseFloat(e.target.value))}
                  className="w-9 text-center font-bold bg-transparent outline-none text-foreground"
                  title="Card height (vertical) in inches"
                />
                <span className="text-[9px] text-muted-foreground font-semibold">in</span>
              </div>
            )}

            {/* Orientation Toggle */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleOrientation}
              className="h-7 rounded-xl text-xs gap-1 font-semibold px-2"
              title={`Switch orientation (Current: ${effectiveOrientation})`}
            >
              <RotateCw size={12} className="text-primary" />
              <span className="capitalize">{effectiveOrientation === 'portrait' ? 'Port' : 'Land'}</span>
            </Button>

            {/* Fit Territory to Frame */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleFitClick}
              className="h-7 rounded-xl text-xs gap-1 font-semibold bg-primary/10 text-primary hover:bg-primary/20 px-2"
              title="Fit territory boundaries into the card frame"
            >
              <Expand size={12} />
              <span>Fit</span>
            </Button>
          </div>

          <div className="h-4 w-px bg-border shrink-0" />

          {/* Right: Direct Download Buttons & Close */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadPng}
              disabled={isExportingPng}
              className="h-7 rounded-xl text-xs gap-1 font-bold shadow-xs hover:border-primary/50 px-2.5"
              title="Download Card as PNG Image"
            >
              {isExportingPng ? (
                <Loader2 size={12} className="animate-spin text-primary" />
              ) : (
                <ImageIcon size={12} className="text-primary" />
              )}
              <span>.PNG</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="h-7 rounded-xl text-xs gap-1 font-bold shadow-md bg-primary text-primary-foreground px-2.5"
              title="Download Printable PDF Document"
            >
              {isExportingPdf ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <FileDown size={12} />
              )}
              <span>.PDF</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 rounded-xl text-muted-foreground hover:text-foreground"
              title="Exit print viewport"
            >
              <X size={15} />
            </Button>
          </div>
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
        {/* Front Side Card Render (with real captured map snapshot) */}
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

          {/* Actual Live Map Snapshot */}
          <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden rounded-lg border border-slate-300 bg-slate-100">
            {mapSnapshotUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mapSnapshotUrl}
                alt="Territory Map Viewport Snapshot"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-slate-400 text-xs">Capturing map snapshot…</div>
            )}
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
