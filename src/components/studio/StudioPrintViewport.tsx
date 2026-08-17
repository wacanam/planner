'use client';

import {
  Check,
  Compass,
  Expand,
  FileText,
  Layers,
  Maximize2,
  Minimize2,
  Move,
  Printer,
  RotateCw,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Household, Territory } from '@/types/api';
import type { CardDimensionSettings } from './StudioSidebar';

export interface StudioPrintViewportProps {
  active: boolean;
  onClose: () => void;
  cardSettings: CardDimensionSettings;
  onChangeCardSettings: (settings: CardDimensionSettings) => void;
  territory: Territory | null;
  households: Household[];
  onFitTerritoryToFrame: (padding: { top: number; right: number; bottom: number; left: number }) => void;
  onOpenPrintModal: () => void;
}

export function StudioPrintViewport({
  active,
  onClose,
  cardSettings,
  onChangeCardSettings,
  territory,
  households,
  onFitTerritoryToFrame,
  onOpenPrintModal,
}: StudioPrintViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 800 });

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
  const { widthInches, heightInches, orientation } = cardSettings;
  const effectiveW = orientation === 'landscape' ? Math.max(widthInches, heightInches) : Math.min(widthInches, heightInches);
  const effectiveH = orientation === 'landscape' ? Math.min(widthInches, heightInches) : Math.max(widthInches, heightInches);
  const aspectRatio = effectiveW / effectiveH;

  // Frame calculation within container
  const frameMetrics = useMemo(() => {
    const availW = containerSize.width;
    const availH = containerSize.height;

    // Leave margin for top toolbar and bottom controls
    const maxFrameW = Math.max(280, availW * 0.74);
    const maxFrameH = Math.max(240, (availH - 120) * 0.74);

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

  const handlePresetSelect = (preset: '4x6' | '5x7' | '8.5x11' | 'a5') => {
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

  const handleToggleOrientation = () => {
    onChangeCardSettings({
      ...cardSettings,
      orientation: orientation === 'portrait' ? 'landscape' : 'portrait',
    });
  };

  const handleSelectSide = (side: 'front' | 'back' | 'both') => {
    onChangeCardSettings({
      ...cardSettings,
      side,
    });
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
      <div className="relative z-10 p-3 flex items-center justify-between gap-3 pointer-events-auto max-w-5xl mx-auto w-full">
        {/* Left: Territory & Dimensions Pill */}
        <div className="flex items-center gap-2 bg-card/95 backdrop-blur-md border border-border/80 px-3.5 py-2 rounded-2xl shadow-xl">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Maximize2 size={16} />
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
              Pan & zoom map to frame the exact portion to print
            </p>
          </div>
        </div>

        {/* Center: Presets & Controls */}
        <div className="flex items-center gap-1.5 bg-card/95 backdrop-blur-md border border-border/80 p-1.5 rounded-2xl shadow-xl">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => handlePresetSelect('4x6')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                cardSettings.preset === '4x6'
                  ? 'bg-card text-primary shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="4x6 Pocket Territory Card"
            >
              4″ × 6″
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('5x7')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                cardSettings.preset === '5x7'
                  ? 'bg-card text-primary shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="5x7 Standard Card"
            >
              5″ × 7″
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('8.5x11')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                cardSettings.preset === '8.5x11'
                  ? 'bg-card text-primary shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="8.5x11 Full Letter Sheet"
            >
              Letter
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('a5')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                cardSettings.preset === 'a5'
                  ? 'bg-card text-primary shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="A5 Sheet"
            >
              A5
            </button>
          </div>

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

        {/* Right: Actions */}
        <div className="flex items-center gap-2 bg-card/95 backdrop-blur-md border border-border/80 p-1.5 rounded-2xl shadow-xl">
          <Button
            type="button"
            onClick={onOpenPrintModal}
            size="sm"
            className="h-8 rounded-xl gap-2 font-semibold shadow-md px-3.5 bg-primary text-primary-foreground"
          >
            <Printer size={14} />
            <span>Print Preview</span>
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
          <Badge variant="secondary" className="text-[10px] font-bold py-0.5 px-2">
            Front: Map Side
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
            <span>Card Side:</span>
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
              Back (Streets & Record)
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
    </div>
  );
}
