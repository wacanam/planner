import {
  collection,
  doc,
  type Firestore,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS, createClientId, nowIso } from '@/lib/firebase/schema';
import { NotificationType } from '@/lib/roles';
import type { Notification, NotificationDataPayload } from '@/types/api';

/**
 * Safely parse JSON data from a notification.
 */
export function parseNotificationData(
  notification: Pick<Notification, 'data'> | { data?: string | null } | null | undefined
): NotificationDataPayload {
  if (!notification?.data) return {};
  try {
    const parsed =
      typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Format timestamp into human-readable relative time (e.g., 'Just now', '5m ago', '2h ago', '3d ago').
 */
export function formatNotificationTime(
  timestamp: string | number | Date | null | undefined
): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (Number.isNaN(diffMs)) return '';

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) return 'Just now';
  if (diffSec < 90) return '1m ago';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Determine navigation target URL for a notification.
 */
export function getNotificationRoute(
  notification: Partial<Notification>,
  fallbackCongregationId?: string | null
): string | null {
  const data = parseNotificationData(notification);
  if (data.url && typeof data.url === 'string') {
    return data.url;
  }

  const congregationId = data.congregationId || fallbackCongregationId;

  switch (notification.type) {
    case NotificationType.TERRITORY_APPROVED:
      return congregationId ? `/congregation/${congregationId}/my-assignments` : null;

    case NotificationType.TERRITORY_ENDORSED:
    case NotificationType.TERRITORY_RETURNED:
    case NotificationType.TERRITORY_REJECTED:
      return congregationId ? `/congregation/${congregationId}/territories` : null;

    case NotificationType.SHARE_REQUEST:
    case NotificationType.SHARE_ACCEPTED:
    case NotificationType.SHARE_DECLINED:
      return congregationId ? `/congregation/${congregationId}/records/households` : null;

    case NotificationType.JOIN_REQUEST:
      return congregationId ? `/congregation/${congregationId}/members` : null;

    case NotificationType.JOIN_APPROVED:
      return congregationId ? `/congregation/${congregationId}/dashboard` : '/onboarding';

    case NotificationType.JOIN_REJECTED:
      return '/onboarding';

    case NotificationType.ROLE_UPDATED:
      return congregationId ? `/congregation/${congregationId}/dashboard` : '/profile';

    case NotificationType.ACCOUNT_REQUEST_SUBMITTED:
      return congregationId ? `/congregation/${congregationId}/members` : '/profile';

    case NotificationType.ACCOUNT_REQUEST_RESOLVED:
      return '/profile';

    default:
      return congregationId ? `/congregation/${congregationId}/dashboard` : null;
  }
}

export interface NotificationVisuals {
  category: string;
  badgeLabel: string;
  colorClass: string;
  iconName:
    | 'map-pin'
    | 'users'
    | 'share'
    | 'check-circle'
    | 'x-circle'
    | 'shield'
    | 'bell'
    | 'info';
}

/**
 * Get category, badge label, and color themes for a notification type.
 */
export function getNotificationVisuals(type: string | undefined | null): NotificationVisuals {
  switch (type) {
    case NotificationType.TERRITORY_APPROVED:
      return {
        category: 'Territory',
        badgeLabel: 'Assignment Approved',
        colorClass:
          'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        iconName: 'check-circle',
      };
    case NotificationType.TERRITORY_ENDORSED:
      return {
        category: 'Territory',
        badgeLabel: 'Endorsement',
        colorClass: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
        iconName: 'map-pin',
      };
    case NotificationType.TERRITORY_REJECTED:
      return {
        category: 'Territory',
        badgeLabel: 'Declined',
        colorClass: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
        iconName: 'x-circle',
      };
    case NotificationType.TERRITORY_RETURNED:
      return {
        category: 'Territory',
        badgeLabel: 'Returned',
        colorClass: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
        iconName: 'map-pin',
      };
    case NotificationType.SHARE_REQUEST:
      return {
        category: 'Sharing',
        badgeLabel: 'Share Request',
        colorClass: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
        iconName: 'share',
      };
    case NotificationType.SHARE_ACCEPTED:
      return {
        category: 'Sharing',
        badgeLabel: 'Share Accepted',
        colorClass:
          'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        iconName: 'check-circle',
      };
    case NotificationType.SHARE_DECLINED:
      return {
        category: 'Sharing',
        badgeLabel: 'Share Declined',
        colorClass: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
        iconName: 'x-circle',
      };
    case NotificationType.JOIN_REQUEST:
      return {
        category: 'Membership',
        badgeLabel: 'Join Request',
        colorClass: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
        iconName: 'users',
      };
    case NotificationType.JOIN_APPROVED:
      return {
        category: 'Membership',
        badgeLabel: 'Access Granted',
        colorClass:
          'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        iconName: 'check-circle',
      };
    case NotificationType.JOIN_REJECTED:
      return {
        category: 'Membership',
        badgeLabel: 'Access Denied',
        colorClass: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
        iconName: 'x-circle',
      };
    case NotificationType.ROLE_UPDATED:
      return {
        category: 'Account',
        badgeLabel: 'Role Updated',
        colorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        iconName: 'shield',
      };
    case NotificationType.ACCOUNT_REQUEST_SUBMITTED:
    case NotificationType.ACCOUNT_REQUEST_RESOLVED:
      return {
        category: 'Account',
        badgeLabel: 'Account Request',
        colorClass: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
        iconName: 'info',
      };
    default:
      return {
        category: 'System',
        badgeLabel: 'Notice',
        colorClass: 'text-muted-foreground bg-muted border-border',
        iconName: 'bell',
      };
  }
}

/**
 * Low-level helper to write a single notification document to Firestore.
 */
export async function createInAppNotification(
  firestore: Firestore,
  params: {
    userId: string;
    type: string;
    title: string;
    body: string;
    data?: NotificationDataPayload | Record<string, unknown> | null;
    id?: string;
  }
): Promise<Notification> {
  const id = params.id ?? createClientId();
  const now = nowIso();
  const serializedData =
    params.data !== undefined && params.data !== null
      ? typeof params.data === 'string'
        ? params.data
        : JSON.stringify(params.data)
      : null;

  const notification: Notification = {
    id,
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    data: serializedData,
    isRead: false,
    createdAt: now,
    readAt: null,
  };

  await setDoc(doc(firestore, FIRESTORE_COLLECTIONS.notifications, id), notification);
  return notification;
}

/**
 * Dispatch notifications to all Service Overseers of a congregation.
 */
export async function notifyCongregationOverseers(
  firestore: Firestore,
  congregationId: string,
  params: {
    type: string;
    title: string;
    body: string;
    data?: NotificationDataPayload | Record<string, unknown> | null;
    excludeUserId?: string | null;
  }
): Promise<string[]> {
  if (!congregationId) return [];

  const overseerUserIds = new Set<string>();

  try {
    // 1. Check congregationMembers collection for service overseers or admins
    const membersSnap = await getDocs(
      query(
        collection(firestore, FIRESTORE_COLLECTIONS.congregationMembers),
        where('congregationId', '==', congregationId),
        where('status', 'in', ['active', 'approved'])
      )
    );

    for (const d of membersSnap.docs) {
      const data = d.data();
      const role = String(data.congregationRole || data.role || '').toLowerCase();
      if (
        role === 'service_overseer' ||
        role === 'admin' ||
        role === 'super_admin' ||
        role.includes('overseer')
      ) {
        const uId = data.userId || d.id;
        if (uId && uId !== params.excludeUserId) {
          overseerUserIds.add(uId);
        }
      }
    }
  } catch (err) {
    console.error('Error fetching congregation overseer members:', err);
  }

  // 2. If no overseers found in members, check users collection for fallback
  if (overseerUserIds.size === 0) {
    try {
      const usersSnap = await getDocs(
        query(
          collection(firestore, FIRESTORE_COLLECTIONS.users),
          where('congregationId', '==', congregationId)
        )
      );

      for (const d of usersSnap.docs) {
        const data = d.data();
        const role = String(data.congregationRole || data.role || '').toLowerCase();
        if (
          role === 'service_overseer' ||
          role === 'admin' ||
          role === 'super_admin' ||
          role.includes('overseer')
        ) {
          if (d.id && d.id !== params.excludeUserId) {
            overseerUserIds.add(d.id);
          }
        }
      }
    } catch (err) {
      console.error('Error querying overseer users:', err);
    }
  }

  const recipientIds = Array.from(overseerUserIds);
  if (recipientIds.length === 0) return [];

  const batch = writeBatch(firestore);
  const now = nowIso();
  const serializedData =
    params.data !== undefined && params.data !== null
      ? typeof params.data === 'string'
        ? params.data
        : JSON.stringify(params.data)
      : null;

  const createdIds: string[] = [];

  for (const userId of recipientIds) {
    const notifId = createClientId();
    createdIds.push(notifId);
    const notification: Notification = {
      id: notifId,
      userId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: serializedData,
      isRead: false,
      createdAt: now,
      readAt: null,
    };
    batch.set(doc(firestore, FIRESTORE_COLLECTIONS.notifications, notifId), notification);
  }

  await batch.commit();
  return createdIds;
}
