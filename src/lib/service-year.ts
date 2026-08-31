// src/lib/service-year.ts

export interface ServiceYearRange {
  year: number; // e.g. 2027
  label: string; // e.g. "2026–2027 Service Year"
  shortLabel: string; // e.g. "SY 2027"
  startDate: Date; // Sep 1, (year - 1) 00:00:00.000
  endDate: Date; // Aug 31, year 23:59:59.999
  startIso: string;
  endIso: string;
  startMs: number;
  endMs: number;
}

export type ServiceYearPhase = 'early' | 'mid' | 'campaign' | 'final_push' | 'transition';

export interface ServiceYearCountdownInfo {
  serviceYear: number;
  daysRemaining: number;
  daysRemainingUnit: string; // 'Day' or 'Days'
  daysRemainingFormatted: string; // '1 day' or '184 days'
  timeRemainingFormatted: string; // 'Final day', '1 day left', '15 days', '6 mo (184d)'
  monthsRemaining: number;
  percentYearElapsed: number;
  phase: ServiceYearPhase;
  phaseTitle: string;
  phaseDescription: string;
  isCurrentServiceYear: boolean;
  isPastServiceYear: boolean;
  isFutureServiceYear: boolean;
  endDateFormatted: string;
}

/**
 * Returns the Service Year number for any given date.
 * A Service Year runs from September 1 of year Y-1 to August 31 of year Y, and is named year Y.
 * (Months are 0-indexed in JS Date: 0 = Jan, 7 = Aug, 8 = Sep)
 */
export function getServiceYear(
  date: Date | string | number | null | undefined = new Date()
): number {
  if (!date) {
    const now = new Date();
    return now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  }

  let d: Date;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    // Treat YYYY-MM-DD as local midday date to prevent UTC offset shifting
    const [y, m, day] = date.trim().split('-').map(Number);
    d = new Date(y, m - 1, day, 12, 0, 0, 0);
  } else {
    d = new Date(date);
  }

  if (isNaN(d.getTime())) {
    const now = new Date();
    return now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  }

  const year = d.getFullYear();
  const month = d.getMonth(); // 0 = Jan, 7 = Aug, 8 = Sep
  return month >= 8 ? year + 1 : year;
}

/**
 * Returns the full date boundaries (September 1 to August 31) for a designated Service Year.
 */
export function getServiceYearRange(serviceYear: number): ServiceYearRange {
  const startYear = serviceYear - 1;
  const endYear = serviceYear;

  const startDate = new Date(startYear, 8, 1, 0, 0, 0, 0); // Sep 1, (SY - 1)
  const endDate = new Date(endYear, 7, 31, 23, 59, 59, 999); // Aug 31, SY

  return {
    year: serviceYear,
    label: `${startYear}–${endYear} Service Year`,
    shortLabel: `SY ${serviceYear}`,
    startDate,
    endDate,
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString(),
    startMs: startDate.getTime(),
    endMs: endDate.getTime(),
  };
}

/**
 * Checks whether a given date falls within a specific service year.
 */
export function isDateInServiceYear(
  date: string | number | Date | null | undefined,
  serviceYear: number
): boolean {
  if (!date) return false;
  let targetMs: number;

  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    const [y, m, d] = date.trim().split('-').map(Number);
    targetMs = new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
  } else {
    targetMs = new Date(date).getTime();
  }

  if (isNaN(targetMs)) return false;

  const range = getServiceYearRange(serviceYear);
  return targetMs >= range.startMs && targetMs <= range.endMs;
}

/**
 * Generates an array of available service years based on historic records.
 * Always includes the current service year, sorted in descending order (newest first).
 */
export function getAvailableServiceYears(
  dates: (string | number | Date | null | undefined)[] = [],
  includeCurrent = true
): number[] {
  const currentSY = getServiceYear(new Date());
  const years = new Set<number>();

  if (includeCurrent) {
    years.add(currentSY);
  }

  for (const d of dates) {
    if (d) {
      years.add(getServiceYear(d));
    }
  }

  return Array.from(years).sort((a, b) => b - a);
}

/**
 * Computes countdown metrics, percentage of year elapsed, and seasonal phase
 * for a target Service Year relative to a given reference time.
 */
export function getServiceYearCountdown(
  referenceDate: Date | string | number = new Date(),
  targetSY?: number
): ServiceYearCountdownInfo {
  const ref = typeof referenceDate === 'object' ? referenceDate : new Date(referenceDate);
  const nowMs = isNaN(ref.getTime()) ? Date.now() : ref.getTime();
  const currentSY = getServiceYear(new Date(nowMs));
  const serviceYear = targetSY ?? currentSY;

  const range = getServiceYearRange(serviceYear);
  const totalDurationMs = range.endMs - range.startMs;
  const elapsedMs = Math.max(0, Math.min(totalDurationMs, nowMs - range.startMs));
  const remainingMs = Math.max(0, range.endMs - nowMs);

  const daysRemaining = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  const monthsRemaining = Math.max(0, Math.floor(daysRemaining / 30.4375));
  const daysRemainingUnit = daysRemaining === 1 ? 'Day' : 'Days';
  const daysRemainingFormatted = daysRemaining === 1 ? '1 day' : `${daysRemaining} days`;

  const percentYearElapsed = Math.min(
    100,
    Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100))
  );

  const isCurrentServiceYear = serviceYear === currentSY;
  const isPastServiceYear = serviceYear < currentSY || nowMs > range.endMs;
  const isFutureServiceYear = serviceYear > currentSY && nowMs < range.startMs;

  let timeRemainingFormatted: string;
  if (isPastServiceYear) {
    timeRemainingFormatted = 'Concluded';
  } else if (daysRemaining === 0) {
    timeRemainingFormatted = 'Ends today';
  } else if (daysRemaining === 1) {
    timeRemainingFormatted = '1 day (Ends today)';
  } else if (daysRemaining < 30) {
    timeRemainingFormatted = `${daysRemaining} days`;
  } else {
    timeRemainingFormatted = `${monthsRemaining} mo (${daysRemaining}d)`;
  }

  let phase: ServiceYearPhase = 'mid';
  let phaseTitle = 'Mid-Year Progress';
  let phaseDescription = 'Maintain steady territory coverage pacing.';

  if (isPastServiceYear) {
    phase = 'transition';
    phaseTitle = 'Service Year Concluded';
    phaseDescription = 'Annual period completed. Review official S-13 registers.';
  } else if (isFutureServiceYear) {
    phase = 'early';
    phaseTitle = 'Upcoming Service Year';
    phaseDescription = 'Starts on September 1.';
  } else if (daysRemaining <= 3) {
    phase = 'transition';
    phaseTitle = 'Year-End Closing';
    phaseDescription = 'Final days of the Service Year. Finalize assignments and coverage records.';
  } else if (daysRemaining <= 60) {
    phase = 'final_push';
    phaseTitle = 'Final Quarter Push';
    phaseDescription = 'Complete remaining unworked territories before August 31.';
  } else if (daysRemaining <= 180) {
    phase = 'campaign';
    phaseTitle = 'Campaign Season';
    phaseDescription = 'Special preaching campaigns and increased coverage activity.';
  } else if (daysRemaining <= 270) {
    phase = 'mid';
    phaseTitle = 'Mid-Year Pacing';
    phaseDescription = 'Aim to have half of congregation territories worked.';
  } else {
    phase = 'early';
    phaseTitle = 'Early Service Year';
    phaseDescription = 'Kick off territory assignments for the new service year.';
  }

  const endDateFormatted = range.endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    serviceYear,
    daysRemaining,
    daysRemainingUnit,
    daysRemainingFormatted,
    timeRemainingFormatted,
    monthsRemaining,
    percentYearElapsed,
    phase,
    phaseTitle,
    phaseDescription,
    isCurrentServiceYear,
    isPastServiceYear,
    isFutureServiceYear,
    endDateFormatted,
  };
}
