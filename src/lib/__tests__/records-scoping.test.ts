import { describe, expect, it } from 'vitest';
import { filterEncounter } from '@/lib/local-first/encounters';
import { filterHousehold } from '@/lib/local-first/households';
import type { LocalEncounter, LocalHousehold, LocalVisit } from '@/lib/local-first/types';
import { filterVisit } from '@/lib/local-first/visits';
import { UserRole } from '@/lib/roles';

describe('Records Scoping Logic (Personal vs Group vs Congregation)', () => {
  const myHousehold: LocalHousehold = {
    id: 'hh-mine',
    serverId: 'hh-mine',
    congregationId: 'cong-1',
    territoryId: 't-1',
    name: 'My Personal Return Visit',
    address: '100 Main St',
    houseNumber: '100',
    unitNumber: null,
    streetName: 'Main St',
    city: 'Springfield',
    postalCode: '12345',
    country: 'USA',
    latitude: '40.1',
    longitude: '-74.1',
    type: 'house',
    floor: null,
    occupantsCount: 2,
    languages: 'English',
    bestTimeToCall: 'Evenings',
    status: 'return_visit',
    lastVisitDate: '2026-08-20T10:00:00Z',
    lastVisitOutcome: 'answered',
    notes: 'Personal return call',
    lwpNotes: null,
    createdById: 'user-elder-1',
    creatorName: 'Elder One',
    collaboratorIds: null,
    readOnlyUserIds: null,
    transferredFrom: null,
    transferredFromId: null,
    transferredAt: null,
    updatedById: 'user-elder-1',
    deletedAt: null,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z',
  };

  const sharedWithMeHousehold: LocalHousehold = {
    ...myHousehold,
    id: 'hh-shared',
    serverId: 'hh-shared',
    name: 'Collaborated Return Call',
    address: '200 Oak Ave',
    createdById: 'user-other',
    creatorName: 'Other Publisher',
    collaboratorIds: ['user-elder-1'],
  };

  const groupMateHousehold: LocalHousehold = {
    ...myHousehold,
    id: 'hh-groupmate',
    serverId: 'hh-groupmate',
    name: 'Group Member Door',
    address: '300 Pine St',
    createdById: 'user-groupmate-1',
    creatorName: 'Group Mate',
    collaboratorIds: null,
  };

  const otherCongregationHousehold: LocalHousehold = {
    ...myHousehold,
    id: 'hh-other-group',
    serverId: 'hh-other-group',
    name: 'Other Group Door',
    address: '400 Elm St',
    createdById: 'user-other-group-pub',
    creatorName: 'Other Group Publisher',
    collaboratorIds: null,
  };

  const myVisit: LocalVisit = {
    id: 'visit-mine',
    serverId: 'visit-mine',
    userId: 'user-elder-1',
    householdId: 'hh-mine',
    householdServerId: 'hh-mine',
    visitDate: '2026-08-20T10:00:00Z',
    outcome: 'return_visit',
    householdStatusBefore: 'active',
    householdStatusAfter: 'return_visit',
    duration: 15,
    literatureLeft: 'Brochure',
    bibleTopicDiscussed: 'Future Hope',
    returnVisitPlanned: true,
    nextVisitDate: '2026-08-27',
    nextVisitTime: '10:00',
    nextVisitNotes: 'Discuss lesson 2',
    assignmentId: null,
    notes: 'Elder personal visit',
    deletedAt: null,
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z',
  };

  const groupMateVisit: LocalVisit = {
    ...myVisit,
    id: 'visit-groupmate',
    serverId: 'visit-groupmate',
    userId: 'user-groupmate-1',
    householdId: 'hh-groupmate',
    notes: 'Group mate visit',
  };

  const otherGroupVisit: LocalVisit = {
    ...myVisit,
    id: 'visit-other',
    serverId: 'visit-other',
    userId: 'user-other-group-pub',
    householdId: 'hh-other-group',
    notes: 'Other group visit',
  };

  const myEncounter: LocalEncounter = {
    id: 'enc-mine',
    serverId: 'enc-mine',
    userId: 'user-elder-1',
    visitId: 'visit-mine',
    visitServerId: 'visit-mine',
    householdId: 'hh-mine',
    householdServerId: 'hh-mine',
    encounterDate: '2026-08-20T10:00:00Z',
    name: 'Alice Johnson',
    gender: 'female',
    ageGroup: 'adult',
    role: 'Homeowner',
    response: 'receptive',
    languageSpoken: 'English',
    topicDiscussed: 'Future Hope',
    literatureAccepted: 'Brochure',
    bibleStudyInterest: true,
    returnVisitRequested: true,
    nextVisitNotes: null,
    notes: 'Personal encounter',
    deletedAt: null,
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z',
  };

  const groupMateEncounter: LocalEncounter = {
    ...myEncounter,
    id: 'enc-groupmate',
    serverId: 'enc-groupmate',
    userId: 'user-groupmate-1',
    householdId: 'hh-groupmate',
  };

  const otherGroupEncounter: LocalEncounter = {
    ...myEncounter,
    id: 'enc-other',
    serverId: 'enc-other',
    userId: 'user-other-group-pub',
    householdId: 'hh-other-group',
  };

  const groupMateUserIds = new Set(['user-elder-1', 'user-groupmate-1']);

  describe('Service Overseer / Secretary (Can view all congregation records)', () => {
    const userRole = UserRole.SERVICE_OVERSEER;
    const userId = 'user-elder-1';

    it('filters strictly to personal + shared records when scope is "mine"', () => {
      // Household filtering
      expect(filterHousehold(myHousehold, { userId, userRole, scope: 'mine', groupMateUserIds })).toBe(true);
      expect(filterHousehold(sharedWithMeHousehold, { userId, userRole, scope: 'mine', groupMateUserIds })).toBe(true);
      expect(filterHousehold(groupMateHousehold, { userId, userRole, scope: 'mine', groupMateUserIds })).toBe(false);
      expect(filterHousehold(otherCongregationHousehold, { userId, userRole, scope: 'mine', groupMateUserIds })).toBe(false);

      // Visit filtering
      expect(filterVisit(myVisit, { userId, userRole, scope: 'mine', groupMateUserIds })).toBe(true);
      expect(filterVisit(groupMateVisit, { userId, userRole, scope: 'mine', groupMateUserIds })).toBe(false);
      expect(filterVisit(otherGroupVisit, { userId, userRole, scope: 'mine', groupMateUserIds })).toBe(false);

      // Encounter filtering
      expect(filterEncounter(myEncounter, { userId, userRole, scope: 'mine', groupMateUserIds })).toBe(true);
      expect(filterEncounter(groupMateEncounter, { userId, userRole, scope: 'mine', groupMateUserIds })).toBe(false);
      expect(filterEncounter(otherGroupEncounter, { userId, userRole, scope: 'mine', groupMateUserIds })).toBe(false);
    });

    it('filters to personal + group records when scope is "group"', () => {
      expect(filterHousehold(myHousehold, { userId, userRole, scope: 'group', groupMateUserIds })).toBe(true);
      expect(filterHousehold(sharedWithMeHousehold, { userId, userRole, scope: 'group', groupMateUserIds })).toBe(true);
      expect(filterHousehold(groupMateHousehold, { userId, userRole, scope: 'group', groupMateUserIds })).toBe(true);
      expect(filterHousehold(otherCongregationHousehold, { userId, userRole, scope: 'group', groupMateUserIds })).toBe(false);

      expect(filterVisit(myVisit, { userId, userRole, scope: 'group', groupMateUserIds })).toBe(true);
      expect(filterVisit(groupMateVisit, { userId, userRole, scope: 'group', groupMateUserIds })).toBe(true);
      expect(filterVisit(otherGroupVisit, { userId, userRole, scope: 'group', groupMateUserIds })).toBe(false);

      expect(filterEncounter(myEncounter, { userId, userRole, scope: 'group', groupMateUserIds })).toBe(true);
      expect(filterEncounter(groupMateEncounter, { userId, userRole, scope: 'group', groupMateUserIds })).toBe(true);
      expect(filterEncounter(otherGroupEncounter, { userId, userRole, scope: 'group', groupMateUserIds })).toBe(false);
    });

    it('shows all congregation records when scope is "congregation"', () => {
      expect(filterHousehold(myHousehold, { userId, userRole, scope: 'congregation' })).toBe(true);
      expect(filterHousehold(groupMateHousehold, { userId, userRole, scope: 'congregation' })).toBe(true);
      expect(filterHousehold(otherCongregationHousehold, { userId, userRole, scope: 'congregation' })).toBe(true);

      expect(filterVisit(myVisit, { userId, userRole, scope: 'congregation' })).toBe(true);
      expect(filterVisit(groupMateVisit, { userId, userRole, scope: 'congregation' })).toBe(true);
      expect(filterVisit(otherGroupVisit, { userId, userRole, scope: 'congregation' })).toBe(true);

      expect(filterEncounter(myEncounter, { userId, userRole, scope: 'congregation' })).toBe(true);
      expect(filterEncounter(groupMateEncounter, { userId, userRole, scope: 'congregation' })).toBe(true);
      expect(filterEncounter(otherGroupEncounter, { userId, userRole, scope: 'congregation' })).toBe(true);
    });
  });

  describe('Group Overseer (Publisher role with Group Oversight)', () => {
    const userRole = UserRole.PUBLISHER;
    const userId = 'user-elder-1';

    it('filters strictly to personal records in "mine" scope', () => {
      expect(filterHousehold(myHousehold, { userId, userRole, scope: 'mine', groupMateUserIds })).toBe(true);
      expect(filterHousehold(groupMateHousehold, { userId, userRole, scope: 'mine', groupMateUserIds })).toBe(false);

      expect(filterVisit(myVisit, { userId, userRole, scope: 'mine', groupMateUserIds })).toBe(true);
      expect(filterVisit(groupMateVisit, { userId, userRole, scope: 'mine', groupMateUserIds })).toBe(false);
    });

    it('shows personal + group records in "group" scope', () => {
      expect(filterHousehold(myHousehold, { userId, userRole, scope: 'group', groupMateUserIds })).toBe(true);
      expect(filterHousehold(groupMateHousehold, { userId, userRole, scope: 'group', groupMateUserIds })).toBe(true);
      expect(filterHousehold(otherCongregationHousehold, { userId, userRole, scope: 'group', groupMateUserIds })).toBe(false);

      expect(filterVisit(myVisit, { userId, userRole, scope: 'group', groupMateUserIds })).toBe(true);
      expect(filterVisit(groupMateVisit, { userId, userRole, scope: 'group', groupMateUserIds })).toBe(true);
      expect(filterVisit(otherGroupVisit, { userId, userRole, scope: 'group', groupMateUserIds })).toBe(false);
    });

    it('denies access to unauthorized congregation records if regular publisher attempts congregation scope', () => {
      expect(filterHousehold(myHousehold, { userId, userRole, scope: 'congregation', groupMateUserIds })).toBe(true);
      expect(filterHousehold(sharedWithMeHousehold, { userId, userRole, scope: 'congregation', groupMateUserIds })).toBe(true);
      expect(filterHousehold(groupMateHousehold, { userId, userRole, scope: 'congregation', groupMateUserIds })).toBe(false);
      expect(filterHousehold(otherCongregationHousehold, { userId, userRole, scope: 'congregation', groupMateUserIds })).toBe(false);
    });
  });

  describe('Regular Publisher (NO Group Oversight, NO Congregation Admin)', () => {
    const userRole = UserRole.PUBLISHER;
    const userId = 'user-regular-pub';

    const regularPubHousehold: LocalHousehold = {
      ...myHousehold,
      id: 'hh-regular',
      createdById: 'user-regular-pub',
      creatorName: 'Regular Publisher',
    };

    const regularPubVisit: LocalVisit = {
      ...myVisit,
      id: 'visit-regular',
      userId: 'user-regular-pub',
      householdId: 'hh-regular',
    };

    const regularPubEncounter: LocalEncounter = {
      ...myEncounter,
      id: 'enc-regular',
      userId: 'user-regular-pub',
      householdId: 'hh-regular',
    };

    const sharedWithPubHousehold: LocalHousehold = {
      ...myHousehold,
      id: 'hh-shared-with-pub',
      createdById: 'user-other',
      collaboratorIds: ['user-regular-pub'],
    };

    it('NEVER allows viewing unshared household records of other publishers under ANY scope', () => {
      // "mine" scope
      expect(filterHousehold(regularPubHousehold, { userId, userRole, scope: 'mine' })).toBe(true);
      expect(filterHousehold(sharedWithPubHousehold, { userId, userRole, scope: 'mine' })).toBe(true);
      expect(filterHousehold(myHousehold, { userId, userRole, scope: 'mine' })).toBe(false);
      expect(filterHousehold(groupMateHousehold, { userId, userRole, scope: 'mine' })).toBe(false);
      expect(filterHousehold(otherCongregationHousehold, { userId, userRole, scope: 'mine' })).toBe(false);

      // "group" scope attempt (without oversight)
      expect(filterHousehold(regularPubHousehold, { userId, userRole, scope: 'group' })).toBe(true);
      expect(filterHousehold(sharedWithPubHousehold, { userId, userRole, scope: 'group' })).toBe(true);
      expect(filterHousehold(myHousehold, { userId, userRole, scope: 'group' })).toBe(false);
      expect(filterHousehold(groupMateHousehold, { userId, userRole, scope: 'group' })).toBe(false);
      expect(filterHousehold(otherCongregationHousehold, { userId, userRole, scope: 'group' })).toBe(false);

      // "congregation" scope attempt (unauthorized)
      expect(filterHousehold(regularPubHousehold, { userId, userRole, scope: 'congregation' })).toBe(true);
      expect(filterHousehold(sharedWithPubHousehold, { userId, userRole, scope: 'congregation' })).toBe(true);
      expect(filterHousehold(myHousehold, { userId, userRole, scope: 'congregation' })).toBe(false);
      expect(filterHousehold(groupMateHousehold, { userId, userRole, scope: 'congregation' })).toBe(false);
      expect(filterHousehold(otherCongregationHousehold, { userId, userRole, scope: 'congregation' })).toBe(false);

      // default / no scope passed
      expect(filterHousehold(regularPubHousehold, { userId, userRole })).toBe(true);
      expect(filterHousehold(sharedWithPubHousehold, { userId, userRole })).toBe(true);
      expect(filterHousehold(myHousehold, { userId, userRole })).toBe(false);
      expect(filterHousehold(groupMateHousehold, { userId, userRole })).toBe(false);
      expect(filterHousehold(otherCongregationHousehold, { userId, userRole })).toBe(false);
    });

    it('NEVER allows viewing unshared visits or encounters of other publishers', () => {
      // Visits
      expect(filterVisit(regularPubVisit, { userId, userRole, scope: 'congregation' })).toBe(true);
      expect(filterVisit(myVisit, { userId, userRole, scope: 'congregation' })).toBe(false);
      expect(filterVisit(groupMateVisit, { userId, userRole, scope: 'congregation' })).toBe(false);

      // Encounters
      expect(filterEncounter(regularPubEncounter, { userId, userRole, scope: 'congregation' })).toBe(true);
      expect(filterEncounter(myEncounter, { userId, userRole, scope: 'congregation' })).toBe(false);
      expect(filterEncounter(groupMateEncounter, { userId, userRole, scope: 'congregation' })).toBe(false);
    });
  });

  describe('Assistant Group Overseer (Assistant Oversight)', () => {
    const userId = 'user-asst-1';
    const congregationRole = 'assistant_overseer';
    const userRole = UserRole.PUBLISHER;
    const asstGroupMateIds = new Set(['user-asst-1', 'user-groupmate-1']);

    const asstHousehold: LocalHousehold = {
      ...myHousehold,
      id: 'hh-asst',
      createdById: 'user-asst-1',
      creatorName: 'Assistant Overseer',
    };

    it('correctly filters in "mine" and "group" scopes for assistant overseer', () => {
      // In "mine" scope: only personal
      expect(filterHousehold(asstHousehold, { userId, userRole, congregationRole, scope: 'mine', groupMateUserIds: asstGroupMateIds })).toBe(true);
      expect(filterHousehold(groupMateHousehold, { userId, userRole, congregationRole, scope: 'mine', groupMateUserIds: asstGroupMateIds })).toBe(false);

      // In "group" scope: personal + group mate
      expect(filterHousehold(asstHousehold, { userId, userRole, congregationRole, scope: 'group', groupMateUserIds: asstGroupMateIds })).toBe(true);
      expect(filterHousehold(groupMateHousehold, { userId, userRole, congregationRole, scope: 'group', groupMateUserIds: asstGroupMateIds })).toBe(true);
      expect(filterHousehold(otherCongregationHousehold, { userId, userRole, congregationRole, scope: 'group', groupMateUserIds: asstGroupMateIds })).toBe(false);

      // With publisher filter in "group" scope
      expect(filterHousehold(groupMateHousehold, { userId, userRole, congregationRole, scope: 'group', publisherId: 'user-groupmate-1', groupMateUserIds: asstGroupMateIds })).toBe(true);
      expect(filterHousehold(asstHousehold, { userId, userRole, congregationRole, scope: 'group', publisherId: 'user-groupmate-1', groupMateUserIds: asstGroupMateIds })).toBe(false);
    });
  });
});
