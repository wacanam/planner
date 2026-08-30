import type { Household, Visit } from '@/types/api';

export interface TerritoryCoverageStats {
  totalDoors: number;
  workedDoors: number;
  unworkedDoors: number;
  coveragePercent: number;
}

export interface TerritoryCoverageOptions {
  assignedAt?: string | number | Date | null;
  returnedAt?: string | number | Date | null;
  assignmentId?: string | null;
  visits?: Visit[] | null;
}

/**
 * Parses a date value into millisecond timestamp representing the start of that day (00:00:00.000).
 */
export function parseDateStartMs(date?: string | number | Date | null): number | null {
  if (date === null || date === undefined || date === '') return null;
  if (typeof date === 'number') return Number.isNaN(date) ? null : date;
  if (date instanceof Date) {
    const t = date.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
    }
    const parsed = new Date(trimmed).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Parses a date value into millisecond timestamp representing the end of that day (23:59:59.999).
 */
export function parseDateEndMs(date?: string | number | Date | null): number | null {
  if (date === null || date === undefined || date === '') return null;
  if (typeof date === 'number') return Number.isNaN(date) ? null : date;
  if (date instanceof Date) {
    const t = date.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
    }
    const parsed = new Date(trimmed);
    const t = parsed.getTime();
    if (Number.isNaN(t)) return null;
    // If it is a midnight UTC timestamp (e.g. 2026-08-20T00:00:00.000Z), extend through end of that day
    if (
      parsed.getUTCHours() === 0 &&
      parsed.getUTCMinutes() === 0 &&
      parsed.getUTCSeconds() === 0 &&
      parsed.getUTCMilliseconds() === 0
    ) {
      return t + 24 * 60 * 60 * 1000 - 1;
    }
    return t;
  }
  return null;
}

/**
 * Checks if a given date string or timestamp falls within [startMs, endMs].
 */
export function isDateWithinPeriod(
  date?: string | number | Date | null,
  startMs?: number | null,
  endMs?: number | null
): boolean {
  if (!date) return false;
  const targetMs = parseDateStartMs(date);
  if (targetMs === null) return false;
  if (startMs !== null && startMs !== undefined && targetMs < startMs) return false;
  if (endMs !== null && endMs !== undefined && targetMs > endMs) return false;
  return true;
}

/**
 * Dynamically computes territory coverage based on household visits within an assignment period.
 *
 * When an assignment period (assignedAt, returnedAt, or assignmentId) is provided:
 * A household is considered worked if:
 * 1. It has a visit during the assignment period (matched by assignmentId or visitDate in [assignedAt, returnedAt])
 * 2. Or its lastVisitDate occurred within [assignedAt, returnedAt]
 *
 * When no assignment period is provided (all-time / fallback mode):
 * A household is considered worked if:
 * 1. It has a recorded lastVisitDate
 * 2. It has totalVisitsCount > 0
 * 3. Its status is active, return_visit, not_home, busy, etc. (anything beyond initial 'new')
 */
export function calculateTerritoryCoverage(
  households: Household[] = [],
  options?: TerritoryCoverageOptions | null
): TerritoryCoverageStats {
  const totalDoors = households.length;
  if (totalDoors === 0) {
    return {
      totalDoors: 0,
      workedDoors: 0,
      unworkedDoors: 0,
      coveragePercent: 0,
    };
  }

  const assignedAt = options?.assignedAt;
  const returnedAt = options?.returnedAt;
  const assignmentId = options?.assignmentId;
  const visits = options?.visits;

  const startMs = parseDateStartMs(assignedAt);
  const endMs = parseDateEndMs(returnedAt);
  const hasPeriod = startMs !== null || endMs !== null || Boolean(assignmentId);

  // Group visits by householdId for fast lookup
  const visitsByHousehold = new Map<string, Visit[]>();
  if (visits && visits.length > 0) {
    for (const v of visits) {
      if (v.householdId) {
        if (!visitsByHousehold.has(v.householdId)) {
          visitsByHousehold.set(v.householdId, []);
        }
        visitsByHousehold.get(v.householdId)?.push(v);
      }
    }
  }

  const workedDoors = households.filter((h) => {
    if (!h) return false;

    if (hasPeriod) {
      // 1. Check if household has matching visits during this assignment period
      const hVisits = visitsByHousehold.get(h.id);
      if (hVisits && hVisits.length > 0) {
        const hasWorkedVisit = hVisits.some((v) => {
          if (assignmentId && v.assignmentId === assignmentId) return true;
          return isDateWithinPeriod(v.visitDate, startMs, endMs);
        });
        if (hasWorkedVisit) return true;
      }

      // 2. Check if household's lastVisitDate is within this assignment period
      if (h.lastVisitDate && isDateWithinPeriod(h.lastVisitDate, startMs, endMs)) {
        return true;
      }

      // If an assignment period is specified, past visits from previous assignments do NOT count
      return false;
    }

    // Default / All-Time mode (when no assignment period is specified)
    if (h.lastVisitDate) return true;
    if (typeof h.totalVisitsCount === 'number' && h.totalVisitsCount > 0) return true;
    if (h.status && h.status.trim().toLowerCase() !== 'new') return true;
    return false;
  }).length;

  const unworkedDoors = Math.max(0, totalDoors - workedDoors);
  const coveragePercent = Math.min(100, Math.max(0, Math.round((workedDoors / totalDoors) * 100)));

  return {
    totalDoors,
    workedDoors,
    unworkedDoors,
    coveragePercent,
  };
}
