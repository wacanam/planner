import { describe, expect, it } from 'vitest';
import {
  calculateTerritoryCoverage,
  isDateWithinPeriod,
  parseDateEndMs,
  parseDateStartMs,
} from '@/lib/territory-coverage';
import type { Household, Visit } from '@/types/api';

describe('calculateTerritoryCoverage', () => {
  it('returns 0% for empty households array', () => {
    const stats = calculateTerritoryCoverage([]);
    expect(stats).toEqual({
      totalDoors: 0,
      workedDoors: 0,
      unworkedDoors: 0,
      coveragePercent: 0,
    });
  });

  it('calculates 0% when all households are new and unvisited in default mode', () => {
    const households: Partial<Household>[] = [
      { id: '1', address: 'Door 1', status: 'new', lastVisitDate: null, totalVisitsCount: 0 },
      { id: '2', address: 'Door 2', status: 'new', lastVisitDate: null },
    ];
    const stats = calculateTerritoryCoverage(households as Household[]);
    expect(stats.totalDoors).toBe(2);
    expect(stats.workedDoors).toBe(0);
    expect(stats.coveragePercent).toBe(0);
  });

  it('calculates 50% when half of doors have been visited in default mode', () => {
    const households: Partial<Household>[] = [
      {
        id: '1',
        address: 'Door 1',
        status: 'active',
        lastVisitDate: '2026-08-15',
        totalVisitsCount: 1,
      },
      { id: '2', address: 'Door 2', status: 'new', lastVisitDate: null, totalVisitsCount: 0 },
    ];
    const stats = calculateTerritoryCoverage(households as Household[]);
    expect(stats.totalDoors).toBe(2);
    expect(stats.workedDoors).toBe(1);
    expect(stats.unworkedDoors).toBe(1);
    expect(stats.coveragePercent).toBe(50);
  });

  it('calculates 100% when all doors are worked in default mode', () => {
    const households: Partial<Household>[] = [
      { id: '1', address: 'Door 1', status: 'return_visit', lastVisitDate: '2026-08-15' },
      { id: '2', address: 'Door 2', status: 'not_home', lastVisitDate: '2026-08-16' },
      { id: '3', address: 'Door 3', status: 'do_not_visit', lastVisitDate: null },
      { id: '4', address: 'Door 4', status: 'busy', lastVisitDate: null },
      { id: '5', address: 'Door 5', status: 'foreign_language', lastVisitDate: null },
      { id: '6', address: 'Door 6', status: 'vacant', lastVisitDate: null },
      { id: '7', address: 'Door 7', status: 'inaccessible', lastVisitDate: null },
    ];
    const stats = calculateTerritoryCoverage(households as Household[]);
    expect(stats.totalDoors).toBe(7);
    expect(stats.workedDoors).toBe(7);
    expect(stats.coveragePercent).toBe(100);
  });

  describe('Assignment Period Scoped Coverage', () => {
    const households: Partial<Household>[] = [
      {
        id: 'h1',
        address: '101 Main St',
        status: 'active',
        lastVisitDate: '2026-08-10T10:00:00.000Z',
      },
      {
        id: 'h2',
        address: '102 Main St',
        status: 'active',
        lastVisitDate: '2026-01-15T14:00:00.000Z', // Old visit from previous assignment
      },
      {
        id: 'h3',
        address: '103 Main St',
        status: 'visited',
        lastVisitDate: '2025-12-01T09:00:00.000Z', // Old visit from last year
      },
      {
        id: 'h4',
        address: '104 Main St',
        status: 'new',
        lastVisitDate: null,
      },
    ];

    it('returns 0% for a new assignment starting after all past visits', () => {
      // Assignment started on Aug 15, 2026 (after h1's visit on Aug 10)
      const stats = calculateTerritoryCoverage(households as Household[], {
        assignedAt: '2026-08-15T00:00:00.000Z',
      });
      expect(stats.totalDoors).toBe(4);
      expect(stats.workedDoors).toBe(0);
      expect(stats.coveragePercent).toBe(0);
    });

    it('correctly calculates 25% (1/4) for an active assignment starting before h1 visit', () => {
      // Assignment started on Aug 01, 2026 (covers h1 on Aug 10, but not h2/h3 from Jan/Dec)
      const stats = calculateTerritoryCoverage(households as Household[], {
        assignedAt: '2026-08-01T00:00:00.000Z',
      });
      expect(stats.totalDoors).toBe(4);
      expect(stats.workedDoors).toBe(1);
      expect(stats.unworkedDoors).toBe(3);
      expect(stats.coveragePercent).toBe(25);
    });

    it('calculates coverage for a past completed assignment period [assignedAt, returnedAt]', () => {
      // Historical assignment from Jan 01, 2026 to Feb 01, 2026 (should cover h2 on Jan 15)
      const stats = calculateTerritoryCoverage(households as Household[], {
        assignedAt: '2026-01-01T00:00:00.000Z',
        returnedAt: '2026-02-01T00:00:00.000Z',
      });
      expect(stats.totalDoors).toBe(4);
      expect(stats.workedDoors).toBe(1);
      expect(stats.coveragePercent).toBe(25);
    });

    it('accurately matches visits passed via visits array with assignmentId or date range', () => {
      const visits: Partial<Visit>[] = [
        {
          id: 'v1',
          householdId: 'h1',
          assignmentId: 'assign-123',
          visitDate: '2026-08-05T10:00:00.000Z',
        },
        {
          id: 'v2',
          householdId: 'h4',
          assignmentId: 'assign-123',
          visitDate: '2026-08-08T11:00:00.000Z',
        },
        {
          id: 'v3',
          householdId: 'h2',
          assignmentId: 'other-assign',
          visitDate: '2026-01-10T12:00:00.000Z',
        },
      ];

      const stats = calculateTerritoryCoverage(households as Household[], {
        assignedAt: '2026-08-01',
        assignmentId: 'assign-123',
        visits: visits as Visit[],
      });

      // h1 (v1) and h4 (v2) worked during this assignment -> 2 of 4 = 50%
      expect(stats.totalDoors).toBe(4);
      expect(stats.workedDoors).toBe(2);
      expect(stats.coveragePercent).toBe(50);
    });

    it('handles YYYY-MM-DD date boundaries properly including end-of-day returns', () => {
      const visits: Partial<Visit>[] = [
        {
          id: 'v1',
          householdId: 'h1',
          visitDate: '2026-08-20T18:30:00.000Z', // Late afternoon on the return date
        },
      ];

      const stats = calculateTerritoryCoverage(households as Household[], {
        assignedAt: '2026-08-01',
        returnedAt: '2026-08-20',
        visits: visits as Visit[],
      });

      expect(stats.workedDoors).toBe(1);
      expect(stats.coveragePercent).toBe(25);
    });
  });

  describe('Date Parsing and Range Utilities', () => {
    it('parses start and end of day correctly', () => {
      const start = parseDateStartMs('2026-08-01');
      const end = parseDateEndMs('2026-08-01');
      expect(start).not.toBeNull();
      expect(end).not.toBeNull();
      expect(end! - start!).toBe(24 * 60 * 60 * 1000 - 1);
    });

    it('correctly checks isDateWithinPeriod', () => {
      const startMs = parseDateStartMs('2026-08-01')!;
      const endMs = parseDateEndMs('2026-08-31')!;

      expect(isDateWithinPeriod('2026-08-15T12:00:00Z', startMs, endMs)).toBe(true);
      expect(isDateWithinPeriod('2026-07-31T23:59:59Z', startMs, endMs)).toBe(false);
      expect(isDateWithinPeriod('2026-09-01T00:00:00Z', startMs, endMs)).toBe(false);
    });
  });
});
