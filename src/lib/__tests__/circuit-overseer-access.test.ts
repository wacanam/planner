import { describe, expect, it } from 'vitest';
import { CongregationRole, UserRole } from '@/lib/roles';
import type { Household, SharedMemberLocation } from '@/types/api';
import {
  canAccessHouseholdDetails,
  canCreateTerritory,
  canDeleteTerritory,
  canEditTerritory,
  canLogVisitOrEncounter,
  canViewMemberLocations,
  canViewReports,
  filterVisibleMemberLocations,
  hasPermission,
  isCircuitOverseer,
  isVisitingPublisher,
} from '../permissions';

describe('Circuit Overseer and Visiting Publisher Permissions', () => {
  describe('Role Identifiers', () => {
    it('correctly identifies CIRCUIT_OVERSEER role', () => {
      expect(isCircuitOverseer(UserRole.CIRCUIT_OVERSEER)).toBe(true);
      expect(isCircuitOverseer(CongregationRole.CIRCUIT_OVERSEER)).toBe(true);
      expect(isCircuitOverseer('CIRCUIT_OVERSEER')).toBe(true);
      expect(isCircuitOverseer('circuit_overseer')).toBe(true);
      expect(isCircuitOverseer(UserRole.SUPER_ADMIN)).toBe(false);
      expect(isCircuitOverseer(UserRole.ADMIN)).toBe(false);
      expect(isCircuitOverseer(UserRole.SERVICE_OVERSEER)).toBe(false);
      expect(isCircuitOverseer(UserRole.PUBLISHER)).toBe(false);
    });

    it('correctly identifies VISITING_PUBLISHER role', () => {
      expect(isVisitingPublisher(UserRole.VISITING_PUBLISHER)).toBe(true);
      expect(isVisitingPublisher(CongregationRole.VISITING_PUBLISHER)).toBe(true);
      expect(isVisitingPublisher('VISITING_PUBLISHER')).toBe(true);
      expect(isVisitingPublisher('visiting_publisher')).toBe(true);
      expect(isVisitingPublisher(UserRole.PUBLISHER)).toBe(false);
      expect(isVisitingPublisher(UserRole.CIRCUIT_OVERSEER)).toBe(false);
    });
  });

  describe('Role Hierarchy', () => {
    it('grants Circuit Overseer access above regular publishers and territory servants', () => {
      expect(hasPermission(UserRole.CIRCUIT_OVERSEER, UserRole.USER)).toBe(true);
      expect(hasPermission(UserRole.CIRCUIT_OVERSEER, UserRole.TERRITORY_SERVANT)).toBe(true);
      expect(hasPermission(UserRole.CIRCUIT_OVERSEER, UserRole.SERVICE_OVERSEER)).toBe(true);
    });

    it('places Visiting Publisher at publisher level', () => {
      expect(hasPermission(UserRole.VISITING_PUBLISHER, UserRole.USER)).toBe(true);
      expect(hasPermission(UserRole.VISITING_PUBLISHER, UserRole.TERRITORY_SERVANT)).toBe(false);
      expect(hasPermission(UserRole.USER, UserRole.VISITING_PUBLISHER)).toBe(false);
    });
  });

  describe('Report and Audit Access', () => {
    it('allows Circuit Overseer to view all congregation reports and S-13 forms', () => {
      expect(canViewReports(UserRole.CIRCUIT_OVERSEER)).toBe(true);
      expect(canViewReports(CongregationRole.CIRCUIT_OVERSEER)).toBe(true);
    });

    it('restricts administrative deletion/creation of territories to local servants while preserving CO audit', () => {
      expect(canCreateTerritory(UserRole.CIRCUIT_OVERSEER)).toBe(false);
      expect(canEditTerritory(UserRole.CIRCUIT_OVERSEER)).toBe(false);
      expect(canDeleteTerritory(UserRole.CIRCUIT_OVERSEER)).toBe(false);

      // Local servants still have full create/edit/delete
      expect(canCreateTerritory(UserRole.SERVICE_OVERSEER)).toBe(true);
      expect(canEditTerritory(UserRole.TERRITORY_SERVANT)).toBe(true);
    });
  });

  describe('Live Member Locations & Safety in Ministry', () => {
    const mockLocations: SharedMemberLocation[] = [
      {
        id: 'loc-1',
        congregationId: 'cong-1',
        userId: 'co-user',
        userName: 'Circuit Overseer',
        isSharing: true,
        latitude: 14.5995,
        longitude: 120.9842,
        updatedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
      {
        id: 'loc-2',
        congregationId: 'cong-1',
        userId: 'publisher-1',
        userName: 'Local Publisher',
        groupId: 'group-1',
        isSharing: true,
        latitude: 14.5996,
        longitude: 120.9843,
        updatedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
    ];

    it('allows Circuit Overseer to view all active member locations across the congregation', () => {
      const coUser = {
        id: 'co-user',
        role: UserRole.CIRCUIT_OVERSEER,
        congregationRole: CongregationRole.CIRCUIT_OVERSEER,
      };

      expect(canViewMemberLocations(coUser, [])).toBe(true);

      const visible = filterVisibleMemberLocations(coUser, [], mockLocations);
      expect(visible.length).toBe(2);
    });

    it('allows Visiting Publisher to share and view own location, and group mates when in a group', () => {
      const visitingUser = {
        id: 'visiting-wife',
        role: UserRole.VISITING_PUBLISHER,
        congregationRole: CongregationRole.VISITING_PUBLISHER,
        groupId: 'group-1',
      };

      const visibleSelf = filterVisibleMemberLocations(visitingUser, [], mockLocations);
      expect(visibleSelf.length).toBe(0);
    });
  });

  describe('Ministry & Household Logging', () => {
    const mockHousehold: Household = {
      id: 'h-1',
      congregationId: 'cong-1',
      territoryId: 't-1',
      address: '123 Main St',
      streetName: 'Main St',
      city: 'Metro City',
      createdById: 'local-pub',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
    };

    it('allows Circuit Overseer full read access to household details', () => {
      expect(
        canAccessHouseholdDetails('co-user', mockHousehold, [], UserRole.CIRCUIT_OVERSEER)
      ).toBe(true);
    });

    it('allows Circuit Overseer and Visiting Publisher to log visits and encounters during field ministry', () => {
      const coUser = { id: 'co-user', role: UserRole.CIRCUIT_OVERSEER };
      const visitingWife = { id: 'visiting-wife', role: UserRole.VISITING_PUBLISHER };

      expect(canLogVisitOrEncounter(coUser, mockHousehold)).toBe(true);

      const collabHousehold = { ...mockHousehold, collaboratorIds: ['visiting-wife'] };
      expect(canLogVisitOrEncounter(visitingWife, collabHousehold)).toBe(true);
    });
  });
});
