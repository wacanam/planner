if (typeof window !== 'undefined') {
  throw new Error(
    'Firebase Admin SDK cannot be imported or executed in client/browser environments.'
  );
}
import { type App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { type Auth, getAuth } from 'firebase-admin/auth';
import { type Firestore, getFirestore } from 'firebase-admin/firestore';
import { getServerEnv } from '@/lib/env';

function formatPrivateKey(key: string): string {
  let cleaned = key.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.replace(/\\n/g, '\n');
}

let adminAppInstance: App | null = null;
let adminAuthInstance: Auth | null = null;
let adminDbInstance: Firestore | null = null;

export function getAdminApp(): App {
  if (adminAppInstance) return adminAppInstance;

  if (getApps().length > 0) {
    adminAppInstance = getApp();
    return adminAppInstance;
  }

  const serverEnv = getServerEnv();
  const projectId =
    serverEnv.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = serverEnv.FIREBASE_ADMIN_CLIENT_EMAIL;
  const rawPrivateKey = serverEnv.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawPrivateKey) {
    throw new Error(
      'Firebase Admin credentials are not configured. Please ensure FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY are set in your server environment variables.'
    );
  }

  adminAppInstance = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: formatPrivateKey(rawPrivateKey),
    }),
  });

  return adminAppInstance;
}

export function getAdminAuth(): Auth {
  if (adminAuthInstance) return adminAuthInstance;
  adminAuthInstance = getAuth(getAdminApp());
  return adminAuthInstance;
}

export function getAdminDb(): Firestore {
  if (adminDbInstance) return adminDbInstance;
  adminDbInstance = getFirestore(getAdminApp());
  return adminDbInstance;
}
