'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TerritoryBoundaryEditor } from '@/app/congregation/[id]/territories/[territoryId]/_components/TerritoryBoundaryEditor';
import { Button } from '@/components/ui/button';

/**
 * Territory Boundary Editor Page
 * Dedicated page for drawing/editing territory boundaries
 * Path: /congregation/[id]/territories/[territoryId]/boundary
 */
export default function TerritoryBoundaryEditorPage() {
  const params = useParams();
  const router = useRouter();
  const congregationId = params.id as string;
  const territoryId = params.territoryId as string;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="hover:bg-muted"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Edit Territory Boundary</h1>
              <p className="text-sm text-muted-foreground">Draw multi-polygon boundaries for your territory</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <TerritoryBoundaryEditor
          territoryId={territoryId}
          initialCenter={[0, 0]}
          onBoundarySaved={() => {
            // Show success and navigate back
            setTimeout(() => {
              router.push(`/congregation/${congregationId}/territories/${territoryId}`);
            }, 1500);
          }}
        />
      </div>

      {/* Help text */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h2 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">How to Draw Boundaries</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li>
              Open{' '}
              <a href="https://geojson.io" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                geojson.io
              </a>{' '}
              in a new tab
            </li>
            <li>Use the map tools to draw a polygon or multi-polygon around your territory</li>
            <li>Right-click the map and select "Copy GeoJSON" (or copy from the text editor on the right)</li>
            <li>Return here and paste the GeoJSON into the textarea below</li>
            <li>Click "Save Boundary" to store it</li>
          </ol>
          <p className="mt-4 text-xs text-blue-700 dark:text-blue-300">
            💡 <strong>Tip:</strong> You can draw multiple disconnected polygons by using the multi-polygon tool in geojson.io
          </p>
        </div>
      </div>
    </div>
  );
}
