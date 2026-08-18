import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  type Auth,
  getAuth,
  initializeAuth,
  // @ts-ignore - Exported by firebase/auth react-native build
  getReactNativePersistence,
} from 'firebase/auth';
import {
  type Firestore,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

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
} as const;

export function createClientId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

// Mobile Firebase Configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDemoDummyApiKeyForPlannerApp123',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'kanataran-planner.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'kanataran-planner',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'kanataran-planner.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:123456789012:web:abcdef123456',
};

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (appInstance) return appInstance;
  appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return appInstance;
}

export function getPlannerAuth(): Auth {
  if (authInstance) return authInstance;
  const app = getFirebaseApp();
  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    authInstance = getAuth(app);
  }
  return authInstance;
}

export function getPlannerFirestore(): Firestore {
  if (firestoreInstance) return firestoreInstance;
  const app = getFirebaseApp();
  try {
    const localCache =
      Platform.OS === 'web'
        ? persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          })
        : memoryLocalCache();

    firestoreInstance = initializeFirestore(app, {
      localCache,
    });
  } catch {
    firestoreInstance = getFirestore(app);
  }
  return firestoreInstance;
}
