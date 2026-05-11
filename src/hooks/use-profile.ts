import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/schema';
import {
  changeUserPassword,
  fileToDataUrl,
  updateUserProfile,
  useAuthSession,
} from '@/lib/firebase/auth';
import type { User } from '@/types/api';

function userDocument(userId: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.users, userId);
}

function userFromData(id: string, data: Partial<User>): User {
  const now = new Date().toISOString();
  return {
    id,
    name: data.name ?? 'Member',
    email: data.email ?? '',
    role: data.role ?? 'USER',
    congregationId: data.congregationId ?? null,
    isActive: data.isActive ?? true,
    avatarUrl: data.avatarUrl ?? null,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  };
}

export function useProfile() {
  const { data: session, status } = useAuthSession();
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(status === 'loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      setProfile(null);
      setIsLoading(status === 'loading');
      return;
    }

    setIsLoading(true);
    return onSnapshot(
      userDocument(userId),
      { includeMetadataChanges: true },
      (snapshot) => {
        setProfile(snapshot.exists() ? userFromData(snapshot.id, snapshot.data() as Partial<User>) : null);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, [session?.user.id, status]);

  return { profile, isLoading, error };
}

export function useUpdateProfile() {
  const [isUpdating, setIsUpdating] = useState(false);
  const update = useCallback(async (arg: { name: string }) => {
    setIsUpdating(true);
    try {
      await updateUserProfile({ name: arg.name });
    } finally {
      setIsUpdating(false);
    }
  }, []);
  return { update, isUpdating };
}

export function useChangePassword() {
  const [isChanging, setIsChanging] = useState(false);
  const changePassword = useCallback(
    async (arg: { currentPassword: string; newPassword: string }) => {
      setIsChanging(true);
      try {
        await changeUserPassword(arg);
      } finally {
        setIsChanging(false);
      }
    },
    []
  );
  return { changePassword, isChanging };
}

export function useUpdateAvatar() {
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const updateAvatar = useCallback(async (arg: { file: File }) => {
    setIsUpdatingAvatar(true);
    try {
      const avatarUrl = await fileToDataUrl(arg.file);
      await updateUserProfile({ avatarUrl });
      return { avatarUrl };
    } finally {
      setIsUpdatingAvatar(false);
    }
  }, []);
  return { updateAvatar, isUpdatingAvatar };
}
