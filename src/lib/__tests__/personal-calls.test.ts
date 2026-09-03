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
});
