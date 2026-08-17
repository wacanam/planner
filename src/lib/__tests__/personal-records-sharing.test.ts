import { describe, expect, it } from 'vitest';
import { filterHousehold, toHouseholdView } from '@/lib/local-first/households';
import type { LocalHousehold } from '@/lib/local-first/types';
import {
  canAccessHouseholdDetails,
  canDeleteHousehold,
  canEditHousehold,
  canLogVisitOrEncounter,
  canShareHousehold,
} from '@/lib/permissions';
import { UserRole } from '@/lib/roles';
import type { Household, HouseholdShare } from '@/types/api';

const mockBaseLocalHousehold: LocalHousehold = {
  id: 'hh-1',
  serverId: 'hh-1',
  congregationId: 'cong-1',
  territoryId: 't-1',
  name: 'Family Smith',
  address: '123 Main St',
  houseNumber: '123',
  unitNumber: null,
  streetName: 'Main St',
  city: 'Metropolis',
  postalCode: '12345',
  country: 'USA',
  latitude: '40.7128',
  longitude: '-74.0060',
  type: 'house',
  floor: 1,
  occupantsCount: 4,
  languages: 'English',
  bestTimeToCall: 'Evenings',
  status: 'active',
  lastVisitDate: '2026-08-10T10:00:00Z',
  lastVisitOutcome: 'answered',
  notes: 'Friendly conversation',
  lwpNotes: null,
  createdById: 'user-alice',
  creatorName: 'Alice Publisher',
  collaboratorIds: ['user-bob'],
  readOnlyUserIds: ['user-charlie'],
  transferredFrom: null,
  transferredFromId: null,
  transferredAt: null,
  updatedById: 'user-alice',
  deletedAt: null,
  createdAt: '2026-08-01T10:00:00Z',
  updatedAt: '2026-08-10T10:00:00Z',
};

const mockHouseholdView: Household = toHouseholdView(mockBaseLocalHousehold);

describe('Personal Records Scoping & Filtering', () => {
  it('allows the owner to see their personal household', () => {
    const visible = filterHousehold(mockBaseLocalHousehold, {
      userId: 'user-alice',
      userRole: UserRole.PUBLISHER,
      personalOnly: true,
    });
    expect(visible).toBe(true);
  });

  it('allows an accepted collaborator to see the household', () => {
    const visible = filterHousehold(mockBaseLocalHousehold, {
      userId: 'user-bob',
      userRole: UserRole.PUBLISHER,
      personalOnly: true,
    });
    expect(visible).toBe(true);
  });

  it('allows an accepted read-only viewer to see the household', () => {
    const visible = filterHousehold(mockBaseLocalHousehold, {
      userId: 'user-charlie',
      userRole: UserRole.PUBLISHER,
      personalOnly: true,
    });
    expect(visible).toBe(true);
  });

  it('hides the record from an unrelated publisher', () => {
    const visible = filterHousehold(mockBaseLocalHousehold, {
      userId: 'user-stranger',
      userRole: UserRole.PUBLISHER,
      personalOnly: true,
    });
    expect(visible).toBe(false);
  });

  it('allows a Territory Servant / Admin to see all congregation households regardless of ownership', () => {
    const visibleTS = filterHousehold(mockBaseLocalHousehold, {
      userId: 'user-servant',
      userRole: UserRole.TERRITORY_SERVANT,
      personalOnly: true,
    });
    expect(visibleTS).toBe(true);

    const visibleAdmin = filterHousehold(mockBaseLocalHousehold, {
      userId: 'user-admin',
      userRole: UserRole.ADMIN,
      personalOnly: true,
    });
    expect(visibleAdmin).toBe(true);
  });

  it('correctly maps transferred metadata in toHouseholdView', () => {
    const transferredRecord: LocalHousehold = {
      ...mockBaseLocalHousehold,
      id: 'hh-2',
      createdById: 'user-bob',
      creatorName: 'Bob Publisher',
      transferredFrom: 'Alice Publisher',
      transferredFromId: 'user-alice',
      transferredAt: '2026-08-15T12:00:00Z',
    };
    const view = toHouseholdView(transferredRecord);
    expect(view.createdById).toBe('user-bob');
    expect(view.transferredFrom).toBe('Alice Publisher');
    expect(view.transferredFromId).toBe('user-alice');
  });
});

describe('Action Permission Enforcement (Owner or Territory Servant+)', () => {
  const alice = { id: 'user-alice', role: UserRole.PUBLISHER };
  const bob = { id: 'user-bob', role: UserRole.PUBLISHER }; // Collaborator
  const charlie = { id: 'user-charlie', role: UserRole.PUBLISHER }; // Read-only
  const territoryServant = { id: 'user-ts', role: UserRole.TERRITORY_SERVANT };
  const serviceOverseer = { id: 'user-so', role: UserRole.SERVICE_OVERSEER };
  const stranger = { id: 'user-stranger', role: UserRole.PUBLISHER };

  describe('canShareHousehold', () => {
    it('allows owner to share', () => {
      expect(canShareHousehold(alice, mockHouseholdView)).toBe(true);
    });

    it('denies collaborator from sharing', () => {
      expect(canShareHousehold(bob, mockHouseholdView)).toBe(false);
    });

    it('denies read-only viewer from sharing', () => {
      expect(canShareHousehold(charlie, mockHouseholdView)).toBe(false);
    });

    it('allows Territory Servant and Service Overseer to share', () => {
      expect(canShareHousehold(territoryServant, mockHouseholdView)).toBe(true);
      expect(canShareHousehold(serviceOverseer, mockHouseholdView)).toBe(true);
    });

    it('denies stranger from sharing', () => {
      expect(canShareHousehold(stranger, mockHouseholdView)).toBe(false);
    });
  });

  describe('canEditHousehold', () => {
    it('allows owner to edit', () => {
      expect(canEditHousehold(alice, mockHouseholdView)).toBe(true);
    });

    it('denies collaborator from editing household core details', () => {
      expect(canEditHousehold(bob, mockHouseholdView)).toBe(false);
    });

    it('denies read-only viewer from editing', () => {
      expect(canEditHousehold(charlie, mockHouseholdView)).toBe(false);
    });

    it('allows Territory Servant and Service Overseer to edit', () => {
      expect(canEditHousehold(territoryServant, mockHouseholdView)).toBe(true);
      expect(canEditHousehold(serviceOverseer, mockHouseholdView)).toBe(true);
    });
  });

  describe('canDeleteHousehold', () => {
    it('allows owner to delete', () => {
      expect(canDeleteHousehold(alice, mockHouseholdView)).toBe(true);
    });

    it('denies collaborator from deleting', () => {
      expect(canDeleteHousehold(bob, mockHouseholdView)).toBe(false);
    });

    it('denies read-only viewer from deleting', () => {
      expect(canDeleteHousehold(charlie, mockHouseholdView)).toBe(false);
    });

    it('allows Territory Servant and Service Overseer to delete', () => {
      expect(canDeleteHousehold(territoryServant, mockHouseholdView)).toBe(true);
      expect(canDeleteHousehold(serviceOverseer, mockHouseholdView)).toBe(true);
    });
  });

  describe('canLogVisitOrEncounter', () => {
    it('allows owner to log visits', () => {
      expect(canLogVisitOrEncounter(alice, mockHouseholdView)).toBe(true);
    });

    it('allows collaborator to log visits', () => {
      expect(canLogVisitOrEncounter(bob, mockHouseholdView)).toBe(true);
    });

    it('denies read-only viewer from logging visits', () => {
      expect(canLogVisitOrEncounter(charlie, mockHouseholdView)).toBe(false);
    });

    it('allows Territory Servant to log visits', () => {
      expect(canLogVisitOrEncounter(territoryServant, mockHouseholdView)).toBe(true);
    });

    it('denies unrelated stranger from logging visits', () => {
      expect(canLogVisitOrEncounter(stranger, mockHouseholdView)).toBe(false);
    });
  });

  describe('canAccessHouseholdDetails', () => {
    it('allows owner, collaborator, and read-only viewer to access details', () => {
      expect(canAccessHouseholdDetails(alice.id, mockHouseholdView)).toBe(true);
      expect(canAccessHouseholdDetails(bob.id, mockHouseholdView)).toBe(true);
      expect(canAccessHouseholdDetails(charlie.id, mockHouseholdView)).toBe(true);
    });

    it('allows Territory Servant to access details', () => {
      expect(
        canAccessHouseholdDetails('user-ts', mockHouseholdView, [], UserRole.TERRITORY_SERVANT)
      ).toBe(true);
    });

    it('denies stranger without accepted share', () => {
      expect(canAccessHouseholdDetails(stranger.id, mockHouseholdView, [])).toBe(false);
    });

    it('allows user with accepted share in shares array', () => {
      const acceptedShare: HouseholdShare = {
        id: 'share-1',
        householdId: mockHouseholdView.id,
        fromUserId: alice.id,
        fromUserName: 'Alice',
        toUserId: stranger.id,
        toUserName: 'Stranger',
        mode: 'collaborate',
        status: 'accepted',
        createdAt: '2026-08-16T00:00:00Z',
        updatedAt: '2026-08-16T00:00:00Z',
      };
      expect(canAccessHouseholdDetails(stranger.id, mockHouseholdView, [acceptedShare])).toBe(true);
    });

    it('denies user with pending share until accepted', () => {
      const pendingShare: HouseholdShare = {
        id: 'share-2',
        householdId: mockHouseholdView.id,
        fromUserId: alice.id,
        fromUserName: 'Alice',
        toUserId: stranger.id,
        toUserName: 'Stranger',
        mode: 'collaborate',
        status: 'pending',
        createdAt: '2026-08-16T00:00:00Z',
        updatedAt: '2026-08-16T00:00:00Z',
      };
      expect(canAccessHouseholdDetails(stranger.id, mockHouseholdView, [pendingShare])).toBe(false);
    });
  });
});
