'use client';

import { Check, Layers, Map as MapIcon, Palette, Satellite, Sliders } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { BoundaryDisplaySettings } from '@/types/api';

export type BasemapMode = 'satellite' | 'street';

export interface StudioLayerSettings {
  showBuildings: boolean;
  showHouseLabels: boolean;
  showGooglePOIs: boolean;
  showStores: boolean;
  showSchools: boolean;
  showChurches: boolean;
  showHospitals: boolean;
  cleanMode: boolean;
}

export type { BoundaryDisplaySettings };

export const DEFAULT_BOUNDARY_DISPLAY: Required<
  Pick<BoundaryDisplaySettings, 'fillColor' | 'fillOpacity' | 'maskOpacity' | 'strokeColor'>
> = {
  fillColor: '#3B82F6',
  fillOpacity: 0.2,
  maskOpacity: 0.0,
  strokeColor: '#2563EB',
};

export function resolveBoundaryDisplay(
  display?: BoundaryDisplaySettings | null
): Required<Pick<BoundaryDisplaySettings, 'fillColor' | 'fillOpacity' | 'maskOpacity' | 'strokeColor'>> {
  return {
    fillColor: display?.fillColor ?? DEFAULT_BOUNDARY_DISPLAY.fillColor,
    fillOpacity: display?.fillOpacity ?? DEFAULT_BOUNDARY_DISPLAY.fillOpacity,
    maskOpacity: display?.maskOpacity ?? DEFAULT_BOUNDARY_DISPLAY.maskOpacity,
    strokeColor: display?.strokeColor ?? DEFAULT_BOUNDARY_DISPLAY.strokeColor,
  };
}

const PRESET_BOUNDARY_COLORS = [
  { label: 'Blue', fill: '#3B82F6', stroke: '#2563EB' },
  { label: 'Emerald', fill: '#10B981', stroke: '#059669' },
  { label: 'Amber', fill: '#F59E0B', stroke: '#D97706' },
  { label: 'Purple', fill: '#8B5CF6', stroke: '#7C3AED' },
  { label: 'Rose', fill: '#EF4444', stroke: '#DC2626' },
  { label: 'Slate', fill: '#64748B', stroke: '#475569' },
];

interface StudioBasemapPopupProps {
  mode: BasemapMode;
  onSelectMode: (mode: BasemapMode) => void;
  layers: StudioLayerSettings;
  onChangeLayers: (layers: StudioLayerSettings) => void;
  boundaryDisplay?: BoundaryDisplaySettings | null;
  onChangeBoundaryDisplay?: (display: BoundaryDisplaySettings) => void;
}

export function StudioBasemapPopup({
  mode,
  onSelectMode,
  layers,
  onChangeLayers,
  boundaryDisplay,
  onChangeBoundaryDisplay,
}: StudioBasemapPopupProps) {
  const [open, setOpen] = useState(false);
  const currentDisplay = resolveBoundaryDisplay(boundaryDisplay);

  const toggleLayer = (key: keyof StudioLayerSettings) => {
    onChangeLayers({
      ...layers,
      [key]: !layers[key],
    });
  };

  const handleUpdateBoundary = (partial: Partial<BoundaryDisplaySettings>) => {
    onChangeBoundaryDisplay?.({
      ...currentDisplay,
      ...partial,
    });
  };

  return (
    <div className="absolute bottom-6 left-6 z-30 pointer-events-auto">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 px-3.5 rounded-2xl bg-card border-border shadow-xl text-xs font-semibold gap-2 hover:bg-muted/60 transition-all"
          >
            <Layers size={16} className="text-primary" />
            <span className="capitalize">{mode} Map & Layers</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="top"
          className="w-80 max-h-[85vh] overflow-y-auto p-4 rounded-2xl bg-card border-border shadow-2xl space-y-4"
        >
          {/* Basemap Mode */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Basemap Style
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSelectMode('street')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold gap-2 transition-all ${
                  mode === 'street'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                <MapIcon size={20} />
                <span>Street View</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('satellite')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold gap-2 transition-all ${
                  mode === 'satellite'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                <Satellite size={20} />
                <span>Satellite</span>
              </button>
            </div>
          </div>

          {/* Boundary Display Settings */}
          {onChangeBoundaryDisplay && (
            <div className="pt-3 border-t border-border space-y-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Palette size={13} />
                <span>Boundary Display & Mask</span>
              </div>

              {/* Fill Color Preset Palette */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground flex items-center justify-between">
                  <span>Fill Color</span>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">
                    {currentDisplay.fillColor}
                  </span>
                </Label>
                <div className="flex items-center gap-2 pt-0.5">
                  {PRESET_BOUNDARY_COLORS.map((c) => {
                    const isSelected =
                      currentDisplay.fillColor.toLowerCase() === c.fill.toLowerCase();
                    return (
                      <button
                        key={c.fill}
                        type="button"
                        onClick={() =>
                          handleUpdateBoundary({
                            fillColor: c.fill,
                            strokeColor: c.stroke,
                          })
                        }
                        style={{ backgroundColor: c.fill }}
                        className={`h-7 w-7 rounded-full flex items-center justify-center border-2 transition-transform hover:scale-110 ${
                          isSelected ? 'border-foreground shadow-md scale-105' : 'border-white/80'
                        }`}
                        title={c.label}
                      >
                        {isSelected && <Check size={12} className="text-white drop-shadow" />}
                      </button>
                    );
                  })}
                  <input
                    type="color"
                    value={currentDisplay.fillColor}
                    onChange={(e) =>
                      handleUpdateBoundary({
                        fillColor: e.target.value,
                        strokeColor: e.target.value,
                      })
                    }
                    className="h-7 w-7 rounded-full border border-border cursor-pointer p-0 overflow-hidden shrink-0"
                    title="Custom color"
                  />
                </div>
              </div>

              {/* Fill Opacity Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <Label className="font-medium text-foreground">Fill Opacity</Label>
                  <span className="font-semibold text-primary">
                    {Math.round(currentDisplay.fillOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={Math.round(currentDisplay.fillOpacity * 100)}
                  onChange={(e) =>
                    handleUpdateBoundary({
                      fillOpacity: Number(e.target.value) / 100,
                    })
                  }
                  className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
                />
              </div>

              {/* Outside Mask Opacity Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <Label className="font-medium text-foreground">
                    Outside Mask (Dim Exterior)
                  </Label>
                  <span className="font-semibold text-primary">
                    {Math.round(currentDisplay.maskOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="5"
                  value={Math.round(currentDisplay.maskOpacity * 100)}
                  onChange={(e) =>
                    handleUpdateBoundary({
                      maskOpacity: Number(e.target.value) / 100,
                    })
                  }
                  className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
                />
                <p className="text-[10px] text-muted-foreground">
                  Dims the map area outside your territory boundaries.
                </p>
              </div>
            </div>
          )}

          {/* Map Details & POIs */}
          <div className="pt-3 border-t border-border space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Sliders size={13} />
              <span>Map Details & POI</span>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="layer-buildings" className="text-xs cursor-pointer">
                3D Building Outlines
              </Label>
              <input
                id="layer-buildings"
                type="checkbox"
                checked={layers.showBuildings}
                onChange={() => toggleLayer('showBuildings')}
                className="h-4 w-4 rounded accent-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="layer-house-labels" className="text-xs cursor-pointer">
                House Numbers & Addresses
              </Label>
              <input
                id="layer-house-labels"
                type="checkbox"
                checked={layers.showHouseLabels}
                onChange={() => toggleLayer('showHouseLabels')}
                className="h-4 w-4 rounded accent-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="layer-google-pois" className="text-xs cursor-pointer">
                Google Business & Place Icons
              </Label>
              <input
                id="layer-google-pois"
                type="checkbox"
                checked={layers.showGooglePOIs}
                onChange={() => toggleLayer('showGooglePOIs')}
                className="h-4 w-4 rounded accent-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="layer-schools" className="text-xs cursor-pointer">
                Schools & Colleges
              </Label>
              <input
                id="layer-schools"
                type="checkbox"
                checked={layers.showSchools}
                onChange={() => toggleLayer('showSchools')}
                className="h-4 w-4 rounded accent-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="layer-churches" className="text-xs cursor-pointer">
                Churches & Temples
              </Label>
              <input
                id="layer-churches"
                type="checkbox"
                checked={layers.showChurches}
                onChange={() => toggleLayer('showChurches')}
                className="h-4 w-4 rounded accent-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="layer-hospitals" className="text-xs cursor-pointer">
                Hospitals & Medical
              </Label>
              <input
                id="layer-hospitals"
                type="checkbox"
                checked={layers.showHospitals}
                onChange={() => toggleLayer('showHospitals')}
                className="h-4 w-4 rounded accent-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label
                htmlFor="layer-clean"
                className="text-xs cursor-pointer font-semibold text-primary"
              >
                Clean High-Contrast Print Mode
              </Label>
              <input
                id="layer-clean"
                type="checkbox"
                checked={layers.cleanMode}
                onChange={() => toggleLayer('cleanMode')}
                className="h-4 w-4 rounded accent-primary cursor-pointer"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

