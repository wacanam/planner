// src/lib/__tests__/service-year.test.ts
import { describe, expect, it } from 'vitest';
import {
  getAvailableServiceYears,
  getServiceYear,
  getServiceYearCountdown,
  getServiceYearRange,
  isDateInServiceYear,
} from '@/lib/service-year';

describe('Service Year Calculations', () => {
  describe('getServiceYear', () => {
    it('identifies September dates as the start of the next year designated service year', () => {
      // Sep 1, 2026 is start of Service Year 2027
      expect(getServiceYear('2026-09-01')).toBe(2027);
      expect(getServiceYear('2026-09-15T10:00:00.000Z')).toBe(2027);
      expect(getServiceYear(new Date(2026, 8, 1))).toBe(2027);
    });

    it('identifies December dates as part of the next year designated service year', () => {
      expect(getServiceYear('2026-12-31')).toBe(2027);
      expect(getServiceYear(new Date(2026, 11, 25))).toBe(2027);
    });

    it('identifies January dates as part of the current year service year', () => {
      expect(getServiceYear('2027-01-01')).toBe(2027);
      expect(getServiceYear(new Date(2027, 0, 15))).toBe(2027);
    });

    it('identifies August dates as the end of the current year service year', () => {
      // Aug 31, 2026 is the final day of Service Year 2026
      expect(getServiceYear('2026-08-31')).toBe(2026);
      expect(getServiceYear(new Date(2026, 7, 31))).toBe(2026);
    });

    it('handles null / undefined by returning current service year', () => {
      const sy = getServiceYear(null);
      expect(typeof sy).toBe('number');
      expect(sy).toBeGreaterThan(2020);
    });
  });

  describe('getServiceYearRange', () => {
    it('returns exact September 1 to August 31 bounds for SY 2027', () => {
      const range = getServiceYearRange(2027);
      expect(range.year).toBe(2027);
      expect(range.label).toBe('2026–2027 Service Year');
      expect(range.shortLabel).toBe('SY 2027');

      expect(range.startDate.getFullYear()).toBe(2026);
      expect(range.startDate.getMonth()).toBe(8); // September
      expect(range.startDate.getDate()).toBe(1);

      expect(range.endDate.getFullYear()).toBe(2027);
      expect(range.endDate.getMonth()).toBe(7); // August
      expect(range.endDate.getDate()).toBe(31);
    });
  });

  describe('isDateInServiceYear', () => {
    it('validates dates correctly inside and outside the service year', () => {
      // SY 2027 is 2026-09-01 through 2027-08-31
      expect(isDateInServiceYear('2026-09-01', 2027)).toBe(true);
      expect(isDateInServiceYear('2027-03-15', 2027)).toBe(true);
      expect(isDateInServiceYear('2027-08-31', 2027)).toBe(true);

      // Outside
      expect(isDateInServiceYear('2026-08-31', 2027)).toBe(false);
      expect(isDateInServiceYear('2027-09-01', 2027)).toBe(false);
      expect(isDateInServiceYear(null, 2027)).toBe(false);
    });
  });

  describe('getAvailableServiceYears', () => {
    it('extracts unique, sorted service years from historical dates', () => {
      const dates = [
        '2024-10-10', // SY 2025
        '2025-02-14', // SY 2025
        '2025-09-05', // SY 2026
        '2026-08-20', // SY 2026
        '2026-09-01', // SY 2027
      ];

      const years = getAvailableServiceYears(dates);
      expect(years).toContain(2025);
      expect(years).toContain(2026);
      expect(years).toContain(2027);
      expect(years[0]).toBeGreaterThan(years[1]); // Descending
    });
  });

  describe('getServiceYearCountdown', () => {
    it('computes accurate remaining days and seasonal phase for start of year', () => {
      // On Sep 1, 2026 (beginning of SY 2027)
      const countdown = getServiceYearCountdown('2026-09-01T00:00:00.000Z', 2027);
      expect(countdown.serviceYear).toBe(2027);
      expect(countdown.daysRemaining).toBeGreaterThanOrEqual(364);
      expect(countdown.daysRemainingUnit).toBe('Days');
      expect(countdown.percentYearElapsed).toBe(0);
      expect(countdown.phase).toBe('early');
      expect(countdown.isCurrentServiceYear).toBe(true);
    });

    it('handles final day of service year with accurate singular unit and timeRemaining formatting', () => {
      // On Aug 31, 2026 morning (final day of SY 2026)
      const countdown = getServiceYearCountdown('2026-08-31T08:50:00.000Z', 2026);
      expect(countdown.serviceYear).toBe(2026);
      expect(countdown.daysRemaining).toBe(1);
      expect(countdown.daysRemainingUnit).toBe('Day');
      expect(countdown.daysRemainingFormatted).toBe('1 day');
      expect(countdown.timeRemainingFormatted).toBe('1 day (Ends today)');
      expect(countdown.monthsRemaining).toBe(0);
      expect(countdown.percentYearElapsed).toBe(100);
      expect(countdown.phase).toBe('transition');
      expect(countdown.phaseTitle).toBe('Year-End Closing');
    });

    it('computes accurate metrics for mid-year (Spring campaign season)', () => {
      // On April 1, 2027 (approx 150 days remaining in SY 2027)
      const countdown = getServiceYearCountdown('2027-04-01T00:00:00.000Z', 2027);
      expect(countdown.serviceYear).toBe(2027);
      expect(countdown.daysRemaining).toBeLessThan(180);
      expect(countdown.daysRemaining).toBeGreaterThan(60);
      expect(countdown.daysRemainingUnit).toBe('Days');
      expect(countdown.phase).toBe('campaign');
      expect(countdown.percentYearElapsed).toBeGreaterThan(50);
    });

    it('identifies final push phase within last 60 days', () => {
      // On July 15, 2027
      const countdown = getServiceYearCountdown('2027-07-15T00:00:00.000Z', 2027);
      expect(countdown.phase).toBe('final_push');
      expect(countdown.daysRemaining).toBeLessThanOrEqual(60);
    });

    it('handles past concluded service years appropriately', () => {
      // SY 2025 checked in 2027
      const countdown = getServiceYearCountdown('2027-01-01T00:00:00.000Z', 2025);
      expect(countdown.isPastServiceYear).toBe(true);
      expect(countdown.percentYearElapsed).toBe(100);
      expect(countdown.daysRemaining).toBe(0);
      expect(countdown.daysRemainingUnit).toBe('Days');
      expect(countdown.timeRemainingFormatted).toBe('Concluded');
      expect(countdown.phase).toBe('transition');
    });
  });
});
