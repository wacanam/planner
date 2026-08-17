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
