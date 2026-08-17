import { UserRole } from '@/lib/roles';
import type { Household, HouseholdShare } from '@/types/api';

/** Role hierarchy — higher index = more permissions */
const ROLE_HIERARCHY: UserRole[] = [
  UserRole.USER,
  UserRole.TERRITORY_SERVANT,
  UserRole.SERVICE_OVERSEER,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
];

/**
 * Returns true if `userRole` has at least the permissions of `requiredRole`.
 */
export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}

/**
 * Returns true if `userRole` is exactly one of the `allowedRoles`.
 */
export function hasRole(userRole: UserRole, ...allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

export function isSystemAdmin(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase().replace(/\s+/g, '_');
  return normalized === UserRole.SUPER_ADMIN || normalized === UserRole.ADMIN || normalized === 'SUPER_ADMIN' || normalized === 'ADMIN';
}

export function isServiceOverseer(role?: string | null): boolean {
  if (!role) return false;
  if (isSystemAdmin(role)) return true;
  const normalized = role.toUpperCase().replace(/\s+/g, '_');
  return normalized === UserRole.SERVICE_OVERSEER || normalized === 'SERVICE_OVERSEER';
}

export function isTerritoryServant(role?: string | null): boolean {
  if (!role) return false;
  if (isServiceOverseer(role)) return true;
  const normalized = role.toUpperCase().replace(/\s+/g, '_');
  return normalized === UserRole.TERRITORY_SERVANT || normalized === 'TERRITORY_SERVANT';
}

export function canManageCongregation(role?: string | null): boolean {
  return isServiceOverseer(role);
}

export function canManageGroups(role?: string | null): boolean {
  return isServiceOverseer(role);
}

export function canApproveMembers(role?: string | null): boolean {
  return isServiceOverseer(role);
}

export function canApproveAssignments(role?: string | null): boolean {
  return isServiceOverseer(role);
}

export function canCreateTerritory(role?: string | null): boolean {
  return isTerritoryServant(role);
}

export function canEndorseAssignment(role?: string | null): boolean {
  return isTerritoryServant(role);
}

export function canViewReports(role?: string | null): boolean {
  return isTerritoryServant(role);
}

/**
 * Checks if the current user is the Group Overseer of a given group.
 */
export function isGroupOverseer(
  userId: string | null | undefined,
  group: { overseerId?: string | null; members?: { userId: string; role?: string }[] } | null | undefined
): boolean {
  if (!userId || !group) return false;
  if (group.overseerId === userId) return true;
  return Boolean(
    group.members?.some(
      (m) =>
        m.userId === userId &&
        (m.role === 'group_overseer' || m.role === 'OVERSEER' || m.role === 'groupOverseer')
    )
  );
}

/**
 * Checks if the current user is the Group Overseer Assistant of a given group.
 */
export function isGroupOverseerAssistant(
  userId: string | null | undefined,
  group: { assistantOverseerId?: string | null; members?: { userId: string; role?: string }[] } | null | undefined
): boolean {
  if (!userId || !group) return false;
  if (group.assistantOverseerId === userId) return true;
  return Boolean(
    group.members?.some(
      (m) =>
        m.userId === userId &&
        (m.role === 'assistant_overseer' || m.role === 'ASSISTANT' || m.role === 'groupAssistant')
    )
  );
}

/**
 * Checks if a user is authorized to return an assignment:
 * - Personal assignment: The assigned user can return it.
 * - Group assignment: Only the Group Overseer (or Service Overseer / Territory Servant) can return it.
 */
export function canReturnAssignment(
  user: { id?: string | null; role?: string | null; email?: string | null } | null | undefined,
  assignment: { userId?: string | null; assigneeEmail?: string | null; serviceGroupId?: string | null } | null | undefined,
  group?: { overseerId?: string | null; members?: { userId: string; role?: string }[] } | null
): boolean {
  if (!user?.id || !assignment) return false;

  // Service Overseers & Territory Servants can always return/revoke assignments
  if (isTerritoryServant(user.role)) return true;

  // Personal assignment
  if (!assignment.serviceGroupId) {
    const matchesId = Boolean(assignment.userId && user.id && assignment.userId === user.id);
    const matchesEmail = Boolean(
      assignment.assigneeEmail && user.email && assignment.assigneeEmail === user.email
    );
    return matchesId || matchesEmail;
  }

  // Group assignment: ONLY the Group Overseer can return
  return isGroupOverseer(user.id, group);
}

/**
 * Checks if the current user has full detail access (contact info, private notes) to a household.
 * Owners and accepted collaborators have full access.
 */
export function canAccessHouseholdDetails(
  userId: string | null | undefined,
  household: Household,
  shares: HouseholdShare[] = []
): boolean {
  if (!userId) return false;
  if (household.createdById === userId) return true;
  if (household.collaboratorIds?.includes(userId)) return true;

  // Check accepted shares
  return shares.some(
    (s) => s.householdId === household.id && s.toUserId === userId && s.status === 'accepted'
  );
}
