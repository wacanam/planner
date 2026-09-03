import { UserRole } from '@/lib/roles';
import type {
  Announcement,
  Assignment,
  Household,
  HouseholdShare,
  SharedMemberLocation,
  Territory,
} from '@/types/api';

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

/**
 * Returns true if the user can permanently delete accidental/wrong assignment history.
 * Only System Admins and Super Admins are allowed to delete historical records.
 */
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

/**
 * Checks if the user is authorized to manage the congregation-level Do Not Call (DNC) registry.
 * DNC records are strictly address-only (House #, Street, Request Date) with ZERO personal data.
 */
export function canManageDoNotCallList(
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

/**
 * Checks if the current user is either a Group Overseer or Assistant Overseer of a given group.
 */
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

/**
 * Returns a Set of member user IDs across all groups where the specified user is a Group Overseer OR Assistant Overseer.
 */
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

/**
 * Returns a Set of member user IDs across all groups where the specified user is a Group Overseer OR Assistant Overseer.
 */
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
 * Checks if a user is the Group Overseer or Assistant Overseer of a group containing the target user.
 */
export function isGroupLeaderOfUser(
  leaderUserId: string | null | undefined,
  targetUserId: string | null | undefined,
  groups: Array<{
    overseerId?: string | null;
    assistantOverseerId?: string | null;
    members?: Array<{ userId?: string | null; id?: string | null; role?: string | null }>;
  }> = []
): boolean {
  if (!leaderUserId || !targetUserId || !groups || groups.length === 0) return false;
  return getGroupLeadershipMateIds(leaderUserId, groups).has(targetUserId);
}

/**
 * Checks if a user belongs to a service group as overseer, assistant overseer, or group member.
 * Strictly uses deterministic user identifiers (auth UID / userId, verified email, or explicit groupId).
 */
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

  // 1. Direct groupId linkage (from user profile or congregationMembers record)
  if (userGroupId && group.id && userGroupId === group.id) {
    return true;
  }

  // 2. Overseer or Assistant Overseer by UID
  if (uid) {
    if (group.overseerId === uid || group.assistantOverseerId === uid) {
      return true;
    }
  }

  // 3. Members check by UID
  if (uid) {
    const isMemberByUid = group.members?.some((m) => {
      const memberId = (m.userId || m.id)?.trim();
      return memberId === uid;
    });
    if (isMemberByUid) return true;
  }

  // 4. Secondary fallback: verified email if UID was not available
  if (userEmail) {
    const isMemberByEmail = group.members?.some((m) => {
      return m.user?.email && m.user.email.trim().toLowerCase() === userEmail;
    });
    if (isMemberByEmail) return true;
  }

  return false;
}

/**
 * Returns a Set of group IDs that the user belongs to (as overseer, assistant overseer, or member).
 * Strictly uses group IDs (group.id).
 */
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

/**
 * Returns a Set of all member user IDs across all groups that the user belongs to (as overseer, assistant, or member)
 * or oversees. Also incorporates any congregationMembers records linked to those groups.
 */
export function getUserGroupMateIds(
  user:
    | {
        id?: string | null;
        email?: string | null;
        groupId?: string | null;
        role?: string | null;
        congregationRole?: string | null;
      }
    | string
    | null
    | undefined,
  groups: Array<{
    id?: string;
    overseerId?: string | null;
    assistantOverseerId?: string | null;
    members?: Array<{
      userId?: string | null;
      id?: string | null;
      role?: string | null;
      user?: { email?: string | null } | null;
    }>;
  }> = [],
  congregationMembers: Array<{
    id?: string;
    userId?: string | null;
    groupId?: string | null;
    user?: { email?: string | null } | null;
  }> = [],
  userRole?: string | null,
  congregationRole?: string | null
): Set<string> {
  const mateIds = new Set<string>();
  const userObj = typeof user === 'string' ? { id: user } : user;
  const uid = userObj?.id?.trim();
  if (!uid && !userObj?.email && !userObj?.groupId) return mateIds;

  const effectiveUserRole = userRole || userObj?.role;
  const effectiveCongRole = congregationRole || userObj?.congregationRole;

  // 1. Identify which groups the user belongs to or oversees
  const userGroupIds = new Set<string>();
  if (userObj?.groupId) {
    userGroupIds.add(userObj.groupId);
  }

  // Also check congregationMembers if user is mapped to a groupId
  if (uid || userObj?.email) {
    for (const cm of congregationMembers) {
      const cmUid = (cm.userId || cm.id)?.trim();
      const cmEmail = cm.user?.email?.trim().toLowerCase();
      const isMatch =
        (uid && cmUid === uid) ||
        Boolean(userObj?.email && cmEmail && cmEmail === userObj.email.trim().toLowerCase());
      if (isMatch && cm.groupId) {
        userGroupIds.add(cm.groupId);
      }
    }
  }

  for (const group of groups) {
    if (!group) continue;
    const isMemberOfGroup = isUserInGroup(userObj, group);
    const isLeaderOfGroup = uid
      ? isGroupLeader(uid, group, effectiveUserRole, effectiveCongRole)
      : false;
    const isExplicitGroup = Boolean(group.id && userGroupIds.has(group.id));

    if (isMemberOfGroup || isLeaderOfGroup || isExplicitGroup) {
      if (group.id) {
        userGroupIds.add(group.id);
      }
      if (group.members) {
        for (const member of group.members) {
          const mUid = (member.userId || member.id)?.trim();
          if (mUid) mateIds.add(mUid);
        }
      }
      if (group.overseerId?.trim()) {
        mateIds.add(group.overseerId.trim());
      }
      if (group.assistantOverseerId?.trim()) {
        mateIds.add(group.assistantOverseerId.trim());
      }
    }
  }

  // Also collect members from congregationMembers that belong to user's groups
  if (userGroupIds.size > 0 && congregationMembers.length > 0) {
    for (const cm of congregationMembers) {
      if (cm.groupId && userGroupIds.has(cm.groupId)) {
        const cmUid = (cm.userId || cm.id)?.trim();
        if (cmUid) mateIds.add(cmUid);
      }
    }
  }

  if (uid) {
    mateIds.add(uid);
  }

  return mateIds;
}

/**
 * Checks if a user is authorized to return an assigned territory:
 * - Personal assignees can return their own personal assignments.
 * - Group Overseers can return assignments for their service group.
 * - Territory Servants, Service Overseers, and Admins can return/revoke any assignment.
 */
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
  group?: {
    overseerId?: string | null;
    members?: { userId?: string | null; role?: string }[];
  } | null
): boolean {
  if (!user?.id || !assignment) return false;

  // Service Overseers & Territory Servants (and Admins) can always return/revoke assignments
  if (canEditTerritory(user.role, user.congregationRole)) return true;

  // Personal assignment: the assigned publisher can return their personal assignment
  if (!assignment.serviceGroupId) {
    const matchesId = Boolean(assignment.userId && user.id && assignment.userId === user.id);
    const matchesEmail = Boolean(
      assignment.assigneeEmail &&
        user.email &&
        assignment.assigneeEmail.toLowerCase() === user.email.toLowerCase()
    );
    return matchesId || matchesEmail;
  }

  // Group Overseer can return assignments for their service group
  if (group && isGroupOverseer(user.id, group, user.role, user.congregationRole)) return true;

  return false;
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
  if (canEditTerritory(user.role)) return true;
  return isUserAssignedToTerritory(user, assignments, userGroupIds);
}

/**
 * Resolves all assignments belonging to a user (direct personal or inherited through their service groups),
 * with fallback support for territories that are marked assigned/active directly on the territory document.
 */
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

  // 1. Check explicit records in the assignments collection (matching by userId, email, or serviceGroupId)
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

  // 2. Fallback: Also check congregation territories directly for any assigned territories
  // that may not have an explicit document in the assignments collection (matching strictly by publisherId, email, or groupId)
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

/**
 * Filters an assignment list for active assignments (status === 'assigned' or 'active').
 */
export function filterActiveAssignments(assignments: Assignment[]): Assignment[] {
  return assignments.filter((a) => {
    const s = a.status?.toLowerCase().trim();
    return s === 'assigned' || s === 'active';
  });
}

/**
 * Checks if the current user has full detail access (contact info, private notes) to a household.
 * Owners, accepted collaborators, read-only viewers, and congregation overseers/servants have access.
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
  if (canViewAllCongregationRecords(userRole)) return true;
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
 * Allowed for record Owner, Group Overseer / Assistant, or role Territory Servant / Service Overseer / Secretary / Admin.
 */
export function canShareHousehold(
  user: { id?: string | null; role?: string | null } | null | undefined,
  household?: { createdById?: string | null } | null,
  groups?: Array<{
    overseerId?: string | null;
    assistantOverseerId?: string | null;
    members?: Array<{ userId?: string | null; id?: string | null; role?: string | null }>;
  }>
): boolean {
  if (!user?.id) return false;
  if (canCreateTerritory(user.role) || canManageCongregation(user.role)) return true;
  if (!household) return false;
  if (household.createdById === user.id) return true;
  if (
    groups &&
    household.createdById &&
    isGroupLeaderOfUser(user.id, household.createdById, groups)
  ) {
    return true;
  }
  return false;
}

/**
 * Checks if a user is allowed to EDIT a household record's core details.
 * Allowed for record Owner, Group Overseer / Assistant, or role Territory Servant / Service Overseer / Secretary / Admin.
 */
export function canEditHousehold(
  user: { id?: string | null; role?: string | null } | null | undefined,
  household?: { createdById?: string | null } | null,
  groups?: Array<{
    overseerId?: string | null;
    assistantOverseerId?: string | null;
    members?: Array<{ userId?: string | null; id?: string | null; role?: string | null }>;
  }>
): boolean {
  if (!user?.id) return false;
  if (canCreateTerritory(user.role) || canManageCongregation(user.role)) return true;
  if (!household) return false;
  if (household.createdById === user.id) return true;
  if (
    groups &&
    household.createdById &&
    isGroupLeaderOfUser(user.id, household.createdById, groups)
  ) {
    return true;
  }
  return false;
}

/**
 * Checks if a user is allowed to DELETE a household record.
 * Allowed for record Owner, Group Overseer / Assistant, or role Territory Servant / Service Overseer / Admin.
 */
export function canDeleteHousehold(
  user: { id?: string | null; role?: string | null } | null | undefined,
  household?: { createdById?: string | null } | null,
  groups?: Array<{
    overseerId?: string | null;
    assistantOverseerId?: string | null;
    members?: Array<{ userId?: string | null; id?: string | null; role?: string | null }>;
  }>
): boolean {
  if (!user?.id) return false;
  if (canDeleteTerritory(user.role)) return true;
  if (!household) return false;
  if (household.createdById === user.id) return true;
  if (
    groups &&
    household.createdById &&
    isGroupLeaderOfUser(user.id, household.createdById, groups)
  ) {
    return true;
  }
  return false;
}

/**
 * Checks if a user is allowed to modify (edit, move, delete) a map studio annotation
 * (landmark, road corridor, territory boundary polygon, start meeting flag).
 * Allowed for:
 * 1. Annotation creator (annotation.createdById === user.id)
 * 2. Service Overseer, Territory Servant, or Admin (canEditTerritory)
 * 3. Group Overseer or Assistant Overseer of the creator
 */
export function canModifyMapAnnotation(
  user:
    | { id?: string | null; role?: string | null; congregationRole?: string | null }
    | null
    | undefined,
  annotation?: { createdById?: string | null } | null,
  groups?: Array<{
    overseerId?: string | null;
    assistantOverseerId?: string | null;
    members?: Array<{ userId?: string | null; id?: string | null; role?: string | null }>;
  }>
): boolean {
  if (!user?.id) return false;
  if (canEditTerritory(user.role, user.congregationRole)) return true;
  if (!annotation?.createdById) return false;
  if (annotation.createdById === user.id) return true;
  if (
    groups &&
    annotation.createdById &&
    isGroupLeaderOfUser(user.id, annotation.createdById, groups)
  ) {
    return true;
  }
  return false;
}

/**
 * Checks if a user is allowed to CREATE, EDIT, or DELETE territory boundaries.
 * Territory boundaries are administrative congregation territory boundaries.
 * Allowed strictly for Territory Servants, Service Overseers, and Admins (canEditTerritory).
 * Regular publishers and visiting publishers are NEVER allowed to handle boundaries.
 */
export function canModifyBoundary(
  user:
    | { id?: string | null; role?: string | null; congregationRole?: string | null }
    | null
    | undefined
): boolean {
  if (!user?.id) return false;
  return canEditTerritory(user.role, user.congregationRole);
}

/**
 * Checks if a user is allowed to log a visit or encounter for a household.
 * Allowed for Owner, Collaborator, Overseers/Servants, or Circuit Overseer / Visiting Publisher.
 */
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

/**
 * Checks if a user is allowed to EDIT a visit record (fix typos, notes, outcome, topics).
 * Allowed for:
 * 1. The original author who created the visit (visit.userId === user.id)
 * 2. The owner of the household (household.createdById === user.id)
 * 3. Territory Servant / Service Overseer / Admin (canEditTerritory)
 */
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

/**
 * Checks if a user is allowed to DELETE a visit record.
 * Allowed for:
 * 1. The original author who created the visit (visit.userId === user.id)
 * 2. The owner of the household (household.createdById === user.id)
 * 3. Territory Servant / Service Overseer / Admin (canDeleteTerritory)
 */
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

/**
 * Checks if a user is allowed to EDIT an encounter record (fix typos, notes, name, response).
 * Allowed for:
 * 1. The original author who created the encounter (encounter.userId === user.id)
 * 2. The owner of the household (household.createdById === user.id)
 * 3. Territory Servant / Service Overseer / Admin (canEditTerritory)
 */
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

/**
 * Checks if a user is allowed to DELETE an encounter record.
 * Allowed for:
 * 1. The original author who created the encounter (encounter.userId === user.id)
 * 2. The owner of the household (household.createdById === user.id)
 * 3. Territory Servant / Service Overseer / Admin (canDeleteTerritory)
 */
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
 * Checks if a user is authorized to view shared member locations on the map.
 * Territory Servants, Service Overseers, Secretaries, Admins, Super Admins, Circuit Overseers, and Group Overseers (and assistants) can view member locations.
 */
export function canViewMemberLocations(
  user:
    | { id?: string | null; role?: string | null; congregationRole?: string | null }
    | null
    | undefined,
  groups: Array<{
    overseerId?: string | null;
    assistantOverseerId?: string | null;
    members?: Array<{ userId?: string | null; id?: string | null; role?: string | null }>;
  }> = []
): boolean {
  if (!user?.id) return false;
  if (canViewReports(user.role, user.congregationRole)) {
    return true;
  }
  return groups.some((g) => isGroupOverseer(user.id, g) || isGroupOverseerAssistant(user.id, g));
}

/**
 * Checks if a member location is currently actively shared and has not expired.
 */
export function isLocationActive(loc: SharedMemberLocation, now: number = Date.now()): boolean {
  if (!loc?.isSharing) return false;
  if (loc.expiresAt) {
    const expTime = new Date(loc.expiresAt).getTime();
    if (!Number.isNaN(expTime) && expTime <= now) {
      return false;
    }
  }
  return true;
}

/**
 * Filters member locations based on the current user's role and group assignments:
 * - Only currently active, non-expired shared locations are visible (inactive locations disappear).
 * - Overseers, Secretaries, Territory Servants, Circuit Overseers, and Admins: Can view all actively shared member locations in the congregation.
 * - Group Overseers & Assistants: Can view active members belonging to their service group(s).
 * - Regular publishers: Can only see their own active shared location.
 */
export function filterVisibleMemberLocations(
  user:
    | {
        id?: string | null;
        role?: string | null;
        congregationRole?: string | null;
        email?: string | null;
        groupId?: string | null;
      }
    | null
    | undefined,
  groups: Array<{
    id?: string;
    overseerId?: string | null;
    assistantOverseerId?: string | null;
    members?: Array<{ userId?: string | null; id?: string | null; role?: string | null }>;
  }> = [],
  locations: SharedMemberLocation[] = [],
  now: number = Date.now()
): SharedMemberLocation[] {
  if (!user?.id || !locations || locations.length === 0) return [];

  // Filter out any locations that are not actively sharing or have expired
  const activeLocations = locations.filter((loc) => isLocationActive(loc, now));
  if (activeLocations.length === 0) return [];

  // Overseers, Secretaries, Territory Servants, Circuit Overseers, and Admins can view all active congregation members
  if (canViewReports(user.role, user.congregationRole)) {
    return activeLocations;
  }

  // Check if user is an overseer/assistant of any group
  const isAnyOverseer = groups.some(
    (g) => isGroupOverseer(user.id, g) || isGroupOverseerAssistant(user.id, g)
  );

  if (isAnyOverseer) {
    const overseenMemberIds = getOverseenGroupMateIds(user.id, groups);
    // Also include groups they are overseer of
    const overseenGroupIds = new Set<string>();
    for (const g of groups) {
      if (g.id && (isGroupOverseer(user.id, g) || isGroupOverseerAssistant(user.id, g))) {
        overseenGroupIds.add(g.id);
      }
    }

    return activeLocations.filter((loc) => {
      if (loc.userId === user.id) return true;
      if (overseenMemberIds.has(loc.userId)) return true;
      if (loc.groupId && overseenGroupIds.has(loc.groupId)) return true;
      return false;
    });
  }

  // Regular publisher: only see self
  return activeLocations.filter((loc) => loc.userId === user.id);
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
