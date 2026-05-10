import { getPlannerFirestore } from '@/lib/firebase/client';

export const LOCAL_FIRST_DB_NAME = 'firebase-firestore';

export function getLocalFirstDB() {
  return getPlannerFirestore();
}
