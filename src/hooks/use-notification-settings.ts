'use client';

import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthSession as useSession } from '@/lib/firebase/auth';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';
import { playNotificationSound } from '@/lib/sound';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSoundStyle,
  type User,
  type UserNotificationSettings,
} from '@/types/api';

function userDocument(userId: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.users, userId);
}

export function useNotificationSettings() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [rawSettings, setRawSettings] = useState<UserNotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(userId));
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to user document in Firestore to get real-time notificationSettings
  useEffect(() => {
    if (!userId) {
      setRawSettings(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsub = onSnapshot(
      userDocument(userId),
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<User>;
          setRawSettings(data.notificationSettings ?? null);
        } else {
          setRawSettings(null);
        }
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [userId]);

  const settings = useMemo<UserNotificationSettings>(() => {
    return {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...(rawSettings || {}),
    };
  }, [rawSettings]);

  // Update notification settings in Firebase Firestore
  const updateSettings = useCallback(
    async (partialSettings: Partial<UserNotificationSettings>) => {
      if (!userId) return;
      setIsUpdating(true);
      try {
        const nextSettings: UserNotificationSettings = {
          ...settings,
          ...partialSettings,
        };

        // Optimistic UI update
        setRawSettings(nextSettings);

        // Persist directly to Firebase DB
        await updateDoc(userDocument(userId), {
          notificationSettings: nextSettings,
          updatedAt: nowIso(),
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to update notification settings';
        setError(message);
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    [userId, settings]
  );

  const toggleSound = useCallback(async () => {
    const nextEnabled = !settings.soundEnabled;
    await updateSettings({ soundEnabled: nextEnabled });
    if (nextEnabled) {
      playNotificationSound(settings.soundStyle, true);
    }
  }, [settings.soundEnabled, settings.soundStyle, updateSettings]);

  const setSoundStyle = useCallback(
    async (style: NotificationSoundStyle) => {
      await updateSettings({ soundStyle: style });
      playNotificationSound(style, true);
    },
    [updateSettings]
  );

  const setCategoryEnabled = useCallback(
    async (
      category: keyof Omit<UserNotificationSettings, 'soundEnabled' | 'soundStyle'>,
      enabled: boolean
    ) => {
      await updateSettings({ [category]: enabled });
    },
    [updateSettings]
  );

  const playPreview = useCallback(
    (style?: NotificationSoundStyle) => {
      playNotificationSound(style || settings.soundStyle, true);
    },
    [settings.soundStyle]
  );

  return {
    settings,
    soundEnabled: settings.soundEnabled,
    soundStyle: settings.soundStyle,
    isLoading,
    isUpdating,
    error,
    updateSettings,
    toggleSound,
    setSoundStyle,
    setCategoryEnabled,
    playPreview,
  };
}
