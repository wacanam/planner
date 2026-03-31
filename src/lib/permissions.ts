import { UserRole } from '@/entities/User';

/** Role hierarchy — higher index = more permissions */
const ROLE_HIERARCHY: UserRole[] = [
  UserRole.USER,
  UserRole.TERRITORY_SERVANT,
  UserRole.SERVICE_OVERSEER,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
];

/**
 * Returns true if `userRole` has at least the permissions of `requiredRole`.
 */
export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}

/**
 * Returns true if `userRole` is exactly one of the `allowedRoles`.
 */
export function hasRole(userRole: UserRole, ...allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}
