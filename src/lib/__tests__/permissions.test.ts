import { describe, expect, it } from 'vitest';
import { UserRole } from '@/lib/roles';
import {
  canEditTerritoryInStudio,
  canReturnAssignment,
  canViewReports,
  hasPermission,
  hasRole,
  isGroupOverseer,
  isGroupOverseerAssistant,
  isServiceOverseer,
  isSystemAdmin,
  isTerritoryServant,
  isUserAssignedToTerritory,
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

describe('RBAC Matrix Helper Functions', () => {
  it('identifies system admins correctly', () => {
    expect(isSystemAdmin(UserRole.SUPER_ADMIN)).toBe(true);
    expect(isSystemAdmin(UserRole.ADMIN)).toBe(true);
    expect(isSystemAdmin(UserRole.SERVICE_OVERSEER)).toBe(false);
    expect(isSystemAdmin(UserRole.USER)).toBe(false);
  });

  it('identifies service overseers and higher', () => {
    expect(isServiceOverseer(UserRole.SUPER_ADMIN)).toBe(true);
    expect(isServiceOverseer(UserRole.SERVICE_OVERSEER)).toBe(true);
    expect(isServiceOverseer(UserRole.TERRITORY_SERVANT)).toBe(false);
    expect(isServiceOverseer(UserRole.USER)).toBe(false);
  });

  it('identifies territory servants and higher (can draw boundary and create territories)', () => {
    expect(isTerritoryServant(UserRole.SUPER_ADMIN)).toBe(true);
    expect(isTerritoryServant(UserRole.SERVICE_OVERSEER)).toBe(true);
    expect(isTerritoryServant(UserRole.TERRITORY_SERVANT)).toBe(true);
    expect(isTerritoryServant(UserRole.USER)).toBe(false);
  });

  it('allows territory servant and higher to view reports', () => {
    expect(canViewReports(UserRole.SUPER_ADMIN)).toBe(true);
    expect(canViewReports(UserRole.ADMIN)).toBe(true);
    expect(canViewReports(UserRole.SERVICE_OVERSEER)).toBe(true);
    expect(canViewReports(UserRole.TERRITORY_SERVANT)).toBe(true);
    expect(canViewReports(UserRole.USER)).toBe(false);
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

  it('allows assignee to return personal assignment', () => {
    const personalAssignment = {
      userId: 'user-publisher',
      serviceGroupId: null,
    };
    expect(canReturnAssignment({ id: 'user-publisher', role: 'USER' }, personalAssignment)).toBe(
      true
    );
    expect(canReturnAssignment({ id: 'user-other', role: 'USER' }, personalAssignment)).toBe(false);
  });

  it('only allows Group Overseer (or Service Overseer/Servant) to return group assigned territory', () => {
    const groupAssignment = {
      userId: null,
      serviceGroupId: 'g-1',
    };

    // Group Overseer CAN return
    expect(canReturnAssignment({ id: 'user-overseer', role: 'USER' }, groupAssignment, group)).toBe(
      true
    );

    // Assistant Overseer CANNOT return
    expect(
      canReturnAssignment({ id: 'user-assistant', role: 'USER' }, groupAssignment, group)
    ).toBe(false);

    // Regular Publisher in group CANNOT return
    expect(
      canReturnAssignment({ id: 'user-publisher', role: 'USER' }, groupAssignment, group)
    ).toBe(false);

    // Service Overseer / Territory Servant CAN return
    expect(
      canReturnAssignment({ id: 'user-so', role: 'SERVICE_OVERSEER' }, groupAssignment, group)
    ).toBe(true);
    expect(
      canReturnAssignment({ id: 'user-ts', role: 'TERRITORY_SERVANT' }, groupAssignment, group)
    ).toBe(true);
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
      isUserAssignedToTerritory(
        { id: 'user-publisher-1', email: 'pub1@example.com' },
        [assignments[0]]
      )
    ).toBe(true);

    // Direct personal assignment matching assigneeEmail
    expect(
      isUserAssignedToTerritory(
        { id: 'user-diff-id', email: 'pub1@example.com' },
        [assignments[0]]
      )
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
      isUserAssignedToTerritory(
        { id: 'user-publisher-2', email: 'pub2@example.com' },
        [assignments[2]]
      )
    ).toBe(false);

    // Empty assignments
    expect(
      isUserAssignedToTerritory(
        { id: 'user-publisher-1', email: 'pub1@example.com' },
        []
      )
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
});

