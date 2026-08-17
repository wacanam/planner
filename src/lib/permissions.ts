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
  return (
    normalized === UserRole.SUPER_ADMIN ||
    normalized === UserRole.ADMIN ||
    normalized === 'SUPER_ADMIN' ||
    normalized === 'ADMIN'
  );
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
  group:
    | {
        overseerId?: string | null;
        members?: { userId?: string | null; id?: string | null; role?: string | null }[];
      }
    | null
    | undefined
): boolean {
  if (!userId || !group) return false;
  if (group.overseerId === userId) return true;
  return Boolean(
    group.members?.some(
      (m) =>
        (m.userId === userId || m.id === userId) &&
        (m.role === 'group_overseer' || m.role === 'OVERSEER' || m.role === 'groupOverseer')
    )
  );
}

/**
 * Checks if the current user is the Group Overseer Assistant of a given group.
 */
export function isGroupOverseerAssistant(
  userId: string | null | undefined,
  group:
    | {
        assistantOverseerId?: string | null;
        members?: { userId?: string | null; id?: string | null; role?: string | null }[];
      }
    | null
    | undefined
): boolean {
  if (!userId || !group) return false;
  if (group.assistantOverseerId === userId) return true;
  return Boolean(
    group.members?.some(
      (m) =>
        (m.userId === userId || m.id === userId) &&
        (m.role === 'assistant_overseer' || m.role === 'ASSISTANT' || m.role === 'groupAssistant')
    )
  );
}

/**
 * Returns a Set of member user IDs across all groups where the specified user is a Group Overseer.
 */
export function getOverseenGroupMateIds(
  userId: string | null | undefined,
  groups: Array<{
    overseerId?: string | null;
    assistantOverseerId?: string | null;
    members?: Array<{ userId?: string | null; id?: string | null; role?: string | null }>;
  }> = []
): Set<string> {
  const mateIds = new Set<string>();
  if (!userId || !groups || groups.length === 0) return mateIds;

  for (const group of groups) {
    if (isGroupOverseer(userId, group)) {
      if (group.members) {
        for (const member of group.members) {
          const uid = member.userId || member.id;
          if (uid) {
            mateIds.add(uid);
          }
        }
      }
      if (group.overseerId) {
        mateIds.add(group.overseerId);
      }
      if (group.assistantOverseerId) {
        mateIds.add(group.assistantOverseerId);
      }
    }
  }

  return mateIds;
}

/**
 * Checks if a user is the Group Overseer of a group containing the target user.
 */
export function isGroupOverseerOfUser(
  overseerUserId: string | null | undefined,
  targetUserId: string | null | undefined,
  groups: Array<{
    overseerId?: string | null;
    assistantOverseerId?: string | null;
    members?: Array<{ userId?: string | null; id?: string | null; role?: string | null }>;
  }> = []
): boolean {
  if (!overseerUserId || !targetUserId || !groups || groups.length === 0) return false;
  return getOverseenGroupMateIds(overseerUserId, groups).has(targetUserId);
}

/**
 * Checks if a user is authorized to return an assignment:
 * - Personal assignment: The assigned user can return it.
 * - Group assignment: Only the Group Overseer (or Service Overseer / Territory Servant) can return it.
 */
export function canReturnAssignment(
  user: { id?: string | null; role?: string | null; email?: string | null } | null | undefined,
  assignment:
    | { userId?: string | null; assigneeEmail?: string | null; serviceGroupId?: string | null }
    | null
    | undefined,
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
 * Checks if a user is actively assigned to a territory:
 * - Direct personal assignment (matching userId or assigneeEmail)
 * - Service group assignment (where user is part of the assigned service group)
 */
export function isUserAssignedToTerritory(
  user: { id?: string | null; email?: string | null } | null | undefined,
  assignments: Array<{
    userId?: string | null;
    assigneeEmail?: string | null;
    serviceGroupId?: string | null;
    status?: string | null;
  }> = [],
  userGroupIds: Set<string> | string[] = []
): boolean {
  if (!user?.id) return false;
  const groupSet = userGroupIds instanceof Set ? userGroupIds : new Set(userGroupIds);

  return assignments.some((a) => {
    const isActive = a.status === 'assigned' || a.status === 'active' || !a.status;
    if (!isActive) return false;

    // 1. Direct personal assignment
    if (a.userId && a.userId === user.id) return true;
    if (
      a.assigneeEmail &&
      user.email &&
      a.assigneeEmail.toLowerCase() === user.email.toLowerCase()
    ) {
      return true;
    }

    // 2. Service group assignment
    if (a.serviceGroupId && groupSet.has(a.serviceGroupId)) {
      return true;
    }

    return false;
  });
}

/**
 * Checks if a user has edit permissions in Territory Studio:
 * - Territory Servants, Service Overseers, Admins, Super Admins can always edit any territory.
 * - Publishers (USER) can only edit if they are actively assigned to the territory.
 * - If not assigned, publishers view the territory in read-only mode.
 */
export function canEditTerritoryInStudio(
  user: { id?: string | null; role?: string | null; email?: string | null } | null | undefined,
  assignments: Array<{
    userId?: string | null;
    assigneeEmail?: string | null;
    serviceGroupId?: string | null;
    status?: string | null;
  }> = [],
  userGroupIds: Set<string> | string[] = []
): boolean {
  if (!user?.id) return false;
  if (isTerritoryServant(user.role)) return true;
  return isUserAssignedToTerritory(user, assignments, userGroupIds);
}

/**
 * Checks if the current user has full detail access (contact info, private notes) to a household.
 * Owners, accepted collaborators, read-only viewers, Territory Servants+, and Group Overseers of the owner have access.
 */
export function canAccessHouseholdDetails(
  userId: string | null | undefined,
  household: Household,
  shares: HouseholdShare[] = [],
  userRole?: string | null,
  groupsOrGroupMates?:
    | Array<{
        overseerId?: string | null;
        assistantOverseerId?: string | null;
        members?: Array<{ userId?: string | null; id?: string | null; role?: string | null }>;
      }>
    | Set<string>
    | string[]
    | null
): boolean {
  if (isTerritoryServant(userRole)) return true;
  if (!userId) return false;
  if (household.createdById === userId) return true;
  if (household.collaboratorIds?.includes(userId)) return true;
  if (household.readOnlyUserIds?.includes(userId)) return true;

  // Group Overseer read-only access to group mates' records
  if (groupsOrGroupMates && household.createdById) {
    if (groupsOrGroupMates instanceof Set) {
      if (groupsOrGroupMates.has(household.createdById)) return true;
    } else if (Array.isArray(groupsOrGroupMates)) {
      if (groupsOrGroupMates.length > 0 && typeof groupsOrGroupMates[0] === 'string') {
        if ((groupsOrGroupMates as string[]).includes(household.createdById)) return true;
      } else {
        if (
          isGroupOverseerOfUser(
            userId,
            household.createdById,
            groupsOrGroupMates as Array<{
              overseerId?: string | null;
              assistantOverseerId?: string | null;
              members?: Array<{ userId?: string | null; id?: string | null; role?: string | null }>;
            }>
          )
        ) {
          return true;
        }
      }
    }
  }

  // Check accepted shares
  return shares.some(
    (s) => s.householdId === household.id && s.toUserId === userId && s.status === 'accepted'
  );
}

/**
 * Checks if a user is allowed to SHARE a household record.
 * Allowed ONLY for record Owner or role Territory Servant / Service Overseer / Admin.
 */
export function canShareHousehold(
  user: { id?: string | null; role?: string | null } | null | undefined,
  household?: { createdById?: string | null } | null
): boolean {
  if (!user?.id) return false;
  if (isTerritoryServant(user.role)) return true;
  if (!household) return false;
  return household.createdById === user.id;
}

/**
 * Checks if a user is allowed to EDIT a household record's core details.
 * Allowed ONLY for record Owner or role Territory Servant / Service Overseer / Admin.
 */
export function canEditHousehold(
  user: { id?: string | null; role?: string | null } | null | undefined,
  household?: { createdById?: string | null } | null
): boolean {
  if (!user?.id) return false;
  if (isTerritoryServant(user.role)) return true;
  if (!household) return false;
  return household.createdById === user.id;
}

/**
 * Checks if a user is allowed to DELETE a household record.
 * Allowed ONLY for record Owner or role Territory Servant / Service Overseer / Admin.
 */
export function canDeleteHousehold(
  user: { id?: string | null; role?: string | null } | null | undefined,
  household?: { createdById?: string | null } | null
): boolean {
  if (!user?.id) return false;
  if (isTerritoryServant(user.role)) return true;
  if (!household) return false;
  return household.createdById === user.id;
}

/**
 * Checks if a user is allowed to log a visit or encounter for a household.
 * Allowed for Owner, Collaborator, or Territory Servant+.
 * (Read-only viewers cannot log visits/encounters).
 */
export function canLogVisitOrEncounter(
  user: { id?: string | null; role?: string | null } | null | undefined,
  household?: { createdById?: string | null; collaboratorIds?: string[] | null } | null
): boolean {
  if (!user?.id) return false;
  if (isTerritoryServant(user.role)) return true;
  if (!household) return false;
  if (household.createdById === user.id) return true;
  return Boolean(household.collaboratorIds?.includes(user.id));
}

/**
 * Checks if a user is allowed to EDIT a visit record (fix typos, notes, outcome, topics).
 * Allowed for:
 * 1. The original author who created the visit (visit.userId === user.id)
 * 2. The owner of the household (household.createdById === user.id)
 * 3. Territory Servant / Service Overseer / Admin (isTerritoryServant)
 */
export function canEditVisit(
  user: { id?: string | null; role?: string | null } | null | undefined,
  visit: { userId?: string | null; householdId?: string | null },
  household?: { createdById?: string | null } | null
): boolean {
  if (!user?.id) return false;
  if (isTerritoryServant(user.role)) return true;
  if (visit.userId && visit.userId === user.id) return true;
  if (household?.createdById && household.createdById === user.id) return true;
  return false;
}

/**
 * Checks if a user is allowed to DELETE a visit record.
 * Allowed for:
 * 1. The original author who created the visit (visit.userId === user.id)
 * 2. The owner of the household (household.createdById === user.id)
 * 3. Territory Servant / Service Overseer / Admin (isTerritoryServant)
 * Collaborators who are not the author cannot delete visits.
 */
export function canDeleteVisit(
  user: { id?: string | null; role?: string | null } | null | undefined,
  visit: { userId?: string | null; householdId?: string | null },
  household?: { createdById?: string | null } | null
): boolean {
  if (!user?.id) return false;
  if (isTerritoryServant(user.role)) return true;
  if (visit.userId && visit.userId === user.id) return true;
  if (household?.createdById && household.createdById === user.id) return true;
  return false;
}

/**
 * Checks if a user is allowed to EDIT an encounter record (fix typos, notes, name, response).
 * Allowed for:
 * 1. The original author who created the encounter (encounter.userId === user.id)
 * 2. The owner of the household (household.createdById === user.id)
 * 3. Territory Servant / Service Overseer / Admin (isTerritoryServant)
 */
export function canEditEncounter(
  user: { id?: string | null; role?: string | null } | null | undefined,
  encounter: { userId?: string | null; householdId?: string | null },
  household?: { createdById?: string | null } | null
): boolean {
  if (!user?.id) return false;
  if (isTerritoryServant(user.role)) return true;
  if (encounter.userId && encounter.userId === user.id) return true;
  if (household?.createdById && household.createdById === user.id) return true;
  return false;
}

/**
 * Checks if a user is allowed to DELETE an encounter record.
 * Allowed for:
 * 1. The original author who created the encounter (encounter.userId === user.id)
 * 2. The owner of the household (household.createdById === user.id)
 * 3. Territory Servant / Service Overseer / Admin (isTerritoryServant)
 * Collaborators who are not the author cannot delete encounters.
 */
export function canDeleteEncounter(
  user: { id?: string | null; role?: string | null } | null | undefined,
  encounter: { userId?: string | null; householdId?: string | null },
  household?: { createdById?: string | null } | null
): boolean {
  if (!user?.id) return false;
  if (isTerritoryServant(user.role)) return true;
  if (encounter.userId && encounter.userId === user.id) return true;
  if (household?.createdById && household.createdById === user.id) return true;
  return false;
}
