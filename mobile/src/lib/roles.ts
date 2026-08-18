// mobile/src/lib/roles.ts
export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SERVICE_OVERSEER: 'SERVICE_OVERSEER',
  TERRITORY_SERVANT: 'TERRITORY_SERVANT',
  USER: 'USER',
  PUBLISHER: 'USER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const CongregationRole = {
  SERVICE_OVERSEER: 'service_overseer',
  TERRITORY_SERVANT: 'territory_servant',
  PUBLISHER: 'publisher',
} as const;
export type CongregationRole = (typeof CongregationRole)[keyof typeof CongregationRole];

export const GroupRole = {
  GROUP_OVERSEER: 'group_overseer',
  ASSISTANT_OVERSEER: 'assistant_overseer',
  MEMBER: 'member',
} as const;
export type GroupRole = (typeof GroupRole)[keyof typeof GroupRole];

export const TerritoryStatus = {
  AVAILABLE: 'available',
  ASSIGNED: 'assigned',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;
export type TerritoryStatus = (typeof TerritoryStatus)[keyof typeof TerritoryStatus];

export const AssignmentStatus = {
  ACTIVE: 'active',
  PENDING_APPROVAL: 'pending_approval',
  COMPLETED: 'completed',
  RETURNED: 'returned',
  REJECTED: 'rejected',
} as const;
export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

export const EndorsementStatus = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
export type EndorsementStatus = (typeof EndorsementStatus)[keyof typeof EndorsementStatus];

export const ShareMode = {
  COLLABORATE: 'collaborate',
  TRANSFER: 'transfer',
} as const;
export type ShareMode = (typeof ShareMode)[keyof typeof ShareMode];

export const ShareStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
} as const;
export type ShareStatus = (typeof ShareStatus)[keyof typeof ShareStatus];

export const RotationStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
export type RotationStatus = (typeof RotationStatus)[keyof typeof RotationStatus];

export const TerritoryRequestStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
export type TerritoryRequestStatus =
  (typeof TerritoryRequestStatus)[keyof typeof TerritoryRequestStatus];

export const MemberStatus = {
  PENDING: 'pending',
  ACTIVE: 'active',
  REJECTED: 'rejected',
} as const;
export type MemberStatus = (typeof MemberStatus)[keyof typeof MemberStatus];

export const NotificationType = {
  JOIN_REQUEST: 'join_request',
  JOIN_APPROVED: 'join_approved',
  JOIN_REJECTED: 'join_rejected',
  TERRITORY_ENDORSED: 'territory_endorsed',
  TERRITORY_APPROVED: 'territory_approved',
  TERRITORY_REJECTED: 'territory_rejected',
  TERRITORY_RETURNED: 'territory_returned',
  SHARE_REQUEST: 'share_request',
  SHARE_ACCEPTED: 'share_accepted',
  SHARE_DECLINED: 'share_declined',
  ROLE_UPDATED: 'role_updated',
  ACCOUNT_REQUEST_SUBMITTED: 'account_request_submitted',
  ACCOUNT_REQUEST_RESOLVED: 'account_request_resolved',
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
