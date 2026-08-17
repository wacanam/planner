import { describe, expect, it } from 'vitest';
import { calculateTerritoryCoverage } from '@/lib/territory-coverage';
import type { Household } from '@/types/api';

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

  it('calculates 0% when all households are new and unvisited', () => {
    const households: Partial<Household>[] = [
      { id: '1', address: 'Door 1', status: 'new', lastVisitDate: null, totalVisitsCount: 0 },
      { id: '2', address: 'Door 2', status: 'new', lastVisitDate: null },
    ];
    const stats = calculateTerritoryCoverage(households as Household[]);
    expect(stats.totalDoors).toBe(2);
    expect(stats.workedDoors).toBe(0);
    expect(stats.coveragePercent).toBe(0);
  });

  it('calculates 50% when half of doors have been visited', () => {
    const households: Partial<Household>[] = [
      { id: '1', address: 'Door 1', status: 'active', lastVisitDate: '2026-08-15', totalVisitsCount: 1 },
      { id: '2', address: 'Door 2', status: 'new', lastVisitDate: null, totalVisitsCount: 0 },
    ];
    const stats = calculateTerritoryCoverage(households as Household[]);
    expect(stats.totalDoors).toBe(2);
    expect(stats.workedDoors).toBe(1);
    expect(stats.unworkedDoors).toBe(1);
    expect(stats.coveragePercent).toBe(50);
  });

  it('calculates 100% when all doors are worked', () => {
    const households: Partial<Household>[] = [
      { id: '1', address: 'Door 1', status: 'return_visit', lastVisitDate: '2026-08-15' },
      { id: '2', address: 'Door 2', status: 'not_home', lastVisitDate: '2026-08-16' },
      { id: '3', address: 'Door 3', status: 'do_not_visit', lastVisitDate: null },
    ];
    const stats = calculateTerritoryCoverage(households as Household[]);
    expect(stats.totalDoors).toBe(3);
    expect(stats.workedDoors).toBe(3);
    expect(stats.coveragePercent).toBe(100);
  });
});
