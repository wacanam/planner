export const LOCAL_FIRST_CHANGE_EVENT = 'planner:local-first-change';
export const LOCAL_FIRST_SYNC_EVENT = 'planner:local-first-sync';
export const AVATAR_SYNCED_EVENT = 'planner:avatar-synced';

export function notifyLocalFirstChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(LOCAL_FIRST_CHANGE_EVENT));
}

export function notifyLocalFirstSync(detail: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(LOCAL_FIRST_SYNC_EVENT, { detail }));
}

export function notifyAvatarSynced(userId: string, avatarUrl?: string | null) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AVATAR_SYNCED_EVENT, { detail: { userId, avatarUrl } }));
}