'use client';

import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  onIdTokenChanged,
  reauthenticateWithCredential,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updatePassword,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getPlannerAuth, getPlannerFirestore } from '@/lib/firebase/client';
import { FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';
import { MemberStatus, UserRole } from '@/lib/roles';
import type { User } from '@/types/api';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
  congregationId?: string | null;
  avatarUrl?: string | null;
  isActive?: boolean;
}

interface FirebaseSession {
  user: SessionUser;
}

interface AuthSessionUpdate {
  name?: string;
  congregationId?: string | null;
  avatarUrl?: string | null;
}

interface AuthContextValue {
  data: FirebaseSession | null;
  status: AuthStatus;
  update: (data?: AuthSessionUpdate) => Promise<FirebaseSession | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function usersCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.users);
}

function userDocument(userId: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.users, userId);
}

function normalizeEmail(email: string | null | undefined) {
  return (email ?? '').trim().toLowerCase();
}

function sessionUserFromData(id: string, data: Partial<User>): SessionUser {
  return {
    id,
    name: data.name ?? null,
    email: data.email ?? null,
    role: (data.role as UserRole | undefined) ?? UserRole.USER,
    congregationId: data.congregationId ?? null,
    avatarUrl: data.avatarUrl ?? null,
    isActive: data.isActive ?? true,
  };
}

function fallbackUser(firebaseUser: FirebaseUser): SessionUser {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName ?? firebaseUser.email ?? 'Member',
    email: firebaseUser.email ?? null,
    role: UserRole.USER,
    congregationId: null,
    avatarUrl: firebaseUser.photoURL ?? null,
    isActive: true,
  };
}

async function activeMembershipCongregationId(userId: string) {
  const snapshot = await getDocs(
    query(
      collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.congregationMembers),
      where('userId', '==', userId),
      where('status', '==', MemberStatus.ACTIVE),
      limit(1)
    )
  );
  return (snapshot.docs[0]?.data().congregationId as string | null | undefined) ?? null;
}

async function findExistingUserByEmail(email: string) {
  if (!email) return null;
  const snapshot = await getDocs(query(usersCollection(), where('email', '==', email), limit(1)));
  const existing = snapshot.docs[0];
  return existing
    ? ({ id: existing.id, ...existing.data() } as User & { password?: string })
    : null;
}

async function ensureUserDocument(firebaseUser: FirebaseUser, preferredName?: string) {
  const now = nowIso();
  const email = normalizeEmail(firebaseUser.email);
  const ref = userDocument(firebaseUser.uid);
  const snapshot = await getDoc(ref);
  const existing = snapshot.exists()
    ? ({ id: snapshot.id, ...snapshot.data() } as User & { password?: string })
    : await findExistingUserByEmail(email);
  const membershipCongregationId = await activeMembershipCongregationId(firebaseUser.uid).catch(
    () => null
  );
  const { password: _password, id: _id, ...existingData } = existing ?? {};
  const name = preferredName?.trim() || firebaseUser.displayName || existing?.name || email;

  await setDoc(
    ref,
    {
      ...existingData,
      id: firebaseUser.uid,
      name,
      email,
      role: existing?.role ?? UserRole.USER,
      isActive: existing?.isActive ?? true,
      avatarUrl: firebaseUser.photoURL ?? existing?.avatarUrl ?? null,
      congregationId: existing?.congregationId ?? membershipCongregationId ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      lastLoginAt: now,
    } satisfies User & { lastLoginAt: string },
    { merge: true }
  );
}

function firebaseErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password. Please check and try again.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled.';
    case 'auth/requires-recent-login':
      return 'Please sign in again before changing your password.';
    case 'auth/weak-password':
      return 'Password must be at least 8 characters.';
    default:
      return error instanceof Error ? error.message : 'Authentication failed. Please try again.';
  }
}

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<FirebaseSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    const auth = getPlannerAuth();
    void setPersistence(auth, browserLocalPersistence).catch(() => undefined);

    let unsubscribeProfile: (() => void) | null = null;
    const unsubscribeAuth = onIdTokenChanged(auth, async (firebaseUser) => {
      unsubscribeProfile?.();
      unsubscribeProfile = null;

      if (!firebaseUser) {
        setSession(null);
        setStatus('unauthenticated');
        return;
      }

      setStatus('loading');
      setSession({ user: fallbackUser(firebaseUser) });

      try {
        await ensureUserDocument(firebaseUser);
        unsubscribeProfile = onSnapshot(
          userDocument(firebaseUser.uid),
          { includeMetadataChanges: true },
          (snapshot) => {
            const user = snapshot.exists()
              ? sessionUserFromData(snapshot.id, snapshot.data() as Partial<User>)
              : fallbackUser(firebaseUser);
            setSession({ user });
            setStatus(user.isActive === false ? 'unauthenticated' : 'authenticated');
          },
          () => {
            setSession({ user: fallbackUser(firebaseUser) });
            setStatus('authenticated');
          }
        );
      } catch {
        setSession({ user: fallbackUser(firebaseUser) });
        setStatus('authenticated');
      }
    });

    return () => {
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, []);

  const update = useCallback(async (data?: AuthSessionUpdate) => {
    const firebaseUser = getPlannerAuth().currentUser;
    if (!firebaseUser) return null;
    if (!data) return { user: fallbackUser(firebaseUser) };

    const updates: Partial<User> = { updatedAt: nowIso() };
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.congregationId !== undefined) updates.congregationId = data.congregationId;
    if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;
    await setDoc(userDocument(firebaseUser.uid), updates, { merge: true });

    if (data.name !== undefined || data.avatarUrl !== undefined) {
      await updateProfile(firebaseUser, {
        displayName: data.name ?? firebaseUser.displayName,
        photoURL: data.avatarUrl ?? firebaseUser.photoURL,
      }).catch(() => undefined);
    }

    const snapshot = await getDoc(userDocument(firebaseUser.uid));
    const user = snapshot.exists()
      ? sessionUserFromData(snapshot.id, snapshot.data() as Partial<User>)
      : fallbackUser(firebaseUser);
    return { user };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ data: session, status, update }),
    [session, status, update]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthSession() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuthSession must be used inside FirebaseAuthProvider');
  return value;
}

export async function signInWithEmail(email: string, password: string) {
  try {
    const auth = getPlannerAuth();
    await setPersistence(auth, browserLocalPersistence);
    const credential = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
    await ensureUserDocument(credential.user);
    return credential.user;
  } catch (error) {
    throw new Error(firebaseErrorMessage(error));
  }
}

export async function registerWithEmail(input: { email: string; password: string; name: string }) {
  try {
    const auth = getPlannerAuth();
    await setPersistence(auth, browserLocalPersistence);
    const credential = await createUserWithEmailAndPassword(
      auth,
      normalizeEmail(input.email),
      input.password
    );
    await updateProfile(credential.user, { displayName: input.name });
    await ensureUserDocument(credential.user, input.name);
    return credential.user;
  } catch (error) {
    throw new Error(firebaseErrorMessage(error));
  }
}

export async function signInWithGoogle() {
  try {
    const auth = getPlannerAuth();
    await setPersistence(auth, browserLocalPersistence);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await signInWithPopup(auth, provider);
    await ensureUserDocument(credential.user);
    return credential.user;
  } catch (error) {
    throw new Error(firebaseErrorMessage(error));
  }
}

export async function signOut() {
  await firebaseSignOut(getPlannerAuth());
}

export async function updateUserProfile(input: { name?: string; avatarUrl?: string | null }) {
  const firebaseUser = getPlannerAuth().currentUser;
  if (!firebaseUser) throw new Error('You must be signed in.');

  const updates: Partial<User> = { updatedAt: nowIso() };
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.avatarUrl !== undefined) updates.avatarUrl = input.avatarUrl;

  await updateDoc(userDocument(firebaseUser.uid), updates);
  await updateProfile(firebaseUser, {
    displayName: input.name ?? firebaseUser.displayName,
    photoURL: input.avatarUrl ?? firebaseUser.photoURL,
  }).catch(() => undefined);
}

export async function changeUserPassword(input: { currentPassword: string; newPassword: string }) {
  const firebaseUser = getPlannerAuth().currentUser;
  if (!firebaseUser?.email) throw new Error('You must be signed in with an email account.');
  const hasPasswordProvider = firebaseUser.providerData.some(
    (provider) => provider.providerId === 'password'
  );
  if (!hasPasswordProvider) {
    throw new Error('Password changes are only available for email/password accounts.');
  }

  try {
    const credential = EmailAuthProvider.credential(firebaseUser.email, input.currentPassword);
    await reauthenticateWithCredential(firebaseUser, credential);
    await updatePassword(firebaseUser, input.newPassword);
    await updateDoc(userDocument(firebaseUser.uid), { updatedAt: nowIso() });
  } catch (error) {
    throw new Error(firebaseErrorMessage(error));
  }
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
