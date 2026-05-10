'use client';

import { useParams, useRouter } from 'next/navigation';
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
    <div className="min-h-screen bg-background pb-6">
      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              aria-label="Back"
              className="shrink-0 hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold sm:text-xl">Edit Boundary</h1>
              <p className="truncate text-sm text-muted-foreground">Territory map outline</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-4 sm:py-6">
        <TerritoryBoundaryEditor
          territoryId={territoryId}
          initialCenter={[0, 0]}
          onBoundarySaved={() => {
            setTimeout(() => {
              router.push(`/congregation/${congregationId}/territories/${territoryId}`);
            }, 1500);
          }}
        />
      </div>
    </div>
  );
}
