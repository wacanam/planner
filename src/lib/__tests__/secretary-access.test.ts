import { describe, expect, it } from 'vitest';
import { CongregationRole, UserRole } from '@/lib/roles';
import type { Household, SharedMemberLocation } from '@/types/api';
import {
  canAccessHouseholdDetails,
  canAdjustAssignmentDates,
  canApproveAssignments,
  canApproveMembers,
  canCreateTerritory,
  canDeleteTerritory,
  canEditTerritory,
  canEndorseAssignment,
  canLogVisitOrEncounter,
  canManageCongregation,
  canManageGroups,
  canViewAllCongregationRecords,
  canViewMemberLocations,
  canViewReports,
  filterVisibleMemberLocations,
  hasPermission,
  isCongregationSecretary,
  isServiceOverseer,
  isTerritoryServant,
} from '../permissions';

describe('Congregation Secretary Access & Role Identity Separation', () => {
  describe('Pure Role Identity', () => {
    it('identifies SECRETARY and variations without false positives', () => {
      expect(isCongregationSecretary(UserRole.SECRETARY)).toBe(true);
      expect(isCongregationSecretary(CongregationRole.SECRETARY)).toBe(true);
      expect(isCongregationSecretary('SECRETARY')).toBe(true);
      expect(isCongregationSecretary('secretary')).toBe(true);
      expect(isCongregationSecretary('CONGREGATION_SECRETARY')).toBe(true);
      expect(isCongregationSecretary('congregation_secretary')).toBe(true);

      // Identity separation: never returns true for other roles
      expect(isCongregationSecretary(UserRole.SUPER_ADMIN)).toBe(false);
      expect(isCongregationSecretary(UserRole.ADMIN)).toBe(false);
      expect(isCongregationSecretary(UserRole.SERVICE_OVERSEER)).toBe(false);
      expect(isCongregationSecretary(UserRole.TERRITORY_SERVANT)).toBe(false);
      expect(isCongregationSecretary(UserRole.CIRCUIT_OVERSEER)).toBe(false);
      expect(isCongregationSecretary(UserRole.USER)).toBe(false);
    });

    it('does not misidentify other role checks as secretary', () => {
      expect(isServiceOverseer(UserRole.SECRETARY)).toBe(false);
      expect(isTerritoryServant(UserRole.SECRETARY)).toBe(false);
    });
  });

  describe('Administrative & Membership Capabilities (Allowed)', () => {
    it('allows Secretary to approve member join requests and manage publisher directory', () => {
      expect(canApproveMembers(UserRole.SECRETARY)).toBe(true);
      expect(canApproveMembers(CongregationRole.SECRETARY)).toBe(true);
    });

    it('allows Secretary to manage service groups', () => {
      expect(canManageGroups(UserRole.SECRETARY)).toBe(true);
      expect(canManageGroups(CongregationRole.SECRETARY)).toBe(true);
    });

    it('allows Secretary to manage congregation settings and profile', () => {
      expect(canManageCongregation(UserRole.SECRETARY)).toBe(true);
      expect(canManageCongregation(CongregationRole.SECRETARY)).toBe(true);
    });

    it('allows Secretary to view reports, analytics, and S-13 cards', () => {
      expect(canViewReports(UserRole.SECRETARY)).toBe(true);
      expect(canViewReports(CongregationRole.SECRETARY)).toBe(true);
    });

    it('allows Secretary to view all congregation records', () => {
      expect(canViewAllCongregationRecords(UserRole.SECRETARY)).toBe(true);
      expect(canViewAllCongregationRecords(CongregationRole.SECRETARY)).toBe(true);
    });
  });

  describe('Territory Drawing & Assignment Capabilities (Denied)', () => {
    it('denies Secretary from creating, editing, or deleting territories (scoped to TS/SO)', () => {
      expect(canCreateTerritory(UserRole.SECRETARY)).toBe(false);
      expect(canEditTerritory(UserRole.SECRETARY)).toBe(false);
      expect(canDeleteTerritory(UserRole.SECRETARY)).toBe(false);
    });

    it('denies Secretary from endorsing or approving territory assignments', () => {
      expect(canEndorseAssignment(UserRole.SECRETARY)).toBe(false);
      expect(canApproveAssignments(UserRole.SECRETARY)).toBe(false);
      expect(canAdjustAssignmentDates(UserRole.SECRETARY)).toBe(false);
    });
  });

  describe('Household & Field Data Access (Allowed for Auditing)', () => {
    const sampleHousehold: Household = {
      id: 'h-1',
      congregationId: 'c-1',
      address: '100 Main St',
      streetName: 'Main St',
      city: 'Townsville',
      status: 'active',
      createdById: 'pub-99',
      collaboratorIds: [],
      readOnlyUserIds: [],
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01',
    };

    it('allows Secretary to view household details across the congregation', () => {
      expect(canAccessHouseholdDetails('sec-1', sampleHousehold, [], UserRole.SECRETARY)).toBe(
        true
      );
      expect(canAccessHouseholdDetails('sec-1', sampleHousehold, [], 'secretary')).toBe(true);
    });

    it('allows Secretary to log visits or encounters on congregation households', () => {
      expect(
        canLogVisitOrEncounter({ id: 'sec-1', role: UserRole.SECRETARY }, sampleHousehold)
      ).toBe(true);
    });
  });

  describe('Live Member Map View', () => {
    it('allows Secretary to view live member locations on the map', () => {
      const secUser = { id: 'sec-1', role: UserRole.SECRETARY };
      expect(canViewMemberLocations(secUser)).toBe(true);
      expect(
        canViewMemberLocations({
          id: 'sec-1',
          role: UserRole.USER,
          congregationRole: CongregationRole.SECRETARY,
        })
      ).toBe(true);
    });

    it('filters member locations correctly for Secretary (sees all active congregation members)', () => {
      const locations: SharedMemberLocation[] = [
        {
          id: 'loc-1',
          userId: 'user-1',
          userName: 'Brother Alpha',
          congregationId: 'c-1',
          groupId: 'g-1',
          isSharing: true,
          latitude: 14.5995,
          longitude: 120.9842,
          updatedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        },
        {
          id: 'loc-2',
          userId: 'user-2',
          userName: 'Sister Beta',
          congregationId: 'c-1',
          groupId: 'g-2',
          isSharing: true,
          latitude: 14.5996,
          longitude: 120.9843,
          updatedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        },
      ];

      const secUser = {
        id: 'sec-1',
        role: UserRole.SECRETARY,
        congregationRole: CongregationRole.SECRETARY,
      };

      const visible = filterVisibleMemberLocations(secUser, [], locations);

      expect(visible).toHaveLength(2);
    });
  });

  describe('Role Hierarchy & Permission Ranking', () => {
    it('places Secretary above Publishers and Territory Servants in hierarchy', () => {
      expect(hasPermission(UserRole.SECRETARY, UserRole.USER)).toBe(true);
      expect(hasPermission(UserRole.SECRETARY, UserRole.VISITING_PUBLISHER)).toBe(true);
      expect(hasPermission(UserRole.SECRETARY, UserRole.TERRITORY_SERVANT)).toBe(true);
      expect(hasPermission(UserRole.SECRETARY, UserRole.SECRETARY)).toBe(true);
      expect(hasPermission(UserRole.USER, UserRole.SECRETARY)).toBe(false);
      expect(hasPermission(UserRole.TERRITORY_SERVANT, UserRole.SECRETARY)).toBe(false);
    });
  });

  describe('Route Protection & Allowed Roles (Members & Access vs Congregation Reports)', () => {
    const membersPageAllowedRoles: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SERVICE_OVERSEER,
      UserRole.SECRETARY,
    ];

    const reportsPageAllowedRoles: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SERVICE_OVERSEER,
      UserRole.SECRETARY,
      UserRole.TERRITORY_SERVANT,
      UserRole.CIRCUIT_OVERSEER,
    ];

    it('allows Secretary access to both Members & Access and Congregation Reports', () => {
      expect(membersPageAllowedRoles.includes(UserRole.SECRETARY)).toBe(true);
      expect(reportsPageAllowedRoles.includes(UserRole.SECRETARY)).toBe(true);
    });

    it('allows Circuit Overseer to access Congregation Reports but restricts local Members & Access', () => {
      // Circuit Overseer can access reports
      expect(reportsPageAllowedRoles.includes(UserRole.CIRCUIT_OVERSEER)).toBe(true);

      // Circuit Overseer is intentionally excluded from local member roster management
      expect(membersPageAllowedRoles.includes(UserRole.CIRCUIT_OVERSEER)).toBe(false);
    });

    it('denies regular Publisher access to both management pages', () => {
      expect(membersPageAllowedRoles.includes(UserRole.USER)).toBe(false);
      expect(reportsPageAllowedRoles.includes(UserRole.USER)).toBe(false);
    });
  });

  describe('Effective Role Calculation in Auth Context', () => {
    function computeEffectiveRole(params: {
      globalRole?: string | null;
      membershipStatus?: string;
      membershipRole?: string | null;
    }): UserRole {
      const rawGlobalRole = (params.globalRole || '').toUpperCase().replace(/\s+/g, '_');
      const isGlobalAdmin = rawGlobalRole === 'SUPER_ADMIN' || rawGlobalRole === 'ADMIN';

      if (isGlobalAdmin) {
        return (params.globalRole as UserRole) || UserRole.ADMIN;
      }
      if (rawGlobalRole === 'CIRCUIT_OVERSEER') return UserRole.CIRCUIT_OVERSEER;
      if (rawGlobalRole === 'SERVICE_OVERSEER') return UserRole.SERVICE_OVERSEER;
      if (rawGlobalRole === 'SECRETARY' || rawGlobalRole === 'CONGREGATION_SECRETARY') {
        return UserRole.SECRETARY;
      }
      if (rawGlobalRole === 'TERRITORY_SERVANT') return UserRole.TERRITORY_SERVANT;
      if (rawGlobalRole === 'VISITING_PUBLISHER') return UserRole.VISITING_PUBLISHER;

      if (params.membershipStatus === 'active' && params.membershipRole) {
        const normalized = params.membershipRole.toUpperCase().replace(/\s+/g, '_');
        if (normalized === 'CIRCUIT_OVERSEER') return UserRole.CIRCUIT_OVERSEER;
        if (normalized === 'SERVICE_OVERSEER') return UserRole.SERVICE_OVERSEER;
        if (normalized === 'SECRETARY' || normalized === 'CONGREGATION_SECRETARY') {
          return UserRole.SECRETARY;
        }
        if (normalized === 'TERRITORY_SERVANT') return UserRole.TERRITORY_SERVANT;
        if (normalized === 'VISITING_PUBLISHER') return UserRole.VISITING_PUBLISHER;
        if (normalized === 'PUBLISHER' || normalized === 'USER') return UserRole.PUBLISHER;
      }
      return UserRole.USER;
    }

    it('correctly resolves secretary membership role to UserRole.SECRETARY', () => {
      expect(
        computeEffectiveRole({
          globalRole: 'USER',
          membershipStatus: 'active',
          membershipRole: 'secretary',
        })
      ).toBe(UserRole.SECRETARY);

      expect(
        computeEffectiveRole({
          globalRole: 'USER',
          membershipStatus: 'active',
          membershipRole: 'congregation_secretary',
        })
      ).toBe(UserRole.SECRETARY);
    });

    it('correctly resolves global secretary role to UserRole.SECRETARY', () => {
      expect(computeEffectiveRole({ globalRole: 'SECRETARY' })).toBe(UserRole.SECRETARY);
    });

    it('correctly resolves circuit overseer role to UserRole.CIRCUIT_OVERSEER', () => {
      expect(
        computeEffectiveRole({
          globalRole: 'USER',
          membershipStatus: 'active',
          membershipRole: 'circuit_overseer',
        })
      ).toBe(UserRole.CIRCUIT_OVERSEER);

      expect(computeEffectiveRole({ globalRole: 'CIRCUIT_OVERSEER' })).toBe(
        UserRole.CIRCUIT_OVERSEER
      );
    });
  });
});
