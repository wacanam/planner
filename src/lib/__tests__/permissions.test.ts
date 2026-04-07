import { describe, it, expect } from 'vitest';
import { hasPermission, hasRole } from '../permissions';
import { UserRole } from '@/db';

describe('hasPermission', () => {
  it('USER cannot access TERRITORY_SERVANT routes', () => {
    expect(hasPermission(UserRole.USER, UserRole.TERRITORY_SERVANT)).toBe(false);
  });

  it('TERRITORY_SERVANT can access USER routes', () => {
    expect(hasPermission(UserRole.TERRITORY_SERVANT, UserRole.USER)).toBe(true);
  });

  it('SERVICE_OVERSEER can access TERRITORY_SERVANT routes', () => {
    expect(hasPermission(UserRole.SERVICE_OVERSEER, UserRole.TERRITORY_SERVANT)).toBe(true);
  });

  it('ADMIN can access SERVICE_OVERSEER routes', () => {
    expect(hasPermission(UserRole.ADMIN, UserRole.SERVICE_OVERSEER)).toBe(true);
  });

  it('SUPER_ADMIN can access any route', () => {
    expect(hasPermission(UserRole.SUPER_ADMIN, UserRole.ADMIN)).toBe(true);
    expect(hasPermission(UserRole.SUPER_ADMIN, UserRole.USER)).toBe(true);
  });

  it('USER cannot access ADMIN routes', () => {
    expect(hasPermission(UserRole.USER, UserRole.ADMIN)).toBe(false);
  });
});

describe('hasRole', () => {
  it('returns true when role is in allowedRoles', () => {
    expect(hasRole(UserRole.SERVICE_OVERSEER, UserRole.SERVICE_OVERSEER, UserRole.ADMIN)).toBe(true);
  });

  it('returns false when role is not in allowedRoles', () => {
    expect(hasRole(UserRole.USER, UserRole.SERVICE_OVERSEER, UserRole.ADMIN)).toBe(false);
  });
});
