import { describe, expect, it } from 'vitest';
import { filterEncounter, toEncounterView } from '@/lib/local-first/encounters';
import { filterHousehold, toHouseholdView } from '@/lib/local-first/households';
import type { LocalEncounter, LocalHousehold, LocalVisit } from '@/lib/local-first/types';
import { filterVisit, toVisitView } from '@/lib/local-first/visits';
import { hasCongregationAccess, isSystemAdmin } from '@/lib/permissions';
import { UserRole } from '@/lib/roles';

describe('Congregation Isolation & Super Admin Global Access', () => {
  describe('isSystemAdmin', () => {
    it('recognizes SUPER_ADMIN and ADMIN roles as system admins', () => {
      expect(isSystemAdmin(UserRole.SUPER_ADMIN)).toBe(true);
      expect(isSystemAdmin(UserRole.ADMIN)).toBe(true);
      expect(isSystemAdmin('SUPER_ADMIN')).toBe(true);
      expect(isSystemAdmin('ADMIN')).toBe(true);
      expect(isSystemAdmin('super_admin')).toBe(true);
      expect(isSystemAdmin('admin')).toBe(true);
    });

    it('denies system admin access to standard roles', () => {
      expect(isSystemAdmin(UserRole.USER)).toBe(false);
      expect(isSystemAdmin(UserRole.TERRITORY_SERVANT)).toBe(false);
      expect(isSystemAdmin(UserRole.SERVICE_OVERSEER)).toBe(false);
      expect(isSystemAdmin(UserRole.CIRCUIT_OVERSEER)).toBe(false);
      expect(isSystemAdmin(UserRole.VISITING_PUBLISHER)).toBe(false);
      expect(isSystemAdmin(null)).toBe(false);
      expect(isSystemAdmin(undefined)).toBe(false);
    });
  });

  describe('hasCongregationAccess', () => {
    it('grants global access across all congregations to Super Admins and Admins', () => {
      const superAdmin = { role: UserRole.SUPER_ADMIN, congregationId: 'cong-alpha' };
      const admin = { role: UserRole.ADMIN, congregationId: null };

      expect(hasCongregationAccess(superAdmin, 'cong-alpha')).toBe(true);
      expect(hasCongregationAccess(superAdmin, 'cong-beta')).toBe(true);
      expect(hasCongregationAccess(superAdmin, 'cong-random-999')).toBe(true);
      expect(hasCongregationAccess(superAdmin, null)).toBe(true);

      expect(hasCongregationAccess(admin, 'cong-alpha')).toBe(true);
      expect(hasCongregationAccess(admin, 'cong-beta')).toBe(true);
    });

    it('restricts regular publishers and overseers to their own congregation', () => {
      const userA = { role: UserRole.USER, congregationId: 'cong-alpha' };
      const overseerA = { role: UserRole.SERVICE_OVERSEER, congregationId: 'cong-alpha' };
      const servantA = { role: UserRole.TERRITORY_SERVANT, congregationId: 'cong-alpha' };

      // Access to own congregation
      expect(hasCongregationAccess(userA, 'cong-alpha')).toBe(true);
      expect(hasCongregationAccess(overseerA, 'cong-alpha')).toBe(true);
      expect(hasCongregationAccess(servantA, 'cong-alpha')).toBe(true);

      // Deny access to other congregations
      expect(hasCongregationAccess(userA, 'cong-beta')).toBe(false);
      expect(hasCongregationAccess(overseerA, 'cong-beta')).toBe(false);
      expect(hasCongregationAccess(servantA, 'cong-gamma')).toBe(false);

      // Deny access when target is null
      expect(hasCongregationAccess(userA, null)).toBe(false);
      expect(hasCongregationAccess(userA, undefined)).toBe(false);
    });

    it('denies access if user has no congregation assigned', () => {
      const unassignedUser = { role: UserRole.USER, congregationId: null };
      expect(hasCongregationAccess(unassignedUser, 'cong-alpha')).toBe(false);
      expect(hasCongregationAccess(null, 'cong-alpha')).toBe(false);
      expect(hasCongregationAccess(undefined, 'cong-alpha')).toBe(false);
    });
  });

  describe('Local Record Filters for Multi-Tenancy', () => {
    const mockHouseholdAlpha: LocalHousehold = {
      id: 'hh-1',
      serverId: 'hh-1',
      congregationId: 'cong-alpha',
      territoryId: 't-1',
      name: 'Family Alpha',
      address: '123 Main St',
      houseNumber: '123',
      unitNumber: null,
      streetName: 'Main St',
      city: 'Metro',
      postalCode: null,
      country: null,
      latitude: null,
      longitude: null,
      type: 'house',
      floor: null,
      occupantsCount: null,
      languages: null,
      bestTimeToCall: null,
      status: 'new',
      lastVisitDate: null,
      lastVisitOutcome: null,
      notes: null,
      lwpNotes: null,
      createdById: 'user-1',
      creatorName: 'User One',
      collaboratorIds: null,
      readOnlyUserIds: null,
      transferredFrom: null,
      transferredFromId: null,
      transferredAt: null,
      updatedById: null,
      deletedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const mockHouseholdBeta: LocalHousehold = {
      ...mockHouseholdAlpha,
      id: 'hh-2',
      serverId: 'hh-2',
      congregationId: 'cong-beta',
      name: 'Family Beta',
    };

    it('filters households strictly by congregationId', () => {
      expect(filterHousehold(mockHouseholdAlpha, { congregationId: 'cong-alpha' })).toBe(true);
      expect(filterHousehold(mockHouseholdAlpha, { congregationId: 'cong-beta' })).toBe(false);
      expect(filterHousehold(mockHouseholdBeta, { congregationId: 'cong-alpha' })).toBe(false);
      expect(filterHousehold(mockHouseholdBeta, { congregationId: 'cong-beta' })).toBe(true);
    });

    const mockVisitAlpha: LocalVisit = {
      id: 'vis-1',
      serverId: 'vis-1',
      congregationId: 'cong-alpha',
      householdId: 'hh-1',
      householdServerId: 'hh-1',
      userId: 'user-1',
      visitDate: '2026-01-01T10:00:00.000Z',
      outcome: 'answered',
      householdStatusBefore: 'new',
      householdStatusAfter: 'active',
      duration: 15,
      literatureLeft: 'Magazine',
      bibleTopicDiscussed: 'Future hope',
      returnVisitPlanned: true,
      nextVisitDate: '2026-01-08',
      nextVisitTime: null,
      nextVisitNotes: null,
      assignmentId: null,
      notes: 'Good conversation',
      deletedAt: null,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    };

    const mockVisitBeta: LocalVisit = {
      ...mockVisitAlpha,
      id: 'vis-2',
      serverId: 'vis-2',
      congregationId: 'cong-beta',
      householdId: 'hh-2',
    };

    it('filters visits strictly by congregationId', () => {
      expect(filterVisit(mockVisitAlpha, { congregationId: 'cong-alpha' })).toBe(true);
      expect(filterVisit(mockVisitAlpha, { congregationId: 'cong-beta' })).toBe(false);
      expect(filterVisit(mockVisitBeta, { congregationId: 'cong-alpha' })).toBe(false);
      expect(filterVisit(mockVisitBeta, { congregationId: 'cong-beta' })).toBe(true);
    });

    const mockEncounterAlpha: LocalEncounter = {
      id: 'enc-1',
      serverId: 'enc-1',
      congregationId: 'cong-alpha',
      userId: 'user-1',
      visitId: 'vis-1',
      visitServerId: 'vis-1',
      householdId: 'hh-1',
      householdServerId: 'hh-1',
      contactId: null,
      contactServerId: null,
      encounterDate: '2026-01-01T10:00:00.000Z',
      name: 'John Doe',
      gender: 'male',
      ageGroup: 'adult',
      role: 'householder',
      response: 'interested',
      languageSpoken: 'English',
      topicDiscussed: 'Bible truth',
      literatureAccepted: 'Watchtower',
      bibleStudyInterest: true,
      returnVisitRequested: true,
      nextVisitNotes: null,
      notes: null,
      deletedAt: null,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    };

    const mockEncounterBeta: LocalEncounter = {
      ...mockEncounterAlpha,
      id: 'enc-2',
      serverId: 'enc-2',
      congregationId: 'cong-beta',
      householdId: 'hh-2',
    };

    it('filters encounters strictly by congregationId', () => {
      expect(filterEncounter(mockEncounterAlpha, { congregationId: 'cong-alpha' })).toBe(true);
      expect(filterEncounter(mockEncounterAlpha, { congregationId: 'cong-beta' })).toBe(false);
      expect(filterEncounter(mockEncounterBeta, { congregationId: 'cong-alpha' })).toBe(false);
      expect(filterEncounter(mockEncounterBeta, { congregationId: 'cong-beta' })).toBe(true);
    });

    it('maps views preserving congregationId and parent household properties', () => {
      const hView = toHouseholdView(mockHouseholdAlpha);
      expect(hView.congregationId).toBe('cong-alpha');
      expect(hView.address).toBe('123 Main St');

      const vView = toVisitView(mockVisitAlpha, mockHouseholdAlpha);
      expect(vView.congregationId).toBe('cong-alpha');
      expect(vView.householdAddress).toBe('123 Main St');
      expect(vView.outcome).toBe('answered');

      const eView = toEncounterView(mockEncounterAlpha, mockHouseholdAlpha, mockVisitAlpha);
      expect(eView.congregationId).toBe('cong-alpha');
      expect(eView.householdAddress).toBe('123 Main St');
      expect(eView.response).toBe('interested');
    });

    it('resolves congregationId for legacy visits and encounters lacking direct congregationId via parent household', () => {
      const legacyVisitWithoutCongId: LocalVisit = {
        ...mockVisitAlpha,
        congregationId: undefined,
      };
      const legacyEncounterWithoutCongId: LocalEncounter = {
        ...mockEncounterAlpha,
        congregationId: undefined,
      };

      // When mapped to views using the parent household, congregationId is backward-compatibly resolved
      const vView = toVisitView(legacyVisitWithoutCongId, mockHouseholdAlpha);
      expect(vView.congregationId).toBe('cong-alpha');
      expect(vView.householdAddress).toBe('123 Main St');

      const eView = toEncounterView(legacyEncounterWithoutCongId, mockHouseholdAlpha, legacyVisitWithoutCongId);
      expect(eView.congregationId).toBe('cong-alpha');
      expect(eView.householdAddress).toBe('123 Main St');

      // Filter passes when matching by householdId or when congregationId is resolved
      expect(filterVisit(legacyVisitWithoutCongId, { householdId: 'hh-1' })).toBe(true);
      expect(filterEncounter(legacyEncounterWithoutCongId, { householdId: 'hh-1' })).toBe(true);
    });
  });
});
