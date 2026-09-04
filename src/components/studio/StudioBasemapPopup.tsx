'use client';

import {
  Check,
  Eye,
  Filter,
  Flag,
  Hexagon,
  Home,
  Layers,
  Map as MapIcon,
  MapPin,
  Milestone,
  Navigation,
  Palette,
  Satellite,
  Tag,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { type BasemapMode, DEFAULT_BASEMAP_MODE } from '@/lib/map-preferences';
import type { BoundaryDisplaySettings } from '@/types/api';

export type { BasemapMode };
export { DEFAULT_BASEMAP_MODE };

export type HouseholdStatusFilter =
  | 'all'
  | 'bible_study'
  | 'return_visit'
  | 'available'
  | 'active'
  | 'not_home'
  | 'busy'
  | 'foreign_language'
  | 'vacant'
  | 'inaccessible'
  | 'do_not_visit';

export interface StudioLayerSettings {
  showHouses: boolean;
  showHouseLabels: boolean;
  clusterHouseholds: boolean;
  showLandmarks: boolean;
  showRoads: boolean;
  showStartFlag: boolean;
  showBoundaries: boolean;
  showUserLocation: boolean;
  householdFilter: HouseholdStatusFilter;
}

export const DEFAULT_STUDIO_LAYERS: StudioLayerSettings = {
  showHouses: true,
  showHouseLabels: true,
  clusterHouseholds: true,
  showLandmarks: true,
  showRoads: true,
  showStartFlag: true,
  showBoundaries: true,
  showUserLocation: true,
  householdFilter: 'all',
};

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
): Required<
  Pick<BoundaryDisplaySettings, 'fillColor' | 'fillOpacity' | 'maskOpacity' | 'strokeColor'>
> {
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

const STATUS_FILTER_OPTIONS: Array<{
  id: HouseholdStatusFilter;
  label: string;
  dotColor: string;
}> = [
  { id: 'all', label: 'All Households', dotColor: 'bg-primary' },
  { id: 'bible_study', label: 'Active Bible Studies', dotColor: 'bg-purple-600' },
  { id: 'return_visit', label: 'Return Visits & Interested', dotColor: 'bg-blue-600' },
  { id: 'available', label: 'Available Households', dotColor: 'bg-emerald-600' },
  { id: 'not_home', label: 'Not Home', dotColor: 'bg-amber-600' },
  { id: 'busy', label: 'Busy / Call Back', dotColor: 'bg-orange-500' },
  { id: 'foreign_language', label: 'Foreign Language', dotColor: 'bg-cyan-500' },
  { id: 'vacant', label: 'Vacant / Unoccupied', dotColor: 'bg-slate-500' },
  { id: 'inaccessible', label: 'Inaccessible / Gated', dotColor: 'bg-stone-500' },
  { id: 'do_not_visit', label: 'Do Not Visit / Call', dotColor: 'bg-rose-600' },
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

  const toggleLayer = (key: keyof Omit<StudioLayerSettings, 'householdFilter'>) => {
    onChangeLayers({
      ...layers,
      [key]: !layers[key],
    });
  };

  const setHouseholdFilter = (filter: HouseholdStatusFilter) => {
    onChangeLayers({
      ...layers,
      householdFilter: filter,
    });
  };

  const handleShowAll = () => {
    onChangeLayers({
      showHouses: true,
      showHouseLabels: true,
      clusterHouseholds: true,
      showLandmarks: true,
      showRoads: true,
      showStartFlag: true,
      showBoundaries: true,
      showUserLocation: true,
      householdFilter: 'all',
    });
  };

  const handleHideAll = () => {
    onChangeLayers({
      showHouses: false,
      showHouseLabels: false,
      clusterHouseholds: false,
      showLandmarks: false,
      showRoads: false,
      showStartFlag: false,
      showBoundaries: false,
      showUserLocation: false,
      householdFilter: 'all',
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
            <span className="capitalize">{mode} Map & Filters</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="top"
          className="w-84 max-h-[85vh] overflow-y-auto p-4 rounded-2xl bg-card border-border shadow-2xl space-y-4"
        >
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

          {onChangeBoundaryDisplay && (
            <div className="pt-3 border-t border-border space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Palette size={13} />
                <span>Boundary Display & Mask</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Fill Color</span>
                  <span className="text-[10px] text-muted-foreground font-mono uppercase">
                    {currentDisplay.fillColor}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_BOUNDARY_COLORS.map((c) => {
                    const isSelected =
                      currentDisplay.fillColor.toLowerCase() === c.fill.toLowerCase();
                    return (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() =>
                          handleUpdateBoundary({
                            fillColor: c.fill,
                            strokeColor: c.stroke,
                          })
                        }
                        className="relative h-6 w-6 rounded-full border border-black/10 transition-transform hover:scale-110 flex items-center justify-center cursor-pointer"
                        style={{ backgroundColor: c.fill }}
                        title={c.label}
                      >
                        {isSelected && <Check size={12} className="text-white drop-shadow-sm" />}
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
                    className="h-6 w-6 p-0 border-0 rounded-full cursor-pointer bg-transparent"
                    title="Custom color"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Fill Opacity</span>
                  <span className="text-xs text-primary font-bold">
                    {Math.round(currentDisplay.fillOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={currentDisplay.fillOpacity}
                  onChange={(e) =>
                    handleUpdateBoundary({ fillOpacity: parseFloat(e.target.value) })
                  }
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Outside Mask (Dim Exterior)</span>
                  <span className="text-xs text-primary font-bold">
                    {Math.round(currentDisplay.maskOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.9"
                  step="0.05"
                  value={currentDisplay.maskOpacity}
                  onChange={(e) =>
                    handleUpdateBoundary({ maskOpacity: parseFloat(e.target.value) })
                  }
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <p className="text-[10px] text-muted-foreground">
                  Dims the map area outside your territory boundaries.
                </p>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Eye size={13} />
                <span>Map Elements (What to See)</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleShowAll}
                  className="text-[10px] text-primary hover:underline font-semibold"
                >
                  Show All
                </button>
                <span className="text-muted-foreground text-[10px]">•</span>
                <button
                  type="button"
                  onClick={handleHideAll}
                  className="text-[10px] text-muted-foreground hover:text-foreground font-medium"
                >
                  Hide All
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="layer-houses"
                  className="text-xs cursor-pointer flex items-center gap-2"
                >
                  <Home size={14} className="text-primary" />
                  <span>House Pins</span>
                </Label>
                <input
                  id="layer-houses"
                  type="checkbox"
                  checked={layers.showHouses}
                  onChange={() => toggleLayer('showHouses')}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="layer-cluster-houses"
                  className="text-xs cursor-pointer flex items-center gap-2"
                >
                  <Layers size={14} className="text-purple-600" />
                  <span>Cluster Nearby Pins</span>
                </Label>
                <input
                  id="layer-cluster-houses"
                  type="checkbox"
                  checked={layers.clusterHouseholds}
                  onChange={() => toggleLayer('clusterHouseholds')}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="layer-house-labels"
                  className="text-xs cursor-pointer flex items-center gap-2"
                >
                  <Tag size={14} className="text-slate-500" />
                  <span>House Numbers & Labels</span>
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
                <Label
                  htmlFor="layer-landmarks"
                  className="text-xs cursor-pointer flex items-center gap-2"
                >
                  <MapPin size={14} className="text-emerald-600" />
                  <span>Landmarks & POIs</span>
                </Label>
                <input
                  id="layer-landmarks"
                  type="checkbox"
                  checked={layers.showLandmarks}
                  onChange={() => toggleLayer('showLandmarks')}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="layer-roads"
                  className="text-xs cursor-pointer flex items-center gap-2"
                >
                  <Milestone size={14} className="text-blue-600" />
                  <span>Roads & Route Corridors</span>
                </Label>
                <input
                  id="layer-roads"
                  type="checkbox"
                  checked={layers.showRoads}
                  onChange={() => toggleLayer('showRoads')}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="layer-start-flag"
                  className="text-xs cursor-pointer flex items-center gap-2"
                >
                  <Flag size={14} className="text-amber-600" />
                  <span>Start Meeting Flag</span>
                </Label>
                <input
                  id="layer-start-flag"
                  type="checkbox"
                  checked={layers.showStartFlag}
                  onChange={() => toggleLayer('showStartFlag')}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="layer-boundaries"
                  className="text-xs cursor-pointer flex items-center gap-2"
                >
                  <Hexagon size={14} className="text-indigo-600" />
                  <span>Territory Boundary Zones</span>
                </Label>
                <input
                  id="layer-boundaries"
                  type="checkbox"
                  checked={layers.showBoundaries}
                  onChange={() => toggleLayer('showBoundaries')}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="layer-user-location"
                  className="text-xs cursor-pointer flex items-center gap-2"
                >
                  <Navigation size={14} className="text-blue-500" />
                  <span>My Location & Flashlight Beam</span>
                </Label>
                <input
                  id="layer-user-location"
                  type="checkbox"
                  checked={layers.showUserLocation}
                  onChange={() => toggleLayer('showUserLocation')}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Filter size={13} />
                <span>Filter Households by Status</span>
              </div>
            </div>

            <div className="space-y-1.5">
              {STATUS_FILTER_OPTIONS.map((opt) => {
                const isSelected = layers.householdFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setHouseholdFilter(opt.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium border transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-foreground font-semibold shadow-xs'
                        : 'border-border/60 hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${opt.dotColor}`} />
                      <span>{opt.label}</span>
                    </div>
                    {isSelected && <Check size={14} className="text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
