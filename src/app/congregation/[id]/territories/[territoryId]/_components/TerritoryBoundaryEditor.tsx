'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { TerritoryBoundaryDrawer } from '@/components/territory-boundary-drawer';
import { Card } from '@/components/ui/card';

interface TerritoryBoundaryEditorProps {
  territoryId: string;
  initialCenter?: [number, number];
  onBoundarySaved?: () => void;
}

export function TerritoryBoundaryEditor({
  territoryId,
  initialCenter = [0, 0],
  onBoundarySaved,
}: TerritoryBoundaryEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="mt-4 overflow-hidden rounded-lg">
      <button
        type="button"
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <span className="font-semibold">Territory Boundaries</span>
        </span>
        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {isExpanded && (
        <div className="border-t p-4">
          <div className="mb-4 text-sm text-muted-foreground">
            <p>Draw the boundaries of this territory using polygons on the map.</p>
            <p className="mt-2">Service Overseers and Territory Servants can edit boundaries.</p>
          </div>
          <div className="h-96 overflow-hidden rounded-lg border bg-muted/30">
            <TerritoryBoundaryDrawer
              territoryId={territoryId}
              initialCenter={initialCenter}
              initialZoom={13}
              onClose={() => setIsExpanded(false)}
              onBoundarySaved={onBoundarySaved}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
