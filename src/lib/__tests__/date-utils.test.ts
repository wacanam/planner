import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from '../date-utils';

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
});
