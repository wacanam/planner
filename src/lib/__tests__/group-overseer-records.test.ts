import { describe, expect, it } from 'vitest';
import { filterEncounter } from '@/lib/local-first/encounters';
import { filterHousehold, toHouseholdView } from '@/lib/local-first/households';
import type { LocalEncounter, LocalHousehold, LocalVisit } from '@/lib/local-first/types';
import { filterVisit } from '@/lib/local-first/visits';
import {
  canAccessHouseholdDetails,
  canDeleteEncounter,
  canDeleteHousehold,
  canDeleteVisit,
  canEditEncounter,
  canEditHousehold,
  canEditVisit,
  canLogVisitOrEncounter,
  canShareHousehold,
  getOverseenGroupMateIds,
  isGroupOverseer,
  isGroupOverseerAssistant,
  isGroupOverseerOfUser,
} from '@/lib/permissions';
import { UserRole } from '@/lib/roles';
import type { Group, Household } from '@/types/api';

describe('Group Overseer Record Access & Permission Rules', () => {
  const mockGroups: Group[] = [
    {
      id: 'group-1',
      congregationId: 'cong-1',
      name: 'Service Group 1',
      overseerId: 'user-overseer-1',
      overseerName: 'Overseer One',
      assistantOverseerId: 'user-asst-1',
      assistantOverseerName: 'Assistant One',
      createdAt: '2026-01-01T00:00:00Z',
      members: [
        {
          id: 'user-overseer-1',
          userId: 'user-overseer-1',
          role: 'group_overseer',
          user: { name: 'Overseer One', email: 'overseer1@example.com' },
        },
        {
          id: 'user-asst-1',
          userId: 'user-asst-1',
          role: 'assistant_overseer',
          user: { name: 'Assistant One', email: 'asst1@example.com' },
        },
        {
          id: 'user-publisher-a',
          userId: 'user-publisher-a',
          role: 'member',
          user: { name: 'Publisher A', email: 'pubA@example.com' },
        },
        {
          id: 'user-publisher-b',
          userId: 'user-publisher-b',
          role: 'member',
          user: { name: 'Publisher B', email: 'pubB@example.com' },
        },
      ],
    },
    {
      id: 'group-2',
      congregationId: 'cong-1',
      name: 'Service Group 2',
      overseerId: 'user-overseer-2',
      overseerName: 'Overseer Two',
      assistantOverseerId: null,
      assistantOverseerName: null,
      createdAt: '2026-01-01T00:00:00Z',
      members: [
        {
          id: 'user-overseer-2',
          userId: 'user-overseer-2',
          role: 'group_overseer',
          user: { name: 'Overseer Two', email: 'overseer2@example.com' },
        },
        {
          id: 'user-publisher-c',
          userId: 'user-publisher-c',
          role: 'member',
          user: { name: 'Publisher C', email: 'pubC@example.com' },
        },
      ],
    },
  ];

  describe('Group Overseer & Group Mate Resolution', () => {
    it('correctly identifies Group Overseer and Assistant', () => {
      expect(isGroupOverseer('user-overseer-1', mockGroups[0])).toBe(true);
      expect(isGroupOverseer('user-asst-1', mockGroups[0])).toBe(false);
      expect(isGroupOverseer('user-publisher-a', mockGroups[0])).toBe(false);

      expect(isGroupOverseerAssistant('user-asst-1', mockGroups[0])).toBe(true);
      expect(isGroupOverseerAssistant('user-overseer-1', mockGroups[0])).toBe(false);
    });

    it('getOverseenGroupMateIds returns all member IDs for the group(s) overseen', () => {
      const overseer1Mates = getOverseenGroupMateIds('user-overseer-1', mockGroups);
      expect(overseer1Mates.has('user-overseer-1')).toBe(true);
      expect(overseer1Mates.has('user-asst-1')).toBe(true);
      expect(overseer1Mates.has('user-publisher-a')).toBe(true);
      expect(overseer1Mates.has('user-publisher-b')).toBe(true);
      // Should NOT include group 2 members
      expect(overseer1Mates.has('user-publisher-c')).toBe(false);
      expect(overseer1Mates.has('user-overseer-2')).toBe(false);
    });

    it('getOverseenGroupMateIds returns empty Set for regular members or assistants', () => {
      const asstMates = getOverseenGroupMateIds('user-asst-1', mockGroups);
      expect(asstMates.size).toBe(0);

      const pubMates = getOverseenGroupMateIds('user-publisher-a', mockGroups);
      expect(pubMates.size).toBe(0);
    });

    it('isGroupOverseerOfUser verifies overseer relationship correctly', () => {
      expect(isGroupOverseerOfUser('user-overseer-1', 'user-publisher-a', mockGroups)).toBe(true);
      expect(isGroupOverseerOfUser('user-overseer-1', 'user-publisher-b', mockGroups)).toBe(true);
      expect(isGroupOverseerOfUser('user-overseer-1', 'user-publisher-c', mockGroups)).toBe(false);

      // Assistant is NOT a Group Overseer
      expect(isGroupOverseerOfUser('user-asst-1', 'user-publisher-a', mockGroups)).toBe(false);
    });
  });

  describe('Read-Only Access to Group Mates Households', () => {
    const unsharedGroupMateHousehold: LocalHousehold = {
      id: 'hh-pub-a',
      serverId: 'hh-pub-a',
      congregationId: 'cong-1',
      territoryId: 't-1',
      name: 'Martinez Residence',
      address: '456 Oak Avenue',
      houseNumber: '456',
      unitNumber: null,
      streetName: 'Oak Avenue',
      city: 'Springfield',
      postalCode: '97477',
      country: 'USA',
      latitude: '44.0462',
      longitude: '-123.0220',
      type: 'house',
      floor: null,
      occupantsCount: 3,
      languages: 'Spanish',
      bestTimeToCall: 'Mornings',
      status: 'return_visit',
      lastVisitDate: '2026-08-12T10:00:00Z',
      lastVisitOutcome: 'answered',
      notes: 'Interested in family brochure',
      lwpNotes: null,
      createdById: 'user-publisher-a',
      creatorName: 'Publisher A',
      collaboratorIds: null, // NOT shared with anyone
      readOnlyUserIds: null,
      transferredFrom: null,
      transferredFromId: null,
      transferredAt: null,
      updatedById: 'user-publisher-a',
      deletedAt: null,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-12T10:00:00Z',
    };

    const householdView: Household = toHouseholdView(unsharedGroupMateHousehold);

    it('allows Group Overseer to view unshared household in personalOnly filter using groupMateUserIds', () => {
      const overseer1Mates = getOverseenGroupMateIds('user-overseer-1', mockGroups);
      const isVisible = filterHousehold(unsharedGroupMateHousehold, {
        userId: 'user-overseer-1',
        userRole: UserRole.PUBLISHER,
        personalOnly: true,
        groupMateUserIds: overseer1Mates,
      });
      expect(isVisible).toBe(true);
    });

    it('denies another publisher in the same group from viewing unshared household', () => {
      const pubBMates = getOverseenGroupMateIds('user-publisher-b', mockGroups); // empty
      const isVisible = filterHousehold(unsharedGroupMateHousehold, {
        userId: 'user-publisher-b',
        userRole: UserRole.PUBLISHER,
        personalOnly: true,
        groupMateUserIds: pubBMates,
      });
      expect(isVisible).toBe(false);
    });

    it('denies Assistant Overseer from viewing unshared household unless shared', () => {
      const asstMates = getOverseenGroupMateIds('user-asst-1', mockGroups);
      const isVisible = filterHousehold(unsharedGroupMateHousehold, {
        userId: 'user-asst-1',
        userRole: UserRole.PUBLISHER,
        personalOnly: true,
        groupMateUserIds: asstMates,
      });
      expect(isVisible).toBe(false);
    });

    it('denies Group Overseer of a different group from viewing unshared household', () => {
      const overseer2Mates = getOverseenGroupMateIds('user-overseer-2', mockGroups);
      const isVisible = filterHousehold(unsharedGroupMateHousehold, {
        userId: 'user-overseer-2',
        userRole: UserRole.PUBLISHER,
        personalOnly: true,
        groupMateUserIds: overseer2Mates,
      });
      expect(isVisible).toBe(false);
    });

    it('allows Group Overseer full detail access via canAccessHouseholdDetails', () => {
      expect(
        canAccessHouseholdDetails(
          'user-overseer-1',
          householdView,
          [],
          UserRole.PUBLISHER,
          mockGroups
        )
      ).toBe(true);

      const overseer1Mates = getOverseenGroupMateIds('user-overseer-1', mockGroups);
      expect(
        canAccessHouseholdDetails(
          'user-overseer-1',
          householdView,
          [],
          UserRole.PUBLISHER,
          overseer1Mates
        )
      ).toBe(true);
    });

    it('denies Assistant Overseer or stranger detail access if not shared', () => {
      expect(
        canAccessHouseholdDetails('user-asst-1', householdView, [], UserRole.PUBLISHER, mockGroups)
      ).toBe(false);
      expect(
        canAccessHouseholdDetails(
          'user-publisher-b',
          householdView,
          [],
          UserRole.PUBLISHER,
          mockGroups
        )
      ).toBe(false);
      expect(
        canAccessHouseholdDetails(
          'user-overseer-2',
          householdView,
          [],
          UserRole.PUBLISHER,
          mockGroups
        )
      ).toBe(false);
    });
  });

  describe('Strict Read-Only Enforcement for Group Overseers', () => {
    const overseerUser = { id: 'user-overseer-1', role: UserRole.PUBLISHER };
    const unsharedGroupMateHousehold: Household = {
      id: 'hh-pub-a',
      address: '456 Oak Avenue',
      streetName: 'Oak Avenue',
      city: 'Springfield',
      status: 'active',
      createdById: 'user-publisher-a',
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-12T10:00:00Z',
    };

    const mockVisit: LocalVisit = {
      id: 'visit-pub-a-1',
      serverId: 'visit-pub-a-1',
      userId: 'user-publisher-a',
      householdId: 'hh-pub-a',
      householdServerId: 'hh-pub-a',
      visitDate: '2026-08-12T10:00:00Z',
      outcome: 'answered',
      householdStatusBefore: 'new',
      householdStatusAfter: 'active',
      duration: 10,
      literatureLeft: 'Tract',
      bibleTopicDiscussed: 'Prayer',
      returnVisitPlanned: true,
      nextVisitDate: '2026-08-19',
      nextVisitTime: '10:00',
      nextVisitNotes: null,
      assignmentId: null,
      notes: 'Initial conversation',
      deletedAt: null,
      createdAt: '2026-08-12T10:00:00Z',
      updatedAt: '2026-08-12T10:00:00Z',
    };

    const mockEncounter: LocalEncounter = {
      id: 'enc-pub-a-1',
      serverId: 'enc-pub-a-1',
      userId: 'user-publisher-a',
      visitId: 'visit-pub-a-1',
      visitServerId: 'visit-pub-a-1',
      householdId: 'hh-pub-a',
      householdServerId: 'hh-pub-a',
      encounterDate: '2026-08-12T10:00:00Z',
      name: 'Maria Martinez',
      gender: 'female',
      ageGroup: 'adult',
      role: 'Homeowner',
      response: 'receptive',
      languageSpoken: 'Spanish',
      topicDiscussed: 'Prayer',
      literatureAccepted: 'Tract',
      bibleStudyInterest: false,
      returnVisitRequested: true,
      nextVisitNotes: null,
      notes: null,
      deletedAt: null,
      createdAt: '2026-08-12T10:00:00Z',
      updatedAt: '2026-08-12T10:00:00Z',
    };

    it('denies Group Overseer from editing group mate household (read-only)', () => {
      expect(canEditHousehold(overseerUser, unsharedGroupMateHousehold)).toBe(false);
    });

    it('denies Group Overseer from deleting group mate household (read-only)', () => {
      expect(canDeleteHousehold(overseerUser, unsharedGroupMateHousehold)).toBe(false);
    });

    it('denies Group Overseer from sharing group mate household (read-only)', () => {
      expect(canShareHousehold(overseerUser, unsharedGroupMateHousehold)).toBe(false);
    });

    it('denies Group Overseer from logging visits on group mate household unless added as collaborator', () => {
      expect(canLogVisitOrEncounter(overseerUser, unsharedGroupMateHousehold)).toBe(false);
    });

    it('denies Group Overseer from editing group mate visit records', () => {
      expect(canEditVisit(overseerUser, mockVisit, unsharedGroupMateHousehold)).toBe(false);
    });

    it('denies Group Overseer from deleting group mate visit records', () => {
      expect(canDeleteVisit(overseerUser, mockVisit, unsharedGroupMateHousehold)).toBe(false);
    });

    it('denies Group Overseer from editing group mate encounter records', () => {
      expect(canEditEncounter(overseerUser, mockEncounter, unsharedGroupMateHousehold)).toBe(false);
    });

    it('denies Group Overseer from deleting group mate encounter records', () => {
      expect(canDeleteEncounter(overseerUser, mockEncounter, unsharedGroupMateHousehold)).toBe(
        false
      );
    });
  });

  describe('Visits & Encounters Filtering for Group Overseer', () => {
    const overseer1Mates = getOverseenGroupMateIds('user-overseer-1', mockGroups);

    const groupMateVisit: LocalVisit = {
      id: 'visit-1',
      serverId: 'visit-1',
      userId: 'user-publisher-a',
      householdId: 'hh-1',
      householdServerId: 'hh-1',
      visitDate: '2026-08-12T10:00:00Z',
      outcome: 'answered',
      householdStatusBefore: 'new',
      householdStatusAfter: 'active',
      duration: 10,
      literatureLeft: null,
      bibleTopicDiscussed: null,
      returnVisitPlanned: false,
      nextVisitDate: null,
      nextVisitTime: null,
      nextVisitNotes: null,
      assignmentId: null,
      notes: null,
      deletedAt: null,
      createdAt: '2026-08-12T10:00:00Z',
      updatedAt: '2026-08-12T10:00:00Z',
    };

    const groupMateEncounter: LocalEncounter = {
      id: 'enc-1',
      serverId: 'enc-1',
      userId: 'user-publisher-a',
      visitId: 'visit-1',
      visitServerId: 'visit-1',
      householdId: 'hh-1',
      householdServerId: 'hh-1',
      encounterDate: '2026-08-12T10:00:00Z',
      name: 'John Doe',
      gender: 'male',
      ageGroup: 'adult',
      role: null,
      response: 'receptive',
      languageSpoken: 'English',
      topicDiscussed: null,
      literatureAccepted: null,
      bibleStudyInterest: false,
      returnVisitRequested: false,
      nextVisitNotes: null,
      notes: null,
      deletedAt: null,
      createdAt: '2026-08-12T10:00:00Z',
      updatedAt: '2026-08-12T10:00:00Z',
    };

    it('allows Group Overseer to view group mate visits in filterVisit', () => {
      const isVisible = filterVisit(groupMateVisit, {
        userId: 'user-overseer-1',
        userRole: UserRole.PUBLISHER,
        groupMateUserIds: overseer1Mates,
      });
      expect(isVisible).toBe(true);
    });

    it('allows Group Overseer to view group mate encounters in filterEncounter', () => {
      const isVisible = filterEncounter(groupMateEncounter, {
        userId: 'user-overseer-1',
        userRole: UserRole.PUBLISHER,
        groupMateUserIds: overseer1Mates,
      });
      expect(isVisible).toBe(true);
    });

    it('hides group mate visits from another regular publisher without group overseer role', () => {
      const isVisible = filterVisit(groupMateVisit, {
        userId: 'user-publisher-b',
        userRole: UserRole.PUBLISHER,
        groupMateUserIds: new Set(),
      });
      expect(isVisible).toBe(false);
    });

    it('hides group mate encounters from another regular publisher without group overseer role', () => {
      const isVisible = filterEncounter(groupMateEncounter, {
        userId: 'user-publisher-b',
        userRole: UserRole.PUBLISHER,
        groupMateUserIds: new Set(),
      });
      expect(isVisible).toBe(false);
    });
  });
});
