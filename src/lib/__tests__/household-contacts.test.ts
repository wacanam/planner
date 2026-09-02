import { describe, expect, it } from 'vitest';
import { extractHouseholdContacts, getHouseholdMapLabel } from '@/lib/household-contacts';
import type { Encounter } from '@/types/api';

describe('extractHouseholdContacts', () => {
  it('returns empty array when given null, undefined, or empty encounters', () => {
    expect(extractHouseholdContacts(null)).toEqual([]);
    expect(extractHouseholdContacts(undefined)).toEqual([]);
    expect(extractHouseholdContacts([])).toEqual([]);
  });

  it('filters out encounters without names', () => {
    const encounters = [
      {
        id: '1',
        name: '   ',
        response: 'not_interested',
        userId: 'u1',
        createdAt: '2026-08-01T10:00:00Z',
      } as Encounter,
    ];
    expect(extractHouseholdContacts(encounters)).toEqual([]);
  });

  it('aggregates multiple encounters for the same person and sorts newest first', () => {
    const encounters: Encounter[] = [
      {
        id: 'enc-1',
        name: 'John Doe',
        gender: 'male',
        ageGroup: 'adult',
        language: 'English',
        response: 'neutral',
        topicDiscussed: 'Future hope',
        literatureAccepted: 'Tract',
        nextVisitNotes: 'Discuss why God allows suffering',
        notes: 'Initial conversation',
        bibleStudyInterest: false,
        returnVisitRequested: false,
        visitDate: '2026-08-01T10:00:00Z',
        createdAt: '2026-08-01T10:00:00Z',
        updatedAt: '2026-08-01T10:00:00Z',
        userId: 'u1',
        householdId: 'h1',
        visitId: 'v1',
      },
      {
        id: 'enc-2',
        name: 'john doe', // different casing
        gender: 'male',
        ageGroup: 'adult',
        language: 'English',
        response: 'receptive',
        topicDiscussed: 'Why God allows suffering',
        literatureAccepted: 'Brochure Lesson 1',
        nextVisitNotes: 'What is God kingdom?',
        notes: 'Asked deep questions',
        bibleStudyInterest: true,
        returnVisitRequested: true,
        visitDate: '2026-08-10T10:00:00Z',
        createdAt: '2026-08-10T10:00:00Z',
        updatedAt: '2026-08-10T10:00:00Z',
        userId: 'u1',
        householdId: 'h1',
        visitId: 'v2',
      },
    ];

    const contacts = extractHouseholdContacts(encounters);
    expect(contacts).toHaveLength(1);
    expect(contacts[0].name).toBe('john doe');
    expect(contacts[0].normalizedName).toBe('john doe');
    expect(contacts[0].encountersCount).toBe(2);
    expect(contacts[0].lastResponse).toBe('receptive');
    expect(contacts[0].lastTopicDiscussed).toBe('Why God allows suffering');
    expect(contacts[0].lastLiteratureAccepted).toBe('Brochure Lesson 1');
    expect(contacts[0].nextVisitPlannedTopic).toBe('What is God kingdom?');
    expect(contacts[0].bibleStudyInterest).toBe(true);
    expect(contacts[0].gender).toBe('male');
    expect(contacts[0].ageGroup).toBe('adult');
    expect(contacts[0].allEncounters).toHaveLength(2);
  });

  it('correctly handles multiple distinct persons at the same address', () => {
    const encounters: Encounter[] = [
      {
        id: 'enc-1',
        name: 'Alice Smith',
        gender: 'female',
        ageGroup: 'young_adult',
        response: 'receptive',
        bibleStudyInterest: false,
        returnVisitRequested: false,
        visitDate: '2026-08-05T10:00:00Z',
        createdAt: '2026-08-05T10:00:00Z',
        updatedAt: '2026-08-05T10:00:00Z',
        userId: 'u1',
        householdId: 'h1',
        visitId: 'v1',
      },
      {
        id: 'enc-2',
        name: 'Bob Smith',
        gender: 'male',
        ageGroup: 'senior',
        response: 'busy',
        bibleStudyInterest: false,
        returnVisitRequested: false,
        visitDate: '2026-08-12T10:00:00Z',
        createdAt: '2026-08-12T10:00:00Z',
        updatedAt: '2026-08-12T10:00:00Z',
        userId: 'u1',
        householdId: 'h1',
        visitId: 'v2',
      },
    ];

    const contacts = extractHouseholdContacts(encounters);
    expect(contacts).toHaveLength(2);
    // Bob should be first because visitDate 2026-08-12 is newer
    expect(contacts[0].name).toBe('Bob Smith');
    expect(contacts[0].encountersCount).toBe(1);
    expect(contacts[1].name).toBe('Alice Smith');
    expect(contacts[1].encountersCount).toBe(1);
  });

  it('correctly extracts role, phone, email, bestTimeToCall, and study publication/lesson', () => {
    const encounters: Encounter[] = [
      {
        id: 'enc-1',
        name: 'Uncle A',
        gender: 'male',
        ageGroup: 'adult',
        role: 'head_of_household',
        phoneNumber: '+1 555 0199',
        email: 'unclea@example.com',
        bestTimeToCall: 'Evenings after 6pm',
        locationDescription: 'Corner of 5th Ave',
        response: 'study_accepted',
        bibleStudyInterest: true,
        bibleStudyPublication: 'Enjoy Life Forever!',
        bibleStudyLesson: 'Lesson 03',
        returnVisitRequested: true,
        visitDate: '2026-08-15T10:00:00Z',
        createdAt: '2026-08-15T10:00:00Z',
        updatedAt: '2026-08-15T10:00:00Z',
        userId: 'u1',
        householdId: 'h1',
        visitId: 'v1',
      },
    ];

    const contacts = extractHouseholdContacts(encounters);
    expect(contacts).toHaveLength(1);
    expect(contacts[0].role).toBe('head_of_household');
    expect(contacts[0].phoneNumber).toBe('+1 555 0199');
    expect(contacts[0].email).toBe('unclea@example.com');
    expect(contacts[0].bestTimeToCall).toBe('Evenings after 6pm');
    expect(contacts[0].locationDescription).toBe('Corner of 5th Ave');
    expect(contacts[0].bibleStudyPublication).toBe('Enjoy Life Forever!');
    expect(contacts[0].bibleStudyLesson).toBe('Lesson 03');
  });
});

describe('getHouseholdMapLabel', () => {
  it('formats house number + resident name', () => {
    expect(
      getHouseholdMapLabel({
        houseNumber: '104',
        name: 'Smith',
        streetName: 'Maple Street',
        address: '104 Maple Street, City',
      })
    ).toBe('#104 Smith');
  });

  it('formats house number + street name when resident name is missing', () => {
    expect(
      getHouseholdMapLabel({
        houseNumber: '104',
        name: null,
        streetName: 'Maple Street',
        address: '104 Maple Street, City',
      })
    ).toBe('#104 Maple Street');
  });

  it('preserves existing # prefix on house number without doubling', () => {
    expect(
      getHouseholdMapLabel({
        houseNumber: '#12B',
        name: 'Johnson',
      })
    ).toBe('#12B Johnson');
  });

  it('avoids duplicating house number if name already begins with it', () => {
    expect(
      getHouseholdMapLabel({
        houseNumber: '104',
        streetName: '104 Maple Street',
        name: null,
      })
    ).toBe('#104 Maple Street');
  });

  it('falls back to name or street if house number is not set', () => {
    expect(
      getHouseholdMapLabel({
        name: 'Dela Cruz Residence',
        streetName: 'Pine Ave',
      })
    ).toBe('Dela Cruz Residence');

    expect(
      getHouseholdMapLabel({
        name: null,
        streetName: 'Pine Ave',
      })
    ).toBe('Pine Ave');
  });

  it('falls back to full address or House if name and street name are missing', () => {
    expect(
      getHouseholdMapLabel({
        address: 'Block 2 Lot 5, Zone 3, Barangay San Jose',
      })
    ).toBe('Block 2 Lot 5, Zone 3, Barangay San Jose');

    expect(
      getHouseholdMapLabel({
        householdAddress: '742 Evergreen Terrace, Springfield, OR',
      })
    ).toBe('742 Evergreen Terrace, Springfield, OR');

    expect(
      getHouseholdMapLabel({
        houseNumber: '104',
        address: '104 Maple Street, Springfield',
      })
    ).toBe('#104 Maple Street, Springfield');

    expect(
      getHouseholdMapLabel({
        houseNumber: '5',
        address: 'Block 2 Lot 5, Zone 3',
      })
    ).toBe('#5 Block 2 Lot 5, Zone 3');

    expect(getHouseholdMapLabel({})).toBe('House');
    expect(getHouseholdMapLabel(null)).toBe('House');
    expect(getHouseholdMapLabel(undefined)).toBe('House');
  });

  it('prioritizes name over street name and full address', () => {
    expect(
      getHouseholdMapLabel({
        name: 'Garcia Family',
        streetName: 'Oak Street',
        address: '123 Oak Street, City',
      })
    ).toBe('Garcia Family');
  });

  it('prioritizes street name over name when name is merely identical to the address', () => {
    expect(
      getHouseholdMapLabel({
        houseNumber: '30',
        name: 'Lower Calanawan',
        streetName: 'Iza bungcal family',
        address: 'Lower Calanawan',
      })
    ).toBe('#30 Iza bungcal family');
  });
});
