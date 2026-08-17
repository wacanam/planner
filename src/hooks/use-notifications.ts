import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthSession as useSession } from '@/lib/firebase/auth';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { FIRESTORE_COLLECTIONS, createClientId, nowIso } from '@/lib/firebase/schema';
import { playNotificationSound } from '@/lib/sound';
import type { Notification, NotificationDataPayload } from '@/types/api';

function notificationCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.notifications);
}

function notificationDocument(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.notifications, id);
}

export function notificationFromData(id: string, data: Partial<Notification>): Notification {
  return {
    id,
    userId: data.userId ?? '',
    type: data.type ?? 'info',
    title: data.title ?? 'Notification',
    body: data.body ?? '',
    data: data.data ?? null,
    isRead: data.isRead ?? false,
    createdAt: data.createdAt ?? nowIso(),
    readAt: data.readAt ?? null,
  };
}

export function useNotifications() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setIsLoading(false);
      isInitializedRef.current = false;
      return;
    }

    setIsLoading(true);
    const notificationQuery = query(notificationCollection(), where('userId', '==', userId));
    return onSnapshot(
      notificationQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        // Detect if any new unread notification was added after initial subscription
        const hasNewIncoming = snapshot.docChanges().some((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            return !data.isRead;
          }
          return false;
        });

        if (isInitializedRef.current && hasNewIncoming && !snapshot.metadata.hasPendingWrites) {
          playNotificationSound();
        }
        isInitializedRef.current = true;

        setNotifications(
          snapshot.docs
            .map((document) =>
              notificationFromData(document.id, document.data() as Partial<Notification>)
            )
            .sort((left, right) => (right.createdAt ?? '').localeCompare(left.createdAt ?? ''))
        );
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, [userId]);

  return {
    notifications,
    unreadCount: notifications.filter((notification) => !notification.isRead).length,
    isLoading,
    error,
  };
}

export function useMarkNotificationsRead() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [isMarking, setIsMarking] = useState(false);

  const markRead = useCallback(
    async (arg?: { id?: string; ids?: string[] }) => {
      if (!userId) return;
      setIsMarking(true);
      try {
        const firestore = getPlannerFirestore();
        const now = nowIso();
        const singleId = arg?.id;
        const targetIds = singleId
          ? [singleId]
          : arg?.ids?.length
            ? arg.ids
            : (await getDocs(query(notificationCollection(), where('userId', '==', userId)))).docs
                .map((document) => notificationFromData(document.id, document.data()))
                .filter((notification) => !notification.isRead)
                .map((notification) => notification.id);

        if (targetIds.length === 0) return;

        if (targetIds.length === 1) {
          await updateDoc(notificationDocument(targetIds[0]), { isRead: true, readAt: now });
        } else {
          const batch = writeBatch(firestore);
          for (const id of targetIds) {
            batch.update(notificationDocument(id), { isRead: true, readAt: now });
          }
          await batch.commit();
        }
      } finally {
        setIsMarking(false);
      }
    },
    [userId]
  );

  return { markRead, markAllRead: markRead, isMarking };
}

export function useMarkNotificationUnread() {
  const [isMarking, setIsMarking] = useState(false);

  const markUnread = useCallback(async (id: string) => {
    if (!id) return;
    setIsMarking(true);
    try {
      await updateDoc(notificationDocument(id), { isRead: false, readAt: null });
    } finally {
      setIsMarking(false);
    }
  }, []);

  return { markUnread, isMarking };
}

export function useCreateNotification() {
  const [isCreating, setIsCreating] = useState(false);
  const create = useCallback(
    async (
      arg: Omit<Notification, 'id' | 'createdAt' | 'isRead'> & {
        id?: string;
        createdAt?: string;
        isRead?: boolean;
        data?: NotificationDataPayload | string | null;
      }
    ) => {
      setIsCreating(true);
      try {
        const id = arg.id ?? createClientId();
        const serializedData =
          arg.data !== undefined && arg.data !== null
            ? typeof arg.data === 'string'
              ? arg.data
              : JSON.stringify(arg.data)
            : null;

        await setDoc(notificationDocument(id), {
          id,
          userId: arg.userId,
          type: arg.type,
          title: arg.title,
          body: arg.body,
          data: serializedData,
          isRead: arg.isRead ?? false,
          createdAt: arg.createdAt ?? nowIso(),
          readAt: null,
        } satisfies Notification);
        return { id };
      } finally {
        setIsCreating(false);
      }
    },
    []
  );
  return { create, isCreating };
}

export function useDeleteNotification() {
  const [isDeleting, setIsDeleting] = useState(false);
  const remove = useCallback(async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteDoc(notificationDocument(id));
    } finally {
      setIsDeleting(false);
    }
  }, []);
  return { remove, deleteNotification: remove, isDeleting };
}

export function useClearAllNotifications() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [isClearing, setIsClearing] = useState(false);

  const clearAll = useCallback(async () => {
    if (!userId) return;
    setIsClearing(true);
    try {
      const snap = await getDocs(query(notificationCollection(), where('userId', '==', userId)));
      if (snap.empty) return;
      const firestore = getPlannerFirestore();
      const batch = writeBatch(firestore);
      for (const d of snap.docs) {
        batch.delete(d.ref);
      }
      await batch.commit();
    } finally {
      setIsClearing(false);
    }
  }, [userId]);

  return { clearAll, isClearing };
}
