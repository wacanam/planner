import type { SessionUser } from '@/hooks';
import type { Assignment, Group, Household, Member, Territory } from '@/types/api';

export type DashboardRole =
  | 'auto'
  | 'publisher'
  | 'group_overseer'
  | 'group_assistant'
  | 'territory_servant'
  | 'service_overseer'
  | 'admin';

export interface DashboardContextProps {
  congregationId: string;
  user: SessionUser;
  congregation: { id: string; name: string; city?: string | null } | null | undefined;
  territories: Territory[];
  territoriesLoading: boolean;
  assignments: Assignment[];
  assignmentsLoading: boolean;
  groups: Group[];
  households: Household[];
  householdsLoading: boolean;
  members: Member[];
  activeAssignments: Assignment[];
  effectiveRole: string;
  isExecutiveTier: boolean;
  isTerritoryServantTier: boolean;
  isGroupLeaderTier: boolean;
  isPublisherTier: boolean;
  previewRole: DashboardRole;
  setPreviewRole: (role: DashboardRole) => void;
  ledGroup: Group | undefined;
  userGroup: Group | undefined;
  groupActiveAssignments: Assignment[];
  groupHouseholds: Household[];
  groupCoverage: { totalDoors: number; workedDoors: number; coveragePercent: number };
  groupUnpinnedCount: number;
  groupReturnVisits: Household[];
  myReturnVisits: Household[];
  myUnpinnedDoorsCount: number;
  totalCongregationUnpinnedCount: number;
  displayUnpinnedCount: number;
  congregationCoveragePercent: number;
  totalDoorsCount: number;
  workedDoorsCount: number;
  availableTerritories: Territory[];
  inWorkTerritoriesCount: number;
  overdueTerritoriesCount: number;
  territoryMap: Map<string, Territory>;
  coverageByTerritoryId: Map<
    string,
    { totalDoors: number; workedDoors: number; coveragePercent: number }
  >;
  onLogVisit: (household: Household) => void;
  onStartTour: () => void;
}
