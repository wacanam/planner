import { describe, expect, it } from 'vitest';
import { formatHouseholdDisplay } from '@/lib/households';
import { toVisitView } from '@/lib/local-first/visits';
import type { LocalVisit } from '@/lib/local-first/types';
import type { Household } from '@/types/api';

describe('formatHouseholdDisplay', () => {
  it('formats door number and resident/street as primary title, and territory name as subtitle', () => {
    const household: Partial<Household> = {
      id: 'h1',
      houseNumber: '32',
      streetName: 'Mario Dolor',
      address: '#32 Mario Dolor',
      name: 'Zone-2 diclum',
    };

    const result = formatHouseholdDisplay(household, 'Zone-2 diclum');
    expect(result.title).toBe('#32 Mario Dolor');
    expect(result.subtitle).toBe('Zone-2 diclum');
  });

  it('formats unnumbered address as primary title and territory as subtitle', () => {
    const household: Partial<Household> = {
      id: 'h2',
      streetName: 'DENR/Pulog Hill, San Miguel',
      address: 'DENR/Pulog Hill, San Miguel',
      name: 'San miguel',
    };

    const result = formatHouseholdDisplay(household, 'San miguel');
    expect(result.title).toBe('DENR/Pulog Hill, San Miguel');
    expect(result.subtitle).toBe('San miguel');
  });

  it('avoids redundant subtitle when territory matches primary title exactly', () => {
    const household: Partial<Household> = {
      id: 'h3',
      address: 'Kalanawan',
      streetName: 'Kalanawan',
    };

    const result = formatHouseholdDisplay(household, 'Kalanawan');
    expect(result.title).toBe('Kalanawan');
    expect(result.subtitle).toBeUndefined();
  });

  it('displays distinct custom household name as primary and address as subtitle', () => {
    const household: Partial<Household> = {
      id: 'h4',
      houseNumber: '12',
      streetName: 'Acacia St',
      address: '12 Acacia St',
      name: 'Grace Christian Academy',
    };

    const result = formatHouseholdDisplay(household, 'Sector 4');
    expect(result.title).toBe('#12 Grace Christian Academy');
    expect(result.subtitle).toBe('#12 Acacia St');
  });

  it('falls back gracefully when household is null or undefined', () => {
    const result = formatHouseholdDisplay(null, undefined, '77 Sunset Blvd');
    expect(result.title).toBe('77 Sunset Blvd');
    expect(result.subtitle).toBeUndefined();

    const emptyResult = formatHouseholdDisplay(undefined, undefined, null);
    expect(emptyResult.title).toBe('Household');
    expect(emptyResult.subtitle).toBeUndefined();
  });

  it('does not duplicate leading hash symbol if houseNumber already has one', () => {
    const household: Partial<Household> = {
      id: 'h5',
      houseNumber: '#30',
      streetName: 'Neneth Soriano',
      name: 'Kalanawan',
    };

    const result = formatHouseholdDisplay(household, 'Kalanawan');
    expect(result.title).toBe('#30 Neneth Soriano');
    expect(result.subtitle).toBe('Kalanawan');
  });
});

describe('toVisitView publisherName propagation', () => {
  it('preserves publisherName from LocalVisit into Visit view object', () => {
    const record: LocalVisit = {
      id: 'v1',
      serverId: null,
      userId: 'user-123',
      publisherName: 'Jerald Dela Cerna',
      householdId: 'h1',
      householdServerId: 'h1',
      visitDate: '2026-09-03T10:00:00Z',
      outcome: 'study_conducted',
      householdStatusBefore: null,
      householdStatusAfter: null,
      duration: 30,
      literatureLeft: null,
      bibleTopicDiscussed: 'Good news',
      returnVisitPlanned: true,
      nextVisitDate: null,
      nextVisitTime: null,
      nextVisitNotes: null,
      scheduledAppointmentType: null,
      bibleStudyStatus: 'conducted',
      studyOffered: false,
      isAppointmentMissed: false,
      assignmentId: null,
      notes: 'Great study',
      createdAt: '2026-09-03T10:00:00Z',
      updatedAt: '2026-09-03T10:00:00Z',
      deletedAt: null,
    };

    const view = toVisitView(record, null, 'cong-1');
    expect(view.publisherName).toBe('Jerald Dela Cerna');
    expect(view.outcome).toBe('study_conducted');
  });
});
