// mobile/src/lib/schema.ts

export const FIRESTORE_COLLECTIONS = {
  users: 'users',
  congregations: 'congregations',
  congregationMembers: 'congregationMembers',
  groups: 'groups',
  territories: 'territories',
  territoryRequests: 'territoryRequests',
  assignments: 'assignments',
  households: 'households',
  visits: 'visits',
  encounters: 'encounters',
  householdShares: 'householdShares',
  notifications: 'notifications',
  accountRequests: 'accountRequests',
  invitations: 'invitations',
  announcements: 'announcements',
  mail: 'mail',
} as const;

export type FirestoreCollectionName = keyof typeof FIRESTORE_COLLECTIONS;

export function createClientId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
