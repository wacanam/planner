import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  type User as FirebaseUser,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import type React from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { FIRESTORE_COLLECTIONS, getPlannerAuth, getPlannerFirestore, nowIso } from '@/lib/firebase';
import { UserRole } from '@/lib/roles';
import type { User } from '@/types/api';

export interface SessionUser {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  congregationId: string | null;
  congregationRole: string | null;
  groupId: string | null;
  avatarUrl: string | null;
  emailVerified?: boolean;
}

interface AuthContextType {
  user: SessionUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  activeCongregationId: string | null;
  setActiveCongregationId: (id: string | null) => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<boolean>;
}

const ACTIVE_CONGREGATION_KEY = 'planner_active_congregation_id';

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  isAuthenticated: false,
  activeCongregationId: null,
  setActiveCongregationId: async () => {},
  login: async () => {},
  register: async () => {},
  resetPassword: async () => {},
  logout: async () => {},
  sendVerificationEmail: async () => {},
  reloadUser: async () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [membershipRole, setMembershipRole] = useState<string | null>(null);
  const [membershipCongregationId, setMembershipCongregationId] = useState<string | null>(null);
  const [membershipGroupId, setMembershipGroupId] = useState<string | null>(null);
  const [activeCongId, setActiveCongId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize stored active congregation
  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_CONGREGATION_KEY).then((stored) => {
      if (stored) setActiveCongId(stored);
    });
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const auth = getPlannerAuth();
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setFirebaseUser(authUser);
      if (!authUser) {
        setUserProfile(null);
        setMembershipRole(null);
        setMembershipCongregationId(null);
        setMembershipGroupId(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Listen to User Profile & Congregation Membership in Firestore
  useEffect(() => {
    if (!firebaseUser?.uid) return;

    const firestore = getPlannerFirestore();
    const uid = firebaseUser.uid;

    // Listen to user document
    const userDocRef = doc(firestore, FIRESTORE_COLLECTIONS.users, uid);
    const unsubUser = onSnapshot(
      userDocRef,
      (snap) => {
        if (snap.exists()) {
          setUserProfile(snap.data() as User);
        } else {
          // If no doc exists yet, seed basic record
          const newUser: User = {
            id: uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Publisher',
            email: firebaseUser.email || '',
            role: UserRole.USER,
            congregationId: null,
            groupId: null,
            isActive: true,
            createdAt: nowIso(),
            updatedAt: nowIso(),
          };
          setDoc(userDocRef, newUser).catch(() => {});
          setUserProfile(newUser);
        }
      },
      () => {}
    );

    // Listen to active congregation member record
    const memberQuery = query(
      collection(firestore, FIRESTORE_COLLECTIONS.congregationMembers),
      where('userId', '==', uid),
      where('status', 'in', ['active', 'approved'])
    );
    const unsubMember = onSnapshot(
      memberQuery,
      (snap) => {
        if (!snap.empty) {
          const mData = snap.docs[0].data();
          setMembershipRole(mData.congregationRole ? String(mData.congregationRole) : null);
          setMembershipCongregationId(mData.congregationId ? String(mData.congregationId) : null);
          setMembershipGroupId(mData.groupId ? String(mData.groupId) : null);
        } else {
          setMembershipRole(null);
          setMembershipCongregationId(null);
          setMembershipGroupId(null);
        }
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => {
      unsubUser();
      unsubMember();
    };
  }, [firebaseUser?.uid]);

  const effectiveRole = useMemo((): UserRole => {
    const rawRole = (userProfile?.role || '').toUpperCase();
    if (rawRole === 'SUPER_ADMIN' || rawRole === 'ADMIN') {
      return (userProfile?.role as UserRole) || UserRole.ADMIN;
    }
    if (membershipRole) {
      const normalized = membershipRole.toUpperCase().replace(/\s+/g, '_');
      if (normalized === 'SERVICE_OVERSEER') return UserRole.SERVICE_OVERSEER;
      if (normalized === 'TERRITORY_SERVANT') return UserRole.TERRITORY_SERVANT;
      if (normalized === 'PUBLISHER' || normalized === 'USER') return UserRole.PUBLISHER;
    }
    if (rawRole === 'SERVICE_OVERSEER') return UserRole.SERVICE_OVERSEER;
    if (rawRole === 'TERRITORY_SERVANT') return UserRole.TERRITORY_SERVANT;
    return UserRole.PUBLISHER;
  }, [userProfile?.role, membershipRole]);

  const isGlobalAdmin = effectiveRole === UserRole.SUPER_ADMIN || effectiveRole === UserRole.ADMIN;

  const congregationId = isGlobalAdmin
    ? activeCongId || userProfile?.congregationId || membershipCongregationId || null
    : membershipCongregationId || null;
  const groupId = membershipCongregationId
    ? userProfile?.groupId || membershipGroupId || null
    : null;

  const sessionUser: SessionUser | null = useMemo(() => {
    if (!firebaseUser) return null;
    return {
      id: firebaseUser.uid,
      name:
        userProfile?.name ||
        firebaseUser.displayName ||
        firebaseUser.email?.split('@')[0] ||
        'User',
      email: firebaseUser.email || userProfile?.email || null,
      role: effectiveRole,
      congregationId,
      congregationRole: membershipRole,
      groupId,
      avatarUrl: userProfile?.avatarUrl || null,
      emailVerified: Boolean(firebaseUser.emailVerified),
    };
  }, [
    firebaseUser,
    userProfile?.name,
    userProfile?.email,
    userProfile?.avatarUrl,
    effectiveRole,
    congregationId,
    membershipRole,
    groupId,
  ]);

  const setActiveCongregationId = async (id: string | null) => {
    setActiveCongId(id);
    if (id) {
      await AsyncStorage.setItem(ACTIVE_CONGREGATION_KEY, id);
    } else {
      await AsyncStorage.removeItem(ACTIVE_CONGREGATION_KEY);
    }
  };

  const login = async (email: string, pass: string) => {
    const auth = getPlannerAuth();
    await signInWithEmailAndPassword(auth, email.trim(), pass);
  };

  const register = async (name: string, email: string, pass: string) => {
    const auth = getPlannerAuth();
    const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const firestore = getPlannerFirestore();
    const newUser: User = {
      id: res.user.uid,
      name: name.trim(),
      email: email.trim(),
      role: UserRole.USER,
      congregationId: null,
      groupId: null,
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await setDoc(doc(firestore, FIRESTORE_COLLECTIONS.users, res.user.uid), newUser);

    try {
      await sendEmailVerification(res.user);
    } catch (e) {
      console.warn('[sendEmailVerification on mobile register error]', e);
    }
  };

  const resetPassword = async (email: string) => {
    const auth = getPlannerAuth();
    await sendPasswordResetEmail(auth, email.trim());
  };

  const sendVerificationEmail = async () => {
    const auth = getPlannerAuth();
    if (!auth.currentUser) throw new Error('No user is currently signed in.');
    await sendEmailVerification(auth.currentUser);
  };

  const reloadUser = async (): Promise<boolean> => {
    const auth = getPlannerAuth();
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    const refreshed = auth.currentUser;
    setFirebaseUser(refreshed);
    return Boolean(refreshed?.emailVerified);
  };

  const logout = async () => {
    const auth = getPlannerAuth();
    await signOut(auth);
    await AsyncStorage.removeItem(ACTIVE_CONGREGATION_KEY);
    await AsyncStorage.removeItem('kanataran_active_congregation');
    setActiveCongId(null);
    setUserProfile(null);
    setMembershipRole(null);
    setMembershipCongregationId(null);
    setMembershipGroupId(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user: sessionUser,
        firebaseUser,
        loading,
        isAuthenticated: Boolean(firebaseUser),
        activeCongregationId: congregationId,
        setActiveCongregationId,
        login,
        register,
        resetPassword,
        logout,
        sendVerificationEmail,
        reloadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
