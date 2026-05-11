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
  notifications: 'notifications',
} as const;

export type FirestoreCollectionName = keyof typeof FIRESTORE_COLLECTIONS;

export function createClientId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function nowIso() {
  return new Date().toISOString();
}