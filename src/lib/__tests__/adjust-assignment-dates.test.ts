import { describe, expect, it } from 'vitest';
import { normalizeDateToIso } from '@/hooks/use-assignments';
import { canAdjustAssignmentDates } from '@/lib/permissions';
import { UserRole } from '@/lib/roles';

describe('Assignment Date Adjustment Permissions', () => {
  it('should allow SERVICE_OVERSEER to adjust assignment dates', () => {
    expect(canAdjustAssignmentDates(UserRole.SERVICE_OVERSEER)).toBe(true);
    expect(canAdjustAssignmentDates('service_overseer')).toBe(true);
  });

  it('should allow TERRITORY_SERVANT to adjust assignment dates', () => {
    expect(canAdjustAssignmentDates(UserRole.TERRITORY_SERVANT)).toBe(true);
    expect(canAdjustAssignmentDates('territory_servant')).toBe(true);
  });

  it('should allow ADMIN and SUPER_ADMIN to adjust assignment dates', () => {
    expect(canAdjustAssignmentDates(UserRole.ADMIN)).toBe(true);
    expect(canAdjustAssignmentDates(UserRole.SUPER_ADMIN)).toBe(true);
    expect(canAdjustAssignmentDates('admin')).toBe(true);
    expect(canAdjustAssignmentDates('super_admin')).toBe(true);
  });

  it('should not allow PUBLISHER or VISITING_PUBLISHER or general USER to adjust assignment dates', () => {
    expect(canAdjustAssignmentDates(UserRole.PUBLISHER)).toBe(false);
    expect(canAdjustAssignmentDates(UserRole.USER)).toBe(false);
    expect(canAdjustAssignmentDates(UserRole.VISITING_PUBLISHER)).toBe(false);
    expect(canAdjustAssignmentDates(null)).toBe(false);
    expect(canAdjustAssignmentDates(undefined)).toBe(false);
    expect(canAdjustAssignmentDates('')).toBe(false);
  });
});

describe('Date Normalization Helper (normalizeDateToIso)', () => {
  it('should normalize YYYY-MM-DD input string to full ISO timestamp', () => {
    const result = normalizeDateToIso('2026-05-15');
    expect(result).toBe('2026-05-15T12:00:00.000Z');
  });

  it('should preserve full ISO date strings', () => {
    const iso = '2026-04-10T08:30:00.000Z';
    const result = normalizeDateToIso(iso);
    expect(result).toBe(iso);
  });

  it('should handle falsy values by returning a fallback ISO date', () => {
    const fallback = normalizeDateToIso(undefined);
    expect(typeof fallback).toBe('string');
    expect(!Number.isNaN(new Date(fallback).getTime())).toBe(true);

    const fallbackNull = normalizeDateToIso(null);
    expect(typeof fallbackNull).toBe('string');
    expect(!Number.isNaN(new Date(fallbackNull).getTime())).toBe(true);
  });
});
