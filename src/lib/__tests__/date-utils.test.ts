import { describe, expect, it } from 'vitest';
import { formatAssignmentDuration, formatDate, formatDateTime, getDueStatus } from '../date-utils';

describe('formatDate & formatDateTime', () => {
  it('formats YYYY-MM-DD date strings into short text e.g. "Jan 1, 2026"', () => {
    expect(formatDate('2026-01-01')).toBe('Jan 1, 2026');
    expect(formatDate('2026-12-25')).toBe('Dec 25, 2026');
    expect(formatDate('2026-08-26')).toBe('Aug 26, 2026');
  });

  it('formats full ISO string timestamps into short text', () => {
    expect(formatDate('2026-01-01T12:00:00.000Z')).toBe('Jan 1, 2026');
    expect(formatDate('2026-07-04T12:00:00.000Z')).toBe('Jul 4, 2026');
  });

  it('formats Date objects and numeric timestamps', () => {
    const d = new Date(2026, 0, 1);
    expect(formatDate(d)).toBe('Jan 1, 2026');
    expect(formatDate(d.getTime())).toBe('Jan 1, 2026');
  });

  it('handles null, undefined, empty strings with default fallback', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
    expect(formatDate('invalid-date')).toBe('—');
  });

  it('respects custom fallback', () => {
    expect(formatDate(null, 'Never')).toBe('Never');
    expect(formatDate(undefined, 'Active in Field')).toBe('Active in Field');
  });

  it('formats date and time with formatDateTime', () => {
    const dt = new Date('2026-01-01T10:30:00.000Z');
    const formatted = formatDateTime(dt);
    expect(formatted).toContain('Jan 1, 2026');
  });

  describe('getDueStatus', () => {
    it('returns empty status for null/empty due date', () => {
      expect(getDueStatus(null).status).toBe('none');
      expect(getDueStatus(undefined).status).toBe('none');
      expect(getDueStatus('').status).toBe('none');
    });

    it('returns overdue for past dates', () => {
      const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const res = getDueStatus(pastDate);
      expect(res.status).toBe('overdue');
      expect(res.label).toContain('Overdue by 3 days');
    });

    it('returns due-soon for dates within 14 days', () => {
      const nearDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const res = getDueStatus(nearDate);
      expect(res.status).toBe('due-soon');
      expect(res.label).toContain('Due in 5 days');
    });

    it('returns normal for dates far in the future', () => {
      const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      const res = getDueStatus(futureDate);
      expect(res.status).toBe('normal');
      expect(res.label).toContain('Due');
    });
  });

  describe('formatAssignmentDuration', () => {
    it('returns null for missing dates', () => {
      expect(formatAssignmentDuration(null, null)).toBeNull();
      expect(formatAssignmentDuration('2026-01-01', null)).toBeNull();
    });

    it('calculates days, weeks, and months correctly', () => {
      expect(formatAssignmentDuration('2026-01-01', '2026-01-08')).toBe('7 days');
      expect(formatAssignmentDuration('2026-01-01', '2026-01-22')).toBe('3 weeks');
      expect(formatAssignmentDuration('2026-01-01', '2026-04-01')).toContain('month');
    });
  });
});
