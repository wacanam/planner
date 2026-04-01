// ─── User Role Enum ─────────────────────────────────────────────────────────

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SERVICE_OVERSEER: 'SERVICE_OVERSEER',
  TERRITORY_SERVANT: 'TERRITORY_SERVANT',
  USER: 'USER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// ─── Congregation Role Enum ─────────────────────────────────────────────────

export const CongregationRole = {
  SERVICE_OVERSEER: 'service_overseer',
  TERRITORY_SERVANT: 'territory_servant',
} as const;
export type CongregationRole = (typeof CongregationRole)[keyof typeof CongregationRole];

// ─── Group Role Enum ────────────────────────────────────────────────────────

export const GroupRole = {
  GROUP_OVERSEER: 'group_overseer',
  ASSISTANT_OVERSEER: 'assistant_overseer',
  MEMBER: 'member',
} as const;
export type GroupRole = (typeof GroupRole)[keyof typeof GroupRole];

// ─── Territory Status Enum ──────────────────────────────────────────────────

export const TerritoryStatus = {
  AVAILABLE: 'available',
  ASSIGNED: 'assigned',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;
export type TerritoryStatus = (typeof TerritoryStatus)[keyof typeof TerritoryStatus];

// ─── Assignment Status Enum ─────────────────────────────────────────────────

export const AssignmentStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  RETURNED: 'returned',
} as const;
export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

// ─── Rotation Status Enum ───────────────────────────────────────────────────

export const RotationStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
export type RotationStatus = (typeof RotationStatus)[keyof typeof RotationStatus];

// ─── Territory Request Status Enum ──────────────────────────────────────────

export const TerritoryRequestStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
export type TerritoryRequestStatus =
  (typeof TerritoryRequestStatus)[keyof typeof TerritoryRequestStatus];

// ─── Member Status Enum ──────────────────────────────────────────────────────

export const MemberStatus = {
  PENDING: 'pending',
  ACTIVE: 'active',
  REJECTED: 'rejected',
} as const;
export type MemberStatus = (typeof MemberStatus)[keyof typeof MemberStatus];

// ─── Notification Type Enum ──────────────────────────────────────────────────

export const NotificationType = {
  JOIN_REQUEST: 'join_request',
  JOIN_APPROVED: 'join_approved',
  JOIN_REJECTED: 'join_rejected',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
