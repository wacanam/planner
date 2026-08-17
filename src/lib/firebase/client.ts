import { type FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { type Auth, getAuth } from 'firebase/auth';
import {
  type Firestore,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getPublicEnv } from '@/lib/env';

function firebaseConfig() {
  const env = getPublicEnv();
  return {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;

export function getFirebaseClientApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig());
}

export function getPlannerFirestore(): Firestore {
  if (firestoreInstance) return firestoreInstance;

  const app = getFirebaseClientApp();

  if (typeof window === 'undefined') {
    firestoreInstance = getFirestore(app);
    return firestoreInstance;
  }

  try {
    firestoreInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    firestoreInstance = getFirestore(app);
  }

  return firestoreInstance;
}

export function getPlannerAuth(): Auth {
  if (authInstance) return authInstance;
  authInstance = getAuth(getFirebaseClientApp());
  return authInstance;
}
