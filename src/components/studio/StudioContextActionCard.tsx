'use client';

import {
  Check,
  Flag,
  Home,
  Info,
  MapPin,
  Milestone,
  MousePointer,
  Square,
  Undo2,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { StudioTool } from './StudioTopBar';

interface StudioContextActionCardProps {
  activeTool: StudioTool;
  pointCount: number;
  onUndoPoint?: () => void;
  onDone?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
}

const TOOL_CONFIG: Record<
  StudioTool,
  {
    title: string;
    instruction: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    doneLabel?: string;
    isPointTool?: boolean;
  }
> = {
  pointer: {
    title: 'Selection Mode',
    instruction: 'Tap any household pin or boundary to view details and actions.',
    icon: MousePointer,
    doneLabel: 'Done',
  },
  boundary: {
    title: 'Draw Territory Boundary',
    instruction: 'Tap around the perimeter on the map to define the polygon boundary.',
    icon: Square,
    doneLabel: 'Complete Boundary',
  },
  road: {
    title: 'Draw Road / Route Path',
    instruction: 'Tap along the street to draw street route lines. Click Save Road when finished.',
    icon: Milestone,
    doneLabel: 'Save Road',
  },
  pin: {
    title: 'Place House Pin',
    instruction: 'Tap a house on the map to place a pin and create a record.',
    icon: Home,
    isPointTool: true,
  },
  landmark: {
    title: 'Place Landmark / POI',
    instruction: 'Tap on the map to place a landmark (tree, school, chapel, store, monument).',
    icon: MapPin,
    isPointTool: true,
  },
  start: {
    title: 'Set Start Meeting Flag',
    instruction: 'Tap on the starting congregation meeting spot or block start (🚩).',
    icon: Flag,
    isPointTool: true,
  },
};

export function StudioContextActionCard({
  activeTool,
  pointCount,
  onUndoPoint,
  onDone,
  onCancel,
  isSaving = false,
}: StudioContextActionCardProps) {
  if (activeTool === 'pointer' && pointCount === 0) return null;

  const config = TOOL_CONFIG[activeTool] ?? TOOL_CONFIG.pointer;
  const Icon = config.icon;
  const isPoint = Boolean(config.isPointTool);

  return (
    <div className="absolute top-20 right-4 sm:right-6 z-30 max-w-sm w-auto min-w-[280px] pointer-events-auto transition-all animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="p-4 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-2xl space-y-3">
        {/* Header with tool icon & badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <Icon size={16} />
            </div>
            <p className="text-xs font-bold text-foreground truncate">{config.title}</p>
          </div>
          {!isPoint && pointCount > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary border-primary/30 shrink-0"
            >
              {pointCount} {pointCount === 1 ? 'pt' : 'pts'}
            </Badge>
          )}
        </div>

        {/* Step description */}
        <div className="flex items-start gap-2 bg-muted/50 p-2.5 rounded-xl border border-border/50">
          <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">{config.instruction}</p>
        </div>

        {/* Action button triggers */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 shrink-0">
            {!isPoint && pointCount > 0 && onUndoPoint && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-xl text-xs gap-1 px-2.5 whitespace-nowrap"
                onClick={onUndoPoint}
                title="Undo last placed point"
              >
                <Undo2 size={13} />
                <span>Undo</span>
              </Button>
            )}

            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-xl text-xs text-muted-foreground hover:text-foreground px-2.5 whitespace-nowrap gap-1"
                onClick={onCancel}
              >
                {isPoint ? <X size={13} /> : null}
                <span>{isPoint ? 'Exit Tool' : 'Cancel'}</span>
              </Button>
            )}
          </div>

          {!isPoint && onDone && config.doneLabel && (
            <Button
              type="button"
              size="sm"
              disabled={
                isSaving ||
                (activeTool === 'boundary' && pointCount < 3) ||
                (activeTool === 'road' && pointCount < 2)
              }
              className="h-8 rounded-xl text-xs font-semibold gap-1.5 shadow-sm px-3 ml-auto whitespace-nowrap"
              onClick={onDone}
            >
              <Check size={13} />
              <span>{isSaving ? 'Saving…' : config.doneLabel}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
