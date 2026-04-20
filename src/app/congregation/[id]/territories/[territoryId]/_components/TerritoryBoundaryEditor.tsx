'use client';

import React from 'react';
import { TerritoryBoundaryDrawer } from '@/components/territory-boundary-drawer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, MapPin } from 'lucide-react';

interface TerritoryBoundaryEditorProps {
  territoryId: string;
  initialCenter?: [number, number];
  onBoundarySaved?: () => void;
}

/**
 * Territory Boundary Editor Section
 * Displays in territory detail page
 * Allows Service Overseers to draw and save boundaries
 */
export function TerritoryBoundaryEditor({
  territoryId,
  initialCenter = [0, 0],
  onBoundarySaved,
}: TerritoryBoundaryEditorProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <Card className="mt-4">
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 flex justify-between items-center"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">Territory Boundaries</h3>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </div>

      {isExpanded && (
        <div className="border-t p-4">
          <div className="mb-4 text-sm text-gray-600">
            <p>Draw the boundaries of this territory using polygons on the map.</p>
            <p className="mt-2">Service Overseers and Territory Servants can edit boundaries.</p>
          </div>
          <div className="h-96 border rounded-lg overflow-hidden bg-gray-50">
            <TerritoryBoundaryDrawer
              territoryId={territoryId}
              initialCenter={initialCenter}
              initialZoom={13}
              onBoundarySaved={onBoundarySaved}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
