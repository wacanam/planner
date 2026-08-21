'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { ProtectedPage } from '@/components/protected-page';
import { StudioLayout } from '@/components/studio/StudioLayout';
import {
  useCongregation,
  useCongregationGroups,
  useCongregationTerritories,
  useCurrentUser,
  useHouseholds,
  useTerritoryAssignments,
  useTerritoryDetail,
} from '@/hooks';
import { canEditTerritoryInStudio, getUserGroupIds } from '@/lib/permissions';

export default function TerritoryDetailView() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const congregationId = (params?.id as string) || '';
  const territoryId = (params?.territoryId as string) || '';
  const pinHouseholdId = searchParams.get('pinHouseholdId');

  const { user } = useCurrentUser();
  const { territory, isLoading: territoryLoading } = useTerritoryDetail(territoryId);
  const { congregation } = useCongregation(congregationId);
  const { data: allTerritories = [] } = useCongregationTerritories(congregationId);
  const { groups = [] } = useCongregationGroups(congregationId);
  const { households = [] } = useHouseholds();
  const { assignments = [] } = useTerritoryAssignments(territoryId);

  const activeAssignment = assignments.find(
    (a) => a.status === 'assigned' || a.status === 'active'
  );

  // Find all service groups that the current user belongs to (as overseer, assistant, or member)
  const userGroupIds = useMemo(() => {
    return getUserGroupIds(user, groups);
  }, [groups, user]);

  const canEdit = useMemo(() => {
    return canEditTerritoryInStudio(user, assignments, userGroupIds);
  }, [user, assignments, userGroupIds]);

  const isReadOnly = !canEdit;

  // Filter households: show territory households + household currently being pinned
  const territoryHouseholds = households.filter(
    (h) => h.territoryId === territoryId || (pinHouseholdId && h.id === pinHouseholdId)
  );

  if (territoryLoading) {
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
          <p className="text-xs text-muted-foreground">Loading Territory Studio…</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedPage congregationId={congregationId}>
      <DashboardHeader />
      <StudioLayout
        territory={territory}
        congregation={congregation}
        allTerritories={allTerritories}
        onSelectTerritory={(nextId) => {
          router.push(`/congregation/${congregationId}/territories/${nextId}`);
        }}
        congregationId={congregationId}
        households={territoryHouseholds}
        activeAssignmentId={activeAssignment?.id}
        isReadOnly={isReadOnly}
        pinHouseholdId={isReadOnly ? null : pinHouseholdId}
        onClearPinHouseholdId={() => {
          router.replace(`/congregation/${congregationId}/territories/${territoryId}`);
        }}
        onHouseholdSaved={() => {
          if (pinHouseholdId) {
            router.replace(`/congregation/${congregationId}/territories/${territoryId}`);
          }
        }}
      />
    </ProtectedPage>
  );
}
