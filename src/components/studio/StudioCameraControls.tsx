'use client';

import { Box, Compass, Layers, Navigation, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface StudioCameraControlsProps {
  heading: number;
  tilt: number;
  onSetHeading: (heading: number) => void;
  onSetTilt: (tilt: number) => void;
  isTrackingLocation?: boolean;
  onToggleLocation?: () => void;
}

export function StudioCameraControls({
  heading,
  tilt,
  onSetHeading,
  onSetTilt,
  isTrackingLocation = false,
  onToggleLocation,
}: StudioCameraControlsProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [localHeading, setLocalHeading] = useState(heading);
  const [localTilt, setLocalTilt] = useState(tilt);

  // Sync local state when external props update
  useEffect(() => {
    setLocalHeading(heading);
  }, [heading]);

  useEffect(() => {
    setLocalTilt(tilt);
  }, [tilt]);

  const is3D = localTilt > 5;
  const normalizedHeading = ((Math.round(localHeading) % 360) + 360) % 360;

  // Cardinal direction label helper
  const getCardinalDirection = (deg: number) => {
    if (deg >= 337.5 || deg < 22.5) return 'N';
    if (deg >= 22.5 && deg < 67.5) return 'NE';
    if (deg >= 67.5 && deg < 112.5) return 'E';
    if (deg >= 112.5 && deg < 157.5) return 'SE';
    if (deg >= 157.5 && deg < 202.5) return 'S';
    if (deg >= 202.5 && deg < 247.5) return 'SW';
    if (deg >= 247.5 && deg < 292.5) return 'W';
    return 'NW';
  };

  const cardinal = getCardinalDirection(normalizedHeading);

  return (
    <div className="absolute bottom-20 left-6 z-30 flex items-center gap-1.5 p-1 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-xl pointer-events-auto">
      {/* 2D / 3D Perspective Toggle Button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          const nextTilt = is3D ? 0 : 45;
          setLocalTilt(nextTilt);
          onSetTilt(nextTilt);
        }}
        className={`h-9 px-3 rounded-xl font-bold text-xs gap-1.5 transition-all ${
          is3D
            ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
        title={is3D ? 'Switch to 2D Top-Down View' : 'Switch to 3D Perspective View'}
      >
        {is3D ? <Box size={14} /> : <Layers size={14} />}
        <span>{is3D ? '3D' : '2D'}</span>
      </Button>

      {/* Compass Needle (Rotates with map bearing; click resets to North) */}
      <button
        type="button"
        onClick={() => {
          setLocalHeading(0);
          onSetHeading(0);
        }}
        title={
          normalizedHeading !== 0
            ? `Heading: ${normalizedHeading}° — Click to reset to True North`
            : 'Facing True North (0°)'
        }
        className={`relative h-9 w-9 rounded-xl flex items-center justify-center transition-all ${
          normalizedHeading !== 0
            ? 'bg-primary/10 text-primary border border-primary/30 shadow-xs'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
      >
        <div
          className="relative w-5 h-5 transition-transform duration-300 ease-out"
          style={{ transform: `rotate(${-normalizedHeading}deg)` }}
        >
          {/* North Pointer (Red Needle) */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[8px] border-b-red-500"
            style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))' }}
          />
          {/* Pivot Center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-700 dark:bg-slate-200 border border-white" />
          {/* South Pointer (Silver Needle) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[8px] border-t-slate-400 dark:border-t-slate-500" />
        </div>
      </button>

      {/* Live My Location & Compass Heading Flashlight Beam Toggle */}
      {onToggleLocation && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggleLocation}
          className={`h-9 w-9 rounded-xl transition-all ${
            isTrackingLocation
              ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
          title={
            isTrackingLocation
              ? 'Tracking current location & compass flashlight beam (Click to stop)'
              : 'Show my location with compass flashlight beam'
          }
        >
          <Navigation
            size={15}
            className={`${isTrackingLocation ? 'fill-white text-white' : ''}`}
          />
        </Button>
      )}

      {/* Heading & Tilt Sliders Popover */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50"
            title="Adjust Heading & Tilt Sliders"
          >
            <SlidersHorizontal size={14} />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          side="top"
          sideOffset={12}
          className="w-72 p-4 rounded-2xl bg-card border-border shadow-2xl space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Compass size={15} className="text-primary" />
              <span>Camera Controls</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setLocalHeading(0);
                setLocalTilt(0);
                onSetHeading(0);
                onSetTilt(0);
              }}
              className="h-6 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              Reset 2D
            </Button>
          </div>

          {/* Tilt (Pitch) Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Layers size={13} className="text-primary" />
                Tilt (Pitch)
              </span>
              <span className="font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 text-xs">
                {Math.round(localTilt)}°
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="67.5"
              step="1"
              value={Math.round(localTilt)}
              onChange={(e) => {
                const val = Number(e.target.value);
                setLocalTilt(val);
                onSetTilt(val);
              }}
              className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
            />
            {/* Quick Tilt Presets */}
            <div className="grid grid-cols-4 gap-1 pt-0.5">
              {[
                { label: '0° Flat', val: 0 },
                { label: '30°', val: 30 },
                { label: '45° 3D', val: 45 },
                { label: '65° Max', val: 65 },
              ].map((preset) => (
                <Button
                  key={preset.val}
                  type="button"
                  variant={Math.abs(localTilt - preset.val) <= 3 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setLocalTilt(preset.val);
                    onSetTilt(preset.val);
                  }}
                  className="h-6 text-[10px] font-mono px-0 rounded-md"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Heading (Rotation) Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Compass size={13} className="text-primary" />
                Heading (Bearing)
              </span>
              <span className="font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 text-xs">
                {normalizedHeading}° {cardinal}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={normalizedHeading}
              onChange={(e) => {
                const val = Number(e.target.value);
                setLocalHeading(val);
                onSetHeading(val);
              }}
              className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
            />
            {/* Quick Heading Cardinal Presets */}
            <div className="grid grid-cols-4 gap-1 pt-0.5">
              {[
                { label: '0° N', val: 0 },
                { label: '90° E', val: 90 },
                { label: '180° S', val: 180 },
                { label: '270° W', val: 270 },
              ].map((preset) => (
                <Button
                  key={preset.val}
                  type="button"
                  variant={normalizedHeading === preset.val ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setLocalHeading(preset.val);
                    onSetHeading(preset.val);
                  }}
                  className="h-6 text-[10px] font-mono px-0 rounded-md"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground/80 leading-tight pt-1 border-t border-border/50">
            💡 Tip: You can also hold{' '}
            <kbd className="px-1 py-0.5 rounded bg-muted text-foreground font-mono text-[9px]">
              Right-Click
            </kbd>{' '}
            or{' '}
            <kbd className="px-1 py-0.5 rounded bg-muted text-foreground font-mono text-[9px]">
              Ctrl
            </kbd>{' '}
            + drag on the map.
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
