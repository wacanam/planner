import type { Household } from '@/types/api';

export interface TerritoryCoverageStats {
  totalDoors: number;
  workedDoors: number;
  unworkedDoors: number;
  coveragePercent: number;
}

/**
 * Dynamically computes real-time territory coverage based on household visits and status.
 * A household is considered worked/covered if:
 * 1. It has a recorded lastVisitDate
 * 2. It has totalVisitsCount > 0
 * 3. Its status is active, not_home, return_visit, do_not_visit (anything beyond initial 'new')
 */
export function calculateTerritoryCoverage(households: Household[] = []): TerritoryCoverageStats {
  const totalDoors = households.length;
  if (totalDoors === 0) {
    return {
      totalDoors: 0,
      workedDoors: 0,
      unworkedDoors: 0,
      coveragePercent: 0,
    };
  }

  const workedDoors = households.filter((h) => {
    if (!h) return false;
    if (h.lastVisitDate) return true;
    if (typeof h.totalVisitsCount === 'number' && h.totalVisitsCount > 0) return true;
    if (h.status && h.status.trim().toLowerCase() !== 'new') return true;
    return false;
  }).length;

  const unworkedDoors = totalDoors - workedDoors;
  const coveragePercent = Math.min(100, Math.max(0, Math.round((workedDoors / totalDoors) * 100)));

  return {
    totalDoors,
    workedDoors,
    unworkedDoors,
    coveragePercent,
  };
}
