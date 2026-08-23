import { describe, expect, it } from 'vitest';
import { CongregationRole, UserRole } from '@/lib/roles';
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
  isCongregationSecretary,
  isServiceOverseer,
  isTerritoryServant,
} from '../permissions';
import type { Household, SharedMemberLocation } from '@/types/api';

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
      expect(canAccessHouseholdDetails('sec-1', sampleHousehold, [], UserRole.SECRETARY)).toBe(true);
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
        canViewMemberLocations({ id: 'sec-1', role: UserRole.USER, congregationRole: CongregationRole.SECRETARY })
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
});
