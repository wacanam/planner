// mobile/src/lib/permissions.ts
import { UserRole } from '@/lib/roles';
import type { Announcement, Assignment, Household, HouseholdShare, Territory } from '@/types/api';

/** Role hierarchy — higher index = more permissions */
const ROLE_HIERARCHY: UserRole[] = [
  UserRole.USER,
  UserRole.VISITING_PUBLISHER,
  UserRole.TERRITORY_SERVANT,
  UserRole.SECRETARY,
  UserRole.SERVICE_OVERSEER,
  UserRole.CIRCUIT_OVERSEER,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
];

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}

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

export function isCircuitOverseer(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase().replace(/\s+/g, '_');
  return normalized === UserRole.CIRCUIT_OVERSEER || normalized === 'CIRCUIT_OVERSEER';
}

export function isVisitingPublisher(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase().replace(/\s+/g, '_');
  return normalized === UserRole.VISITING_PUBLISHER || normalized === 'VISITING_PUBLISHER';
}

export function isServiceOverseer(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase().replace(/\s+/g, '_');
  return normalized === UserRole.SERVICE_OVERSEER || normalized === 'SERVICE_OVERSEER';
}

export function isCongregationSecretary(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase().replace(/\s+/g, '_');
  return (
    normalized === UserRole.SECRETARY ||
    normalized === 'SECRETARY' ||
    normalized === 'CONGREGATION_SECRETARY'
  );
}

export function isTerritoryServant(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase().replace(/\s+/g, '_');
  return normalized === UserRole.TERRITORY_SERVANT || normalized === 'TERRITORY_SERVANT';
}

export function isPublisher(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase().replace(/\s+/g, '_');
  return (
    normalized === UserRole.USER ||
    normalized === UserRole.PUBLISHER ||
    normalized === 'USER' ||
    normalized === 'PUBLISHER'
  );
}

export function canManageCongregation(
  role?: string | null,
  congregationRole?: string | null
): boolean {
  return (
    isSystemAdmin(role) ||
    isSystemAdmin(congregationRole) ||
    isServiceOverseer(role) ||
    isServiceOverseer(congregationRole) ||
    isCongregationSecretary(role) ||
    isCongregationSecretary(congregationRole)
  );
}

export function canManageGroups(role?: string | null, congregationRole?: string | null): boolean {
  return (
    isSystemAdmin(role) ||
    isSystemAdmin(congregationRole) ||
    isServiceOverseer(role) ||
    isServiceOverseer(congregationRole) ||
    isCongregationSecretary(role) ||
    isCongregationSecretary(congregationRole)
  );
}

export function canApproveMembers(role?: string | null, congregationRole?: string | null): boolean {
  return (
    isSystemAdmin(role) ||
    isSystemAdmin(congregationRole) ||
    isServiceOverseer(role) ||
    isServiceOverseer(congregationRole) ||
    isCongregationSecretary(role) ||
    isCongregationSecretary(congregationRole)
  );
}

export function canSendCongregationInvite(
  role?: string | null,
  congregationRole?: string | null
): boolean {
  return (
    isSystemAdmin(role) ||
    isSystemAdmin(congregationRole) ||
    isServiceOverseer(role) ||
    isServiceOverseer(congregationRole) ||
    isCongregationSecretary(role) ||
    isCongregationSecretary(congregationRole)
  );
}

export function canSendSystemAdminInvite(role?: string | null): boolean {
  return isSystemAdmin(role);
}

export function getAllowedCongregationRolesForInviter(
  _role?: string | null,
  _congregationRole?: string | null
): string[] {
  // Secretary, Service Overseer, Super Admin, and Admin can invite for any congregation role including circuit overseer
  return [
    'publisher',
    'visiting_publisher',
    'territory_servant',
    'secretary',
    'service_overseer',
    'circuit_overseer',
  ];
}

export function canApproveAssignments(
  role?: string | null,
  congregationRole?: string | null
): boolean {
  return (
    isSystemAdmin(role) ||
    isSystemAdmin(congregationRole) ||
    isServiceOverseer(role) ||
    isServiceOverseer(congregationRole)
  );
}

export function canCreateTerritory(
  role?: string | null,
  congregationRole?: string | null
): boolean {
  return (
    isSystemAdmin(role) ||
    isSystemAdmin(congregationRole) ||
    isServiceOverseer(role) ||
    isServiceOverseer(congregationRole) ||
    isTerritoryServant(role) ||
    isTerritoryServant(congregationRole)
  );
}

export function canEditTerritory(role?: string | null, congregationRole?: string | null): boolean {
  return (
    isSystemAdmin(role) ||
    isSystemAdmin(congregationRole) ||
    isServiceOverseer(role) ||
    isServiceOverseer(congregationRole) ||
    isTerritoryServant(role) ||
    isTerritoryServant(congregationRole)
  );
}

export function canDeleteTerritory(
  role?: string | null,
  congregationRole?: string | null
): boolean {
  return (
    isSystemAdmin(role) ||
    isSystemAdmin(congregationRole) ||
    isServiceOverseer(role) ||
    isServiceOverseer(congregationRole) ||
    isTerritoryServant(role) ||
    isTerritoryServant(congregationRole)
  );
}

export function canEndorseAssignment(
  role?: string | null,
  congregationRole?: string | null
): boolean {
  return (
    isSystemAdmin(role) ||
    isSystemAdmin(congregationRole) ||
    isTerritoryServant(role) ||
    isTerritoryServant(congregationRole)
  );
}

export function canAdjustAssignmentDates(
  role?: string | null,
  congregationRole?: string | null
): boolean {
  return (
    isSystemAdmin(role) ||
    isSystemAdmin(congregationRole) ||
    isServiceOverseer(role) ||
    isServiceOverseer(congregationRole) ||
    isTerritoryServant(role) ||
    isTerritoryServant(congregationRole)
  );
}

export function canDeleteAssignment(
  role?: string | null,
  congregationRole?: string | null
): boolean {
  return isSystemAdmin(role) || isSystemAdmin(congregationRole);
}

export function canViewReports(role?: string | null, congregationRole?: string | null): boolean {
  return (
    isSystemAdmin(role) ||
    isSystemAdmin(congregationRole) ||
    isServiceOverseer(role) ||
    isServiceOverseer(congregationRole) ||
    isCongregationSecretary(role) ||
    isCongregationSecretary(congregationRole) ||
    isTerritoryServant(role) ||
    isTerritoryServant(congregationRole) ||
    isCircuitOverseer(role) ||
    isCircuitOverseer(congregationRole)
  );
}

export function canViewAllCongregationRecords(
  role?: string | null,
  congregationRole?: string | null
): boolean {
  return (
    isSystemAdmin(role) ||
    isSystemAdmin(congregationRole) ||
    isServiceOverseer(role) ||
    isServiceOverseer(congregationRole) ||
    isCongregationSecretary(role) ||
    isCongregationSecretary(congregationRole) ||
    isTerritoryServant(role) ||
    isTerritoryServant(congregationRole) ||
    isCircuitOverseer(role) ||
    isCircuitOverseer(congregationRole)
  );
}

export function isGroupOverseer(
  userId: string | null | undefined,
  group:
    | {
        overseerId?: string | null;
        members?: { userId?: string | null; id?: string | null; role?: string | null }[];
      }
    | null
    | undefined,
  userRole?: string | null,
  congregationRole?: string | null
): boolean {
  if (!userId || !group) return false;
  if (group.overseerId === userId) return true;
  const isMemberOverseer = Boolean(
    group.members?.some(
      (m) =>
        (m.userId === userId || m.id === userId) &&
        (m.role === 'group_overseer' ||
          m.role === 'OVERSEER' ||
          m.role === 'groupOverseer' ||
          m.role === 'overseer')
    )
  );
  if (isMemberOverseer) return true;

  const normCongRole = congregationRole?.toUpperCase().replace(/\s+/g, '_');
  const normUserRole = userRole?.toUpperCase().replace(/\s+/g, '_');
  if (normCongRole === 'GROUP_OVERSEER' || normUserRole === 'GROUP_OVERSEER') {
    return Boolean(
      group.members?.some((m) => m.userId === userId || m.id === userId) ||
        group.overseerId === userId
    );
  }
  return false;
}

export function isGroupOverseerAssistant(
  userId: string | null | undefined,
  group:
    | {
        assistantOverseerId?: string | null;
        members?: { userId?: string | null; id?: string | null; role?: string | null }[];
      }
    | null
    | undefined,
  userRole?: string | null,
  congregationRole?: string | null
): boolean {
  if (!userId || !group) return false;
  if (group.assistantOverseerId === userId) return true;
  const isMemberAssistant = Boolean(
    group.members?.some(
      (m) =>
        (m.userId === userId || m.id === userId) &&
        (m.role === 'assistant_overseer' ||
          m.role === 'ASSISTANT' ||
          m.role === 'groupAssistant' ||
          m.role === 'assistant' ||
          m.role === 'assistantOverseer')
    )
  );
  if (isMemberAssistant) return true;

  const normCongRole = congregationRole?.toUpperCase().replace(/\s+/g, '_');
  const normUserRole = userRole?.toUpperCase().replace(/\s+/g, '_');
  if (
    normCongRole === 'ASSISTANT_OVERSEER' ||
    normUserRole === 'ASSISTANT_OVERSEER' ||
    normCongRole === 'GROUP_ASSISTANT' ||
    normUserRole === 'GROUP_ASSISTANT'
  ) {
    return Boolean(
      group.members?.some((m) => m.userId === userId || m.id === userId) ||
        group.assistantOverseerId === userId
    );
  }
  return false;
}

export function isGroupLeader(
  userId: string | null | undefined,
  group:
    | {
        overseerId?: string | null;
        assistantOverseerId?: string | null;
        members?: { userId?: string | null; id?: string | null; role?: string | null }[];
      }
    | null
    | undefined,
  userRole?: string | null,
  congregationRole?: string | null
): boolean {
  return (
    isGroupOverseer(userId, group, userRole, congregationRole) ||
    isGroupOverseerAssistant(userId, group, userRole, congregationRole)
  );
}

export function getOverseenGroupMateIds(
  userId: string | null | undefined,
  groups: Array<{
    overseerId?: string | null;
    assistantOverseerId?: string | null;
    members?: Array<{ userId?: string | null; id?: string | null; role?: string | null }>;
  }> = [],
  userRole?: string | null,
  congregationRole?: string | null
): Set<string> {
  const mateIds = new Set<string>();
  if (!userId || !groups || groups.length === 0) return mateIds;

  for (const group of groups) {
    if (isGroupLeader(userId, group, userRole, congregationRole)) {
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
      mateIds.add(userId);
    }
  }

  return mateIds;
}

export function getGroupLeadershipMateIds(
  userId: string | null | undefined,
  groups: Array<{
    overseerId?: string | null;
    assistantOverseerId?: string | null;
    members?: Array<{ userId?: string | null; id?: string | null; role?: string | null }>;
  }> = [],
  userRole?: string | null,
  congregationRole?: string | null
): Set<string> {
  return getOverseenGroupMateIds(userId, groups, userRole, congregationRole);
}

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

export function isUserInGroup(
  user: { id?: string | null; email?: string | null; groupId?: string | null } | null | undefined,
  group:
    | {
        id?: string;
        overseerId?: string | null;
        assistantOverseerId?: string | null;
        members?: Array<{
          userId?: string | null;
          id?: string | null;
          role?: string | null;
          user?: { email?: string | null } | null;
        }>;
      }
    | null
    | undefined
): boolean {
  if (!user || (!user.id && !user.email && !user.groupId) || !group) return false;
  const uid = user.id?.trim();
  const userEmail = user.email?.trim().toLowerCase();
  const userGroupId = user.groupId?.trim();

  if (userGroupId && group.id && userGroupId === group.id) {
    return true;
  }

  if (uid) {
    if (group.overseerId === uid || group.assistantOverseerId === uid) {
      return true;
    }
  }

  if (uid) {
    const isMemberByUid = group.members?.some((m) => {
      const memberId = (m.userId || m.id)?.trim();
      return memberId === uid;
    });
    if (isMemberByUid) return true;
  }

  if (userEmail) {
    const isMemberByEmail = group.members?.some((m) => {
      return m.user?.email && m.user.email.trim().toLowerCase() === userEmail;
    });
    if (isMemberByEmail) return true;
  }

  return false;
}

export function getUserGroupIds(
  user: { id?: string | null; email?: string | null; groupId?: string | null } | null | undefined,
  groups: Array<{
    id: string;
    overseerId?: string | null;
    assistantOverseerId?: string | null;
    members?: Array<{
      userId?: string | null;
      id?: string | null;
      role?: string | null;
      user?: { email?: string | null } | null;
    }>;
  }> = []
): Set<string> {
  const ids = new Set<string>();
  if (!user || (!user.id && !user.email && !user.groupId) || !groups || groups.length === 0) {
    if (user?.groupId) ids.add(user.groupId);
    return ids;
  }

  if (user.groupId) {
    ids.add(user.groupId);
  }

  for (const group of groups) {
    if (group.id && isUserInGroup(user, group)) {
      ids.add(group.id);
    }
  }

  return ids;
}

export function canReturnAssignment(
  user:
    | {
        id?: string | null;
        role?: string | null;
        congregationRole?: string | null;
        email?: string | null;
      }
    | null
    | undefined,
  assignment:
    | { userId?: string | null; assigneeEmail?: string | null; serviceGroupId?: string | null }
    | null
    | undefined,
  group?: { overseerId?: string | null; members?: { userId: string; role?: string }[] } | null
): boolean {
  if (!user?.id || !assignment) return false;

  // Service Overseers & Territory Servants (and Admins) can always return/revoke assignments
  if (canEditTerritory(user.role, user.congregationRole)) return true;

  if (!assignment.serviceGroupId) {
    const matchesId = Boolean(assignment.userId && user.id && assignment.userId === user.id);
    const matchesEmail = Boolean(
      assignment.assigneeEmail &&
        user.email &&
        assignment.assigneeEmail.toLowerCase() === user.email.toLowerCase()
    );
    return matchesId || matchesEmail;
  }

  return isGroupOverseer(user.id, group, user.role, user.congregationRole);
}

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

    if (a.userId && a.userId === user.id) return true;
    if (
      a.assigneeEmail &&
      user.email &&
      a.assigneeEmail.toLowerCase() === user.email.toLowerCase()
    ) {
      return true;
    }

    if (a.serviceGroupId && groupSet.has(a.serviceGroupId)) {
      return true;
    }

    return false;
  });
}

export function resolveUserAssignments(
  user: { id?: string | null; email?: string | null } | null | undefined,
  assignments: Assignment[] = [],
  territories: Territory[] = [],
  userGroupIds: Set<string> | string[] = [],
  congregationId?: string | null
): Assignment[] {
  if (!user?.id && !user?.email) return [];

  const uid = user?.id?.trim();
  const userEmail = user?.email?.toLowerCase().trim();
  const groupSet = userGroupIds instanceof Set ? userGroupIds : new Set(userGroupIds);
  const results: Assignment[] = [];
  const assignedTerritoryIds = new Set<string>();

  for (const a of assignments) {
    const aEmail = a.assigneeEmail?.toLowerCase().trim();
    const aGroupId = a.serviceGroupId?.trim();

    const isDirectPersonal =
      Boolean(uid && a.userId === uid) || Boolean(userEmail && aEmail && aEmail === userEmail);

    const isGroupInherited = Boolean(aGroupId && groupSet.has(aGroupId));

    if (isDirectPersonal || isGroupInherited) {
      results.push(a);
      if (a.territoryId) {
        assignedTerritoryIds.add(a.territoryId);
      }
    }
  }

  for (const t of territories) {
    if (assignedTerritoryIds.has(t.id)) continue;

    const tStatus = t.status?.toLowerCase().trim();
    if (tStatus !== 'assigned' && tStatus !== 'active') continue;

    const tPublisherId = t.publisherId?.trim();
    const tGroupId = t.groupId?.trim();

    const isDirectPersonal =
      Boolean(uid && tPublisherId === uid) ||
      Boolean(userEmail && tPublisherId?.toLowerCase() === userEmail);

    const isGroupInherited = Boolean(tGroupId && groupSet.has(tGroupId));

    if (isDirectPersonal || isGroupInherited) {
      results.push({
        id: `territory-${t.id}`,
        territoryId: t.id,
        congregationId: t.congregationId || congregationId || null,
        userId: t.publisherId || null,
        serviceGroupId: t.groupId || null,
        groupName: t.groupName || (isGroupInherited ? 'Service Group' : null),
        assigneeName: t.publisherName || null,
        assigneeEmail: null,
        status: 'assigned',
        endorsementStatus: 'approved',
        endorsedBy: null,
        endorsedByName: null,
        endorsedAt: null,
        approvedBy: null,
        approvedByName: null,
        approvedAt: null,
        rejectedBy: null,
        rejectedByName: null,
        rejectedAt: null,
        rejectionReason: null,
        assignedAt: t.updatedAt || t.createdAt || new Date().toISOString(),
        dueAt: null,
        returnedAt: null,
        notes: t.notes || null,
        coverageAtAssignment: t.coveragePercent || '0',
        createdAt: t.createdAt || new Date().toISOString(),
        territoryNumber: t.number,
        territoryName: t.name,
      });
    }
  }

  return results;
}

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
  if (canViewAllCongregationRecords(userRole)) return true;
  if (!userId) return false;
  if (household.createdById === userId) return true;
  if (household.collaboratorIds?.includes(userId)) return true;
  if (household.readOnlyUserIds?.includes(userId)) return true;

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

  return shares.some(
    (s) => s.householdId === household.id && s.toUserId === userId && s.status === 'accepted'
  );
}

export function canShareHousehold(
  user: { id?: string | null; role?: string | null } | null | undefined,
  household?: { createdById?: string | null } | null
): boolean {
  if (!user?.id) return false;
  if (canCreateTerritory(user.role) || canManageCongregation(user.role)) return true;
  if (!household) return false;
  return household.createdById === user.id;
}

export function canEditHousehold(
  user: { id?: string | null; role?: string | null } | null | undefined,
  household?: { createdById?: string | null } | null
): boolean {
  if (!user?.id) return false;
  if (canCreateTerritory(user.role) || canManageCongregation(user.role)) return true;
  if (!household) return false;
  return household.createdById === user.id;
}

export function canDeleteHousehold(
  user: { id?: string | null; role?: string | null } | null | undefined,
  household?: { createdById?: string | null } | null
): boolean {
  if (!user?.id) return false;
  if (canDeleteTerritory(user.role)) return true;
  if (!household) return false;
  return household.createdById === user.id;
}

export function canLogVisitOrEncounter(
  user: { id?: string | null; role?: string | null } | null | undefined,
  household?: { createdById?: string | null; collaboratorIds?: string[] | null } | null
): boolean {
  if (!user?.id) return false;
  if (canViewAllCongregationRecords(user.role) || isVisitingPublisher(user.role)) return true;
  if (!household) return false;
  if (household.createdById === user.id) return true;
  return Boolean(household.collaboratorIds?.includes(user.id));
}

export function canEditVisit(
  user: { id?: string | null; role?: string | null } | null | undefined,
  visit: { userId?: string | null; householdId?: string | null },
  household?: { createdById?: string | null } | null
): boolean {
  if (!user?.id) return false;
  if (canEditTerritory(user.role)) return true;
  if (visit.userId && visit.userId === user.id) return true;
  if (household?.createdById && household.createdById === user.id) return true;
  return false;
}

export function canDeleteVisit(
  user: { id?: string | null; role?: string | null } | null | undefined,
  visit: { userId?: string | null; householdId?: string | null },
  household?: { createdById?: string | null } | null
): boolean {
  if (!user?.id) return false;
  if (canDeleteTerritory(user.role)) return true;
  if (visit.userId && visit.userId === user.id) return true;
  if (household?.createdById && household.createdById === user.id) return true;
  return false;
}

export function canEditEncounter(
  user: { id?: string | null; role?: string | null } | null | undefined,
  encounter: { userId?: string | null; householdId?: string | null },
  household?: { createdById?: string | null } | null
): boolean {
  if (!user?.id) return false;
  if (canEditTerritory(user.role)) return true;
  if (encounter.userId && encounter.userId === user.id) return true;
  if (household?.createdById && household.createdById === user.id) return true;
  return false;
}

export function canDeleteEncounter(
  user: { id?: string | null; role?: string | null } | null | undefined,
  encounter: { userId?: string | null; householdId?: string | null },
  household?: { createdById?: string | null } | null
): boolean {
  if (!user?.id) return false;
  if (canDeleteTerritory(user.role)) return true;
  if (encounter.userId && encounter.userId === user.id) return true;
  if (household?.createdById && household.createdById === user.id) return true;
  return false;
}

/**
 * Returns true if a user can access records for a given congregationId.
 * Super Admins and System Admins have global access to all congregations.
 * All other users are strictly restricted to their assigned active congregation.
 */
export function hasCongregationAccess(
  user: { role?: string | null; congregationId?: string | null } | null | undefined,
  targetCongregationId: string | null | undefined
): boolean {
  if (!user) return false;
  if (isSystemAdmin(user.role)) return true;
  if (!targetCongregationId || !user.congregationId) return false;
  return user.congregationId === targetCongregationId;
}

/**
 * Returns true if the user can post congregation announcements.
 * Service Overseers, Secretaries, and System Admins have this privilege.
 */
export function canPostCongregationAnnouncement(
  role?: string | null,
  congregationRole?: string | null
): boolean {
  return (
    isSystemAdmin(role) ||
    isSystemAdmin(congregationRole) ||
    isServiceOverseer(role) ||
    isServiceOverseer(congregationRole) ||
    isCongregationSecretary(role) ||
    isCongregationSecretary(congregationRole)
  );
}

/**
 * Returns true if the user can post service group announcements.
 * Group Overseers, Assistant Overseers of the group, Service Overseers, Secretaries, and Admins have this privilege.
 */
export function canPostServiceGroupAnnouncement(
  user: {
    id?: string | null;
    role?: string | null;
    congregationRole?: string | null;
  } | null | undefined,
  targetGroupId?: string | null,
  userLedGroupIds: string[] | Set<string> = []
): boolean {
  if (!user?.id) return false;
  if (canPostCongregationAnnouncement(user.role, user.congregationRole)) return true;
  if (!targetGroupId) return false;

  const ledSet = userLedGroupIds instanceof Set ? userLedGroupIds : new Set(userLedGroupIds);
  return ledSet.has(targetGroupId);
}

/**
 * Returns true if the user can post system-wide announcements.
 * Super Admins and System Admins have this privilege.
 */
export function canPostSystemAnnouncement(role?: string | null): boolean {
  return isSystemAdmin(role);
}

/**
 * Returns true if the user can edit, pin, or delete an existing announcement.
 */
export function canManageAnnouncement(
  user: {
    id?: string | null;
    role?: string | null;
    congregationRole?: string | null;
  } | null | undefined,
  announcement: Announcement,
  userLedGroupIds: string[] | Set<string> = []
): boolean {
  if (!user?.id) return false;
  if (isSystemAdmin(user.role)) return true;
  if (announcement.authorId === user.id) return true;
  if (
    announcement.scope === 'congregation' &&
    canPostCongregationAnnouncement(user.role, user.congregationRole)
  ) {
    return true;
  }
  if (
    announcement.scope === 'service_group' &&
    announcement.serviceGroupId
  ) {
    if (canPostCongregationAnnouncement(user.role, user.congregationRole)) return true;
    const ledSet = userLedGroupIds instanceof Set ? userLedGroupIds : new Set(userLedGroupIds);
    if (ledSet.has(announcement.serviceGroupId)) return true;
  }
  return false;
}
