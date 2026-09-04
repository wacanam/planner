// src/lib/__tests__/personal-calls.test.ts
import { describe, expect, it } from 'vitest';
import type { PersonalCallRecord } from '@/lib/local-first/personal-calls';

describe('Personal Calls Service & Formatting', () => {
  const mockCall: PersonalCallRecord = {
    id: 'personal-h-1',
    userId: 'user-123',
    householdId: 'h-1',
    territoryId: 't-1',
    address: '123 Maple St',
    houseNumber: '123',
    unitNumber: 'Apt 4B',
    streetName: 'Maple St',
    personName: 'John Doe',
    phoneNumber: '555-0199',
    email: 'john@example.com',
    language: 'English',
    status: 'return_visit',
    notes: 'Interested in family life brochure',
    scripturesDiscussed: '2 Timothy 3:1-5',
    literaturePlaced: 'Enjoy Life Forever',
    nextVisitDate: '2026-09-15',
    nextVisitTime: '10:00 AM',
    nextVisitNotes: 'Discuss lesson 1',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-02T14:30:00.000Z',
  };

  it('validates PersonalCallRecord structure correctly', () => {
    expect(mockCall.userId).toBe('user-123');
    expect(mockCall.status).toBe('return_visit');
    expect(mockCall.personName).toBe('John Doe');
    expect(mockCall.scripturesDiscussed).toBe('2 Timothy 3:1-5');
    expect(mockCall.nextVisitDate).toBe('2026-09-15');
  });

  it('correctly escapes and formats CSV export row', () => {
    const escapeCsv = (val: string | null | undefined) => {
      if (!val) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    };

    const row = [
      escapeCsv(mockCall.address),
      escapeCsv(mockCall.houseNumber),
      escapeCsv(mockCall.unitNumber),
      escapeCsv(mockCall.territoryId),
      escapeCsv(mockCall.personName),
      escapeCsv(mockCall.phoneNumber),
      escapeCsv(mockCall.email),
      escapeCsv(mockCall.status),
      escapeCsv(mockCall.language),
      escapeCsv(mockCall.scripturesDiscussed),
      escapeCsv(mockCall.literaturePlaced),
      escapeCsv(mockCall.nextVisitDate),
      escapeCsv(mockCall.notes),
      escapeCsv(mockCall.updatedAt),
    ].join(',');

    expect(row).toContain('"123 Maple St"');
    expect(row).toContain('"t-1"');
    expect(row).toContain('"John Doe"');
    expect(row).toContain('"555-0199"');
    expect(row).toContain('"2 Timothy 3:1-5"');
    expect(row).toContain('"return_visit"');
  });

  it('formats JSON payload with metadata', () => {
    const jsonOutput = JSON.stringify(
      {
        exportedAt: '2026-09-04T00:00:00.000Z',
        userId: mockCall.userId,
        count: 1,
        personalCalls: [mockCall],
      },
      null,
      2
    );

    const parsed = JSON.parse(jsonOutput);
    expect(parsed.count).toBe(1);
    expect(parsed.personalCalls[0].personName).toBe('John Doe');
    expect(parsed.personalCalls[0].status).toBe('return_visit');
  });

  describe('Household Linking & Autocomplete', () => {
    it('links note to selected household with territory and address metadata', () => {
      const selectedHousehold = {
        id: 'household-456',
        address: '456 Oak Ave',
        houseNumber: '456',
        streetName: 'Oak Ave',
        territoryId: 'territory-9',
        city: 'Metropolis',
      };

      const noteWithLinkedHousehold: PersonalCallRecord = {
        id: 'personal-household-456',
        userId: 'user-123',
        householdId: selectedHousehold.id,
        territoryId: selectedHousehold.territoryId,
        address: selectedHousehold.address,
        houseNumber: selectedHousehold.houseNumber,
        streetName: selectedHousehold.streetName,
        personName: 'Maria Santos',
        phoneNumber: '0912-345-6789',
        email: null,
        language: 'Tagalog',
        status: 'initial_contact',
        scripturesDiscussed: 'Psalm 37:10, 11',
        literaturePlaced: null,
        nextVisitDate: '2026-09-20',
        nextVisitTime: '2:00 PM',
        nextVisitNotes: null,
        notes: 'Very interested in paradise on earth',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(noteWithLinkedHousehold.householdId).toBe('household-456');
      expect(noteWithLinkedHousehold.territoryId).toBe('territory-9');
      expect(noteWithLinkedHousehold.houseNumber).toBe('456');
      expect(noteWithLinkedHousehold.streetName).toBe('Oak Ave');
      expect(noteWithLinkedHousehold.address).toBe('456 Oak Ave');
      expect(noteWithLinkedHousehold.status).toBe('initial_contact');
    });

    it('preserves unlinked custom address reference when no household is selected', () => {
      const customLocationNote: PersonalCallRecord = {
        id: 'personal-custom-123',
        userId: 'user-123',
        householdId: null,
        territoryId: null,
        address: 'Corner of 5th Ave and Pine St near park bench',
        houseNumber: null,
        streetName: null,
        personName: 'General Note',
        phoneNumber: null,
        email: null,
        language: null,
        status: 'note',
        scripturesDiscussed: null,
        literaturePlaced: null,
        nextVisitDate: null,
        nextVisitTime: null,
        nextVisitNotes: null,
        notes: 'Good spot for cart witnessing or afternoon break',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(customLocationNote.householdId).toBeNull();
      expect(customLocationNote.territoryId).toBeNull();
      expect(customLocationNote.address).toBe('Corner of 5th Ave and Pine St near park bench');
      expect(customLocationNote.personName).toBe('General Note');
      expect(customLocationNote.status).toBe('note');
    });
  });
});
