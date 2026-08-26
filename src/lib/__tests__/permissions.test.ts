import { describe, expect, it } from 'vitest';
import { UserRole } from '@/lib/roles';
import {
  canApproveMembers,
  canCreateTerritory,
  canDeleteHousehold,
  canDeleteTerritory,
  canEditHousehold,
  canEditTerritory,
  canEditTerritoryInStudio,
  canManageGroups,
  canModifyBoundary,
  canModifyMapAnnotation,
  canReturnAssignment,
  canViewReports,
  filterActiveAssignments,
  getUserGroupIds,
  hasPermission,
  hasRole,
  isCircuitOverseer,
  isCongregationSecretary,
  isGroupLeader,
  isGroupLeaderOfUser,
  isGroupOverseer,
  isGroupOverseerAssistant,
  isPublisher,
  isServiceOverseer,
  isSystemAdmin,
  isTerritoryServant,
  isUserAssignedToTerritory,
  isUserInGroup,
  isVisitingPublisher,
  resolveUserAssignments,
} from '../permissions';

describe('hasPermission', () => {
  it('USER cannot access TERRITORY_SERVANT routes', () => {
    expect(hasPermission(UserRole.USER, UserRole.TERRITORY_SERVANT)).toBe(false);
  });

  it('TERRITORY_SERVANT can access USER routes', () => {
    expect(hasPermission(UserRole.TERRITORY_SERVANT, UserRole.USER)).toBe(true);
  });

  it('SERVICE_OVERSEER can access TERRITORY_SERVANT routes', () => {
    expect(hasPermission(UserRole.SERVICE_OVERSEER, UserRole.TERRITORY_SERVANT)).toBe(true);
  });

  it('ADMIN can access SERVICE_OVERSEER routes', () => {
    expect(hasPermission(UserRole.ADMIN, UserRole.SERVICE_OVERSEER)).toBe(true);
  });

  it('SUPER_ADMIN can access any route', () => {
    expect(hasPermission(UserRole.SUPER_ADMIN, UserRole.ADMIN)).toBe(true);
    expect(hasPermission(UserRole.SUPER_ADMIN, UserRole.USER)).toBe(true);
  });

  it('USER cannot access ADMIN routes', () => {
    expect(hasPermission(UserRole.USER, UserRole.ADMIN)).toBe(false);
  });
});

describe('hasRole', () => {
  it('returns true when role is in allowedRoles', () => {
    expect(hasRole(UserRole.SERVICE_OVERSEER, UserRole.SERVICE_OVERSEER, UserRole.ADMIN)).toBe(
      true
    );
  });

  it('returns false when role is not in allowedRoles', () => {
    expect(hasRole(UserRole.USER, UserRole.SERVICE_OVERSEER, UserRole.ADMIN)).toBe(false);
  });
});

describe('Pure Role Identity Checks (Exact Match)', () => {
  it('identifies system admins correctly', () => {
    expect(isSystemAdmin(UserRole.SUPER_ADMIN)).toBe(true);
    expect(isSystemAdmin(UserRole.ADMIN)).toBe(true);
    expect(isSystemAdmin(UserRole.SERVICE_OVERSEER)).toBe(false);
    expect(isSystemAdmin(UserRole.SECRETARY)).toBe(false);
    expect(isSystemAdmin(UserRole.TERRITORY_SERVANT)).toBe(false);
    expect(isSystemAdmin(UserRole.USER)).toBe(false);
  });

  it('identifies service overseers with exact matching (no inheritance)', () => {
    expect(isServiceOverseer(UserRole.SERVICE_OVERSEER)).toBe(true);
    expect(isServiceOverseer(UserRole.SUPER_ADMIN)).toBe(false);
    expect(isServiceOverseer(UserRole.ADMIN)).toBe(false);
    expect(isServiceOverseer(UserRole.SECRETARY)).toBe(false);
    expect(isServiceOverseer(UserRole.TERRITORY_SERVANT)).toBe(false);
    expect(isServiceOverseer(UserRole.USER)).toBe(false);
  });

  it('identifies congregation secretaries with exact matching', () => {
    expect(isCongregationSecretary(UserRole.SECRETARY)).toBe(true);
    expect(isCongregationSecretary('SECRETARY')).toBe(true);
    expect(isCongregationSecretary('secretary')).toBe(true);
    expect(isCongregationSecretary('CONGREGATION_SECRETARY')).toBe(true);
    expect(isCongregationSecretary(UserRole.SERVICE_OVERSEER)).toBe(false);
    expect(isCongregationSecretary(UserRole.TERRITORY_SERVANT)).toBe(false);
    expect(isCongregationSecretary(UserRole.SUPER_ADMIN)).toBe(false);
  });

  it('identifies territory servants with exact matching (no inheritance)', () => {
    expect(isTerritoryServant(UserRole.TERRITORY_SERVANT)).toBe(true);
    expect(isTerritoryServant('TERRITORY_SERVANT')).toBe(true);
    expect(isTerritoryServant('territory_servant')).toBe(true);
    expect(isTerritoryServant(UserRole.SERVICE_OVERSEER)).toBe(false);
    expect(isTerritoryServant(UserRole.SUPER_ADMIN)).toBe(false);
    expect(isTerritoryServant(UserRole.SECRETARY)).toBe(false);
    expect(isTerritoryServant(UserRole.USER)).toBe(false);
  });

  it('identifies circuit overseers with exact matching', () => {
    expect(isCircuitOverseer(UserRole.CIRCUIT_OVERSEER)).toBe(true);
    expect(isCircuitOverseer(UserRole.SERVICE_OVERSEER)).toBe(false);
    expect(isCircuitOverseer(UserRole.SUPER_ADMIN)).toBe(false);
  });

  it('identifies visiting publishers with exact matching', () => {
    expect(isVisitingPublisher(UserRole.VISITING_PUBLISHER)).toBe(true);
    expect(isVisitingPublisher(UserRole.USER)).toBe(false);
  });

  it('identifies regular publishers correctly', () => {
    expect(isPublisher(UserRole.USER)).toBe(true);
    expect(isPublisher(UserRole.PUBLISHER)).toBe(true);
    expect(isPublisher(UserRole.SERVICE_OVERSEER)).toBe(false);
  });
});

describe('Action Capability Checks', () => {
  it('allows reports view to admins, service overseers, secretaries, territory servants, and circuit overseers', () => {
    expect(canViewReports(UserRole.SUPER_ADMIN)).toBe(true);
    expect(canViewReports(UserRole.ADMIN)).toBe(true);
    expect(canViewReports(UserRole.SERVICE_OVERSEER)).toBe(true);
    expect(canViewReports(UserRole.SECRETARY)).toBe(true);
    expect(canViewReports(UserRole.TERRITORY_SERVANT)).toBe(true);
    expect(canViewReports(UserRole.CIRCUIT_OVERSEER)).toBe(true);
    expect(canViewReports(UserRole.USER)).toBe(false);
  });

  it('allows member approvals and directory management to admins, service overseers, and secretaries', () => {
    expect(canApproveMembers(UserRole.SUPER_ADMIN)).toBe(true);
    expect(canApproveMembers(UserRole.ADMIN)).toBe(true);
    expect(canApproveMembers(UserRole.SERVICE_OVERSEER)).toBe(true);
    expect(canApproveMembers(UserRole.SECRETARY)).toBe(true);
    expect(canApproveMembers(UserRole.TERRITORY_SERVANT)).toBe(false);
    expect(canApproveMembers(UserRole.USER)).toBe(false);
  });

  it('allows service group management to admins, service overseers, and secretaries', () => {
    expect(canManageGroups(UserRole.SUPER_ADMIN)).toBe(true);
    expect(canManageGroups(UserRole.ADMIN)).toBe(true);
    expect(canManageGroups(UserRole.SERVICE_OVERSEER)).toBe(true);
    expect(canManageGroups(UserRole.SECRETARY)).toBe(true);
    expect(canManageGroups(UserRole.TERRITORY_SERVANT)).toBe(false);
    expect(canManageGroups(UserRole.USER)).toBe(false);
  });

  it('allows territory creation, editing, and deletion to admins, service overseers, and territory servants', () => {
    expect(canCreateTerritory(UserRole.SUPER_ADMIN)).toBe(true);
    expect(canCreateTerritory(UserRole.ADMIN)).toBe(true);
    expect(canCreateTerritory(UserRole.SERVICE_OVERSEER)).toBe(true);
    expect(canCreateTerritory(UserRole.TERRITORY_SERVANT)).toBe(true);
    expect(canCreateTerritory(UserRole.SECRETARY)).toBe(false);
    expect(canCreateTerritory(UserRole.USER)).toBe(false);

    expect(canEditTerritory(UserRole.SUPER_ADMIN)).toBe(true);
    expect(canEditTerritory(UserRole.ADMIN)).toBe(true);
    expect(canEditTerritory(UserRole.SERVICE_OVERSEER)).toBe(true);
    expect(canEditTerritory(UserRole.TERRITORY_SERVANT)).toBe(true);
    expect(canEditTerritory(UserRole.SECRETARY)).toBe(false);
    expect(canEditTerritory(UserRole.USER)).toBe(false);

    expect(canDeleteTerritory(UserRole.SUPER_ADMIN)).toBe(true);
    expect(canDeleteTerritory(UserRole.ADMIN)).toBe(true);
    expect(canDeleteTerritory(UserRole.SERVICE_OVERSEER)).toBe(true);
    expect(canDeleteTerritory(UserRole.TERRITORY_SERVANT)).toBe(true);
    expect(canDeleteTerritory(UserRole.SECRETARY)).toBe(false);
    expect(canDeleteTerritory(UserRole.USER)).toBe(false);
  });
});

describe('Group Roles and Territory Return Permissions', () => {
  const group = {
    id: 'g-1',
    overseerId: 'user-overseer',
    assistantOverseerId: 'user-assistant',
    members: [
      { userId: 'user-overseer', role: 'group_overseer' },
      { userId: 'user-assistant', role: 'assistant_overseer' },
      { userId: 'user-publisher', role: 'member' },
    ],
  };

  it('correctly identifies Group Overseer and Assistant', () => {
    expect(isGroupOverseer('user-overseer', group)).toBe(true);
    expect(isGroupOverseer('user-assistant', group)).toBe(false);
    expect(isGroupOverseer('user-publisher', group)).toBe(false);

    expect(isGroupOverseerAssistant('user-assistant', group)).toBe(true);
    expect(isGroupOverseerAssistant('user-overseer', group)).toBe(false);
    expect(isGroupOverseerAssistant('user-publisher', group)).toBe(false);
  });

  it('allows assigned Publisher, Group Overseer, Territory Servant, and Service Overseer to return assigned territory', () => {
    const personalAssignment = {
      userId: 'user-publisher',
      serviceGroupId: null,
    };
    const groupAssignment = {
      userId: null,
      serviceGroupId: 'g-1',
    };

    // Assigned publisher CAN return their own personal assignment
    expect(canReturnAssignment({ id: 'user-publisher', role: 'USER' }, personalAssignment)).toBe(
      true
    );

    // Another publisher CANNOT return someone else's personal assignment or group assignments
    expect(canReturnAssignment({ id: 'user-other', role: 'USER' }, personalAssignment)).toBe(
      false
    );
    expect(
      canReturnAssignment({ id: 'user-publisher', role: 'USER' }, groupAssignment, group)
    ).toBe(false);

    // Group Overseer CAN return group assignment
    expect(canReturnAssignment({ id: 'user-overseer', role: 'USER' }, groupAssignment, group)).toBe(
      true
    );

    // Assistant Overseer CANNOT return group assignment
    expect(
      canReturnAssignment({ id: 'user-assistant', role: 'USER' }, groupAssignment, group)
    ).toBe(false);

    // Service Overseer / Territory Servant CAN return any assignment
    expect(
      canReturnAssignment({ id: 'user-so', role: 'SERVICE_OVERSEER' }, personalAssignment)
    ).toBe(true);
    expect(
      canReturnAssignment({ id: 'user-ts', role: 'TERRITORY_SERVANT' }, personalAssignment)
    ).toBe(true);
    expect(
      canReturnAssignment({ id: 'user-so', role: 'SERVICE_OVERSEER' }, groupAssignment, group)
    ).toBe(true);
    expect(
      canReturnAssignment({ id: 'user-ts', role: 'TERRITORY_SERVANT' }, groupAssignment, group)
    ).toBe(true);
  });

  it('correctly includes Group Overseer and Assistant in getUserGroupIds even if not in members array', () => {
    const groupWithoutOverseerInMembers = {
      id: 'g-2',
      overseerId: 'user-overseer-2',
      assistantOverseerId: 'user-assistant-2',
      members: [
        { userId: 'user-pub-a', role: 'member' },
        { userId: 'user-pub-b', role: 'member' },
      ],
    };

    // Overseer is recognized as in group
    expect(isUserInGroup({ id: 'user-overseer-2' }, groupWithoutOverseerInMembers)).toBe(true);

    // Assistant is recognized as in group
    expect(isUserInGroup({ id: 'user-assistant-2' }, groupWithoutOverseerInMembers)).toBe(true);

    // Regular member in members array is in group
    expect(isUserInGroup({ id: 'user-pub-a' }, groupWithoutOverseerInMembers)).toBe(true);

    // Outsider is not in group
    expect(isUserInGroup({ id: 'user-outsider' }, groupWithoutOverseerInMembers)).toBe(false);

    // getUserGroupIds returns the group for the overseer
    const groupsList = [groupWithoutOverseerInMembers];
    const overseerGroups = getUserGroupIds({ id: 'user-overseer-2' }, groupsList);
    expect(overseerGroups.has('g-2')).toBe(true);

    // getUserGroupIds returns empty set for outsider
    const outsiderGroups = getUserGroupIds({ id: 'user-outsider' }, groupsList);
    expect(outsiderGroups.has('g-2')).toBe(false);
  });
});

describe('Territory Studio Permissions & Read-Only Access', () => {
  const assignments = [
    {
      id: 'a-1',
      territoryId: 't-1',
      userId: 'user-publisher-1',
      assigneeEmail: 'pub1@example.com',
      serviceGroupId: null,
      status: 'assigned',
    },
    {
      id: 'a-2',
      territoryId: 't-2',
      userId: null,
      assigneeEmail: null,
      serviceGroupId: 'group-north',
      status: 'assigned',
    },
    {
      id: 'a-3',
      territoryId: 't-3',
      userId: 'user-publisher-2',
      assigneeEmail: 'pub2@example.com',
      serviceGroupId: null,
      status: 'completed', // Inactive assignment
    },
  ];

  it('correctly checks if user is assigned to territory', () => {
    // Direct personal assignment matching userId
    expect(
      isUserAssignedToTerritory({ id: 'user-publisher-1', email: 'pub1@example.com' }, [
        assignments[0],
      ])
    ).toBe(true);

    // Direct personal assignment matching assigneeEmail
    expect(
      isUserAssignedToTerritory({ id: 'user-diff-id', email: 'pub1@example.com' }, [assignments[0]])
    ).toBe(true);

    // Service group assignment when user belongs to that group
    expect(
      isUserAssignedToTerritory(
        { id: 'user-group-member', email: 'member@example.com' },
        [assignments[1]],
        new Set(['group-north', 'group-south'])
      )
    ).toBe(true);

    // Service group assignment when user does NOT belong to group
    expect(
      isUserAssignedToTerritory(
        { id: 'user-other', email: 'other@example.com' },
        [assignments[1]],
        new Set(['group-south'])
      )
    ).toBe(false);

    // Inactive assignment (completed/returned) does NOT count as assigned
    expect(
      isUserAssignedToTerritory({ id: 'user-publisher-2', email: 'pub2@example.com' }, [
        assignments[2],
      ])
    ).toBe(false);

    // Empty assignments
    expect(
      isUserAssignedToTerritory({ id: 'user-publisher-1', email: 'pub1@example.com' }, [])
    ).toBe(false);
  });

  it('evaluates canEditTerritoryInStudio correctly for servants vs assigned/unassigned publishers', () => {
    // Territory Servants / Admins can ALWAYS edit any territory
    expect(
      canEditTerritoryInStudio(
        { id: 'user-ts', role: UserRole.TERRITORY_SERVANT },
        [] // No assignments
      )
    ).toBe(true);

    expect(
      canEditTerritoryInStudio(
        { id: 'user-so', role: UserRole.SERVICE_OVERSEER },
        [] // No assignments
      )
    ).toBe(true);

    expect(
      canEditTerritoryInStudio(
        { id: 'user-admin', role: UserRole.ADMIN },
        [] // No assignments
      )
    ).toBe(true);

    expect(
      canEditTerritoryInStudio(
        { id: 'user-super', role: UserRole.SUPER_ADMIN },
        [] // No assignments
      )
    ).toBe(true);

    // Assigned publisher CAN edit their assigned territory
    expect(
      canEditTerritoryInStudio(
        { id: 'user-publisher-1', role: UserRole.USER, email: 'pub1@example.com' },
        [assignments[0]]
      )
    ).toBe(true);

    // Group assigned publisher CAN edit their group territory
    expect(
      canEditTerritoryInStudio(
        { id: 'user-group-member', role: UserRole.USER, email: 'member@example.com' },
        [assignments[1]],
        ['group-north']
      )
    ).toBe(true);

    // Unassigned publisher CANNOT edit (read-only)
    expect(
      canEditTerritoryInStudio(
        { id: 'user-unassigned-pub', role: UserRole.USER, email: 'unassigned@example.com' },
        [assignments[0]] // Assigned to user-publisher-1, not this user
      )
    ).toBe(false);

    // Unassigned publisher with no assignments (available territory) -> read-only
    expect(
      canEditTerritoryInStudio(
        { id: 'user-pub', role: UserRole.USER, email: 'pub@example.com' },
        []
      )
    ).toBe(false);
  });

  describe('resolveUserAssignments & filterActiveAssignments', () => {
    const assignmentsList = [
      {
        id: 'a-1',
        territoryId: 't-1',
        congregationId: 'cong-1',
        userId: 'user-wave',
        assigneeEmail: 'wacanam20@gmail.com',
        serviceGroupId: null,
        status: 'pending_approval', // past / returned / pending
        coverageAtAssignment: '0',
        createdAt: '2026-08-01',
        assigneeName: 'Wave',
        groupName: null,
        assignedAt: '2026-08-01',
        dueAt: null,
        returnedAt: null,
        notes: null,
      },
      {
        id: 'a-2',
        territoryId: 't-2',
        congregationId: 'cong-1',
        userId: 'user-other-1',
        assigneeEmail: 'other1@gmail.com',
        serviceGroupId: null,
        status: 'assigned', // active assignment belonging to someone else
        coverageAtAssignment: '0',
        createdAt: '2026-08-01',
        assigneeName: 'Other 1',
        groupName: null,
        assignedAt: '2026-08-01',
        dueAt: null,
        returnedAt: null,
        notes: null,
      },
      {
        id: 'a-3',
        territoryId: 't-3',
        congregationId: 'cong-1',
        userId: 'user-other-2',
        assigneeEmail: 'other2@gmail.com',
        serviceGroupId: null,
        status: 'active', // active assignment belonging to someone else
        coverageAtAssignment: '0',
        createdAt: '2026-08-01',
        assigneeName: 'Other 2',
        groupName: null,
        assignedAt: '2026-08-01',
        dueAt: null,
        returnedAt: null,
        notes: null,
      },
      {
        id: 'a-4',
        territoryId: 't-4',
        congregationId: 'cong-1',
        userId: null,
        assigneeEmail: null,
        serviceGroupId: 'group-1',
        status: 'assigned', // group assignment for group-1
        coverageAtAssignment: '0',
        createdAt: '2026-08-01',
        assigneeName: null,
        groupName: 'Group-1',
        assignedAt: '2026-08-01',
        dueAt: null,
        returnedAt: null,
        notes: null,
      },
    ];

    it('correctly resolves 0 active assignments when user only has a pending/returned assignment', () => {
      const user = { id: 'user-wave', email: 'wacanam20@gmail.com' };
      const userGroupIds = new Set<string>(); // not in group-1

      // 3 active assignments exist in congregation (a-2, a-3, a-4), but none belong to Wave
      const userAssignments = resolveUserAssignments(
        user,
        assignmentsList,
        [],
        userGroupIds,
        'cong-1'
      );
      expect(userAssignments).toHaveLength(1);
      expect(userAssignments[0].id).toBe('a-1');

      const active = filterActiveAssignments(userAssignments);
      expect(active).toHaveLength(0);
    });

    it('resolves group-inherited assignments when user belongs to that group', () => {
      const user = { id: 'user-wave', email: 'wacanam20@gmail.com' };
      const userGroupIds = new Set(['group-1']);

      const userAssignments = resolveUserAssignments(
        user,
        assignmentsList,
        [],
        userGroupIds,
        'cong-1'
      );
      expect(userAssignments).toHaveLength(2); // a-1 (personal past) and a-4 (group active)

      const active = filterActiveAssignments(userAssignments);
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe('a-4');
    });

    it('falls back to territory document when assignment document is missing', () => {
      const user = { id: 'user-wave', email: 'wacanam20@gmail.com' };
      const territories = [
        {
          id: 't-5',
          number: '5',
          name: 'Territory 5',
          status: 'assigned',
          publisherId: 'user-wave',
          publisherName: 'Wave',
          congregationId: 'cong-1',
        } as any,
      ];

      const userAssignments = resolveUserAssignments(user, [], territories, new Set(), 'cong-1');
      expect(userAssignments).toHaveLength(1);
      expect(userAssignments[0].territoryId).toBe('t-5');

      const active = filterActiveAssignments(userAssignments);
      expect(active).toHaveLength(1);
    });
  });

  describe('canModifyMapAnnotation & Destructive Map Studio Permissions', () => {
    const groupA = {
      id: 'g-1',
      overseerId: 'overseer-1',
      assistantOverseerId: 'asst-1',
      members: [{ userId: 'member-1' }, { userId: 'member-2' }],
    };
    const groupB = {
      id: 'g-2',
      overseerId: 'overseer-2',
      members: [{ userId: 'member-3' }],
    };
    const groups = [groupA, groupB];

    const annotationCreatedByMember1 = {
      id: 'lm-1',
      createdById: 'member-1',
      label: 'Main Street Bakery',
    };

    it('allows creator publisher to modify their own annotation', () => {
      const creatorUser = { id: 'member-1', role: UserRole.USER };
      expect(canModifyMapAnnotation(creatorUser, annotationCreatedByMember1, groups)).toBe(true);
    });

    it('denies groupmate publisher from modifying other member annotation (read-only)', () => {
      const otherGroupmate = { id: 'member-2', role: UserRole.USER };
      expect(canModifyMapAnnotation(otherGroupmate, annotationCreatedByMember1, groups)).toBe(
        false
      );
    });

    it('denies publisher from different group from modifying annotation', () => {
      const differentGroupMember = { id: 'member-3', role: UserRole.USER };
      expect(canModifyMapAnnotation(differentGroupMember, annotationCreatedByMember1, groups)).toBe(
        false
      );
    });

    it('allows Group Overseer of creator group to modify annotation', () => {
      const groupOverseer = { id: 'overseer-1', role: UserRole.USER };
      expect(canModifyMapAnnotation(groupOverseer, annotationCreatedByMember1, groups)).toBe(true);
    });

    it('allows Assistant Overseer of creator group to modify annotation', () => {
      const asstOverseer = { id: 'asst-1', role: UserRole.USER };
      expect(canModifyMapAnnotation(asstOverseer, annotationCreatedByMember1, groups)).toBe(true);
    });

    it('denies Group Overseer of another group from modifying annotation', () => {
      const otherGroupOverseer = { id: 'overseer-2', role: UserRole.USER };
      expect(canModifyMapAnnotation(otherGroupOverseer, annotationCreatedByMember1, groups)).toBe(
        false
      );
    });

    it('allows Service Overseer to modify any annotation', () => {
      const serviceOverseer = { id: 'so-1', role: UserRole.SERVICE_OVERSEER };
      expect(canModifyMapAnnotation(serviceOverseer, annotationCreatedByMember1, groups)).toBe(
        true
      );
    });

    it('allows Territory Servant to modify any annotation', () => {
      const territoryServant = { id: 'ts-1', role: UserRole.TERRITORY_SERVANT };
      expect(canModifyMapAnnotation(territoryServant, annotationCreatedByMember1, groups)).toBe(
        true
      );
    });

    it('allows Super Admin to modify any annotation', () => {
      const superAdmin = { id: 'admin-1', role: UserRole.SUPER_ADMIN };
      expect(canModifyMapAnnotation(superAdmin, annotationCreatedByMember1, groups)).toBe(true);
    });

    it('denies regular publisher from modifying annotation if createdById is missing or different', () => {
      const regularUser = { id: 'pub-1', role: UserRole.USER };
      expect(canModifyMapAnnotation(regularUser, { createdById: null }, groups)).toBe(false);
      expect(canModifyMapAnnotation(regularUser, null, groups)).toBe(false);
    });
  });

  describe('canModifyBoundary & Territory Demarcation Restrictions', () => {
    it('denies regular publishers from creating or modifying territory boundaries', () => {
      expect(canModifyBoundary({ id: 'p-1', role: UserRole.USER })).toBe(false);
      expect(canModifyBoundary({ id: 'p-2', role: UserRole.PUBLISHER })).toBe(false);
      expect(canModifyBoundary({ id: 'p-3', role: UserRole.VISITING_PUBLISHER })).toBe(false);
    });

    it('denies Congregation Secretary from creating or modifying territory boundaries (scoped to TS/SO)', () => {
      expect(canModifyBoundary({ id: 'sec-1', role: UserRole.SECRETARY })).toBe(false);
    });

    it('allows Territory Servant, Service Overseer, and Admin to create or modify territory boundaries', () => {
      expect(canModifyBoundary({ id: 'ts-1', role: UserRole.TERRITORY_SERVANT })).toBe(true);
      expect(canModifyBoundary({ id: 'so-1', role: UserRole.SERVICE_OVERSEER })).toBe(true);
      expect(canModifyBoundary({ id: 'adm-1', role: UserRole.ADMIN })).toBe(true);
      expect(canModifyBoundary({ id: 'sadm-1', role: UserRole.SUPER_ADMIN })).toBe(true);
    });
  });

  describe('canEditHousehold & canDeleteHousehold group leader scoping', () => {
    const groups = [
      {
        id: 'g-1',
        overseerId: 'overseer-1',
        assistantOverseerId: 'asst-1',
        members: [{ userId: 'member-1' }, { userId: 'member-2' }],
      },
    ];
    const household = { id: 'h-1', createdById: 'member-1' };

    it('allows creator to edit and delete household', () => {
      const creator = { id: 'member-1', role: UserRole.USER };
      expect(canEditHousehold(creator, household, groups)).toBe(true);
      expect(canDeleteHousehold(creator, household, groups)).toBe(true);
    });

    it('denies regular groupmate from editing or deleting household (read-only view)', () => {
      const groupmate = { id: 'member-2', role: UserRole.USER };
      expect(canEditHousehold(groupmate, household, groups)).toBe(false);
      expect(canDeleteHousehold(groupmate, household, groups)).toBe(false);
    });

    it('allows Group Overseer to edit and delete member household', () => {
      const overseer = { id: 'overseer-1', role: UserRole.USER };
      expect(canEditHousehold(overseer, household, groups)).toBe(true);
      expect(canDeleteHousehold(overseer, household, groups)).toBe(true);
    });

    it('allows Assistant Overseer to edit and delete member household', () => {
      const asst = { id: 'asst-1', role: UserRole.USER };
      expect(canEditHousehold(asst, household, groups)).toBe(true);
      expect(canDeleteHousehold(asst, household, groups)).toBe(true);
    });
  });
});
