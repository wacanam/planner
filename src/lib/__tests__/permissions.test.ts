import { describe, expect, it } from 'vitest';
import { UserRole } from '@/lib/roles';
import {
  hasPermission,
  hasRole,
  isServiceOverseer,
  isSystemAdmin,
  isTerritoryServant,
} from '../permissions';

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
    expect(hasRole(UserRole.SERVICE_OVERSEER, UserRole.SERVICE_OVERSEER, UserRole.ADMIN)).toBe(
      true
    );
  });

  it('returns false when role is not in allowedRoles', () => {
    expect(hasRole(UserRole.USER, UserRole.SERVICE_OVERSEER, UserRole.ADMIN)).toBe(false);
  });
});

describe('RBAC Matrix Helper Functions', () => {
  it('identifies system admins correctly', () => {
    expect(isSystemAdmin(UserRole.SUPER_ADMIN)).toBe(true);
    expect(isSystemAdmin(UserRole.ADMIN)).toBe(true);
    expect(isSystemAdmin(UserRole.SERVICE_OVERSEER)).toBe(false);
    expect(isSystemAdmin(UserRole.USER)).toBe(false);
  });

  it('identifies service overseers and higher', () => {
    expect(isServiceOverseer(UserRole.SUPER_ADMIN)).toBe(true);
    expect(isServiceOverseer(UserRole.SERVICE_OVERSEER)).toBe(true);
    expect(isServiceOverseer(UserRole.TERRITORY_SERVANT)).toBe(false);
    expect(isServiceOverseer(UserRole.USER)).toBe(false);
  });

  it('identifies territory servants and higher (can draw boundary and create territories)', () => {
    expect(isTerritoryServant(UserRole.SUPER_ADMIN)).toBe(true);
    expect(isTerritoryServant(UserRole.SERVICE_OVERSEER)).toBe(true);
    expect(isTerritoryServant(UserRole.TERRITORY_SERVANT)).toBe(true);
    expect(isTerritoryServant(UserRole.USER)).toBe(false);
  });
});
