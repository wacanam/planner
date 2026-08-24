'use client';

import { useParams } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard-header';
import { ProtectedPage } from '@/components/protected-page';
import { CongregationStudioLayout } from '@/components/studio/CongregationStudioLayout';
import { useCongregation, useCongregationTerritories, useHouseholds } from '@/hooks';

export default function CongregationMapClient() {
  const params = useParams();
  const congregationId = (params?.id as string) || '';

  const { congregation, isLoading: congLoading } = useCongregation(congregationId);
  const { data: territories = [], isLoading: territoriesLoading } =
    useCongregationTerritories(congregationId);
  const { households = [], isLoading: householdsLoading } = useHouseholds({ congregationId });

  const isLoading = congLoading || territoriesLoading || householdsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="animate-spin h-8 w-8 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-xs text-muted-foreground">Loading Congregation Territory Map…</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedPage congregationId={congregationId}>
      <DashboardHeader />
      <CongregationStudioLayout
        congregationId={congregationId}
        congregation={congregation}
        territories={territories}
        households={households}
      />
    </ProtectedPage>
  );
}
