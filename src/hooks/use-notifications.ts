import { useCallback, useEffect, useState } from 'react';
import { useAuthSession as useSession } from '@/lib/firebase/auth';
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
} from 'firebase/firestore';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { createClientId, FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';
import type { Notification } from '@/types/api';

function notificationCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.notifications);
}

function notificationDocument(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.notifications, id);
}

function notificationFromData(id: string, data: Partial<Notification>): Notification {
  return {
    id,
    userId: data.userId ?? '',
    type: data.type ?? 'info',
    title: data.title ?? 'Notification',
    body: data.body ?? '',
    data: data.data ?? null,
    isRead: data.isRead ?? false,
    createdAt: data.createdAt ?? nowIso(),
  };
}

export function useNotifications() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const notificationQuery = query(notificationCollection(), where('userId', '==', userId));
    return onSnapshot(
      notificationQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        setNotifications(
          snapshot.docs
            .map((document) =>
              notificationFromData(document.id, document.data() as Partial<Notification>)
            )
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
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
    async (arg?: { ids?: string[] }) => {
      if (!userId) return;
      setIsMarking(true);
      try {
        const ids = arg?.ids;
        const targets = ids?.length
          ? ids
          : (await getDocs(query(notificationCollection(), where('userId', '==', userId)))).docs
              .map((document) => notificationFromData(document.id, document.data()))
              .filter((notification) => !notification.isRead)
              .map((notification) => notification.id);
        await Promise.all(
          targets.map((id) =>
            updateDoc(notificationDocument(id), { isRead: true, readAt: nowIso() })
          )
        );
      } finally {
        setIsMarking(false);
      }
    },
    [userId]
  );

  return { markRead, isMarking };
}

export function useCreateNotification() {
  const [isCreating, setIsCreating] = useState(false);
  const create = useCallback(async (arg: Omit<Notification, 'id' | 'createdAt' | 'isRead'> & Partial<Pick<Notification, 'id' | 'createdAt' | 'isRead'>>) => {
    setIsCreating(true);
    try {
      const id = arg.id ?? createClientId();
      await setDoc(notificationDocument(id), {
        id,
        userId: arg.userId,
        type: arg.type,
        title: arg.title,
        body: arg.body,
        data: arg.data ?? null,
        isRead: arg.isRead ?? false,
        createdAt: arg.createdAt ?? nowIso(),
      } satisfies Notification);
      return { id };
    } finally {
      setIsCreating(false);
    }
  }, []);
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
  return { remove, isDeleting };
}
