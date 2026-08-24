// mobile/src/lib/territories.ts
import { collection, type Firestore, getDocs, query, where } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase';
import type { Territory } from '@/types/api';

/**
 * Normalizes territory number by trimming leading/trailing whitespace
 * and collapsing multiple consecutive whitespace characters into a single space.
 */
export function normalizeTerritoryNumber(number: string): string {
  if (!number) return '';
  return number.trim().replace(/\s+/g, ' ');
}

/**
 * Converts a territory number into canonical format (lowercase, trimmed, normalized spaces)
 * for case-insensitive duplicate comparison.
 */
export function toCanonicalTerritoryNumber(number: string): string {
  return normalizeTerritoryNumber(number).toLowerCase();
}

export interface TerritoryNumberLike {
  id?: string;
  number?: string | null;
  name?: string | null;
  congregationId?: string | null;
}

/**
 * Checks if a territory with the same canonical number already exists in a given list.
 * Returns the matching duplicate item if found, otherwise null.
 */
export function findDuplicateTerritory<T extends TerritoryNumberLike>(
  number: string,
  existingList: T[],
  excludeId?: string
): T | null {
  const canonical = toCanonicalTerritoryNumber(number);
  if (!canonical) return null;

  for (const item of existingList) {
    if (excludeId && item.id === excludeId) continue;
    const itemCanonical = toCanonicalTerritoryNumber(item.number || '');
    if (itemCanonical === canonical) {
      return item;
    }
  }

  return null;
}

/**
 * Queries Firestore territories collection to check for duplicates by number within a congregation.
 */
export async function checkTerritoryDuplicateInFirestore(
  firestore: Firestore,
  congregationId: string,
  number: string,
  excludeId?: string
): Promise<{ isDuplicate: boolean; duplicate: Territory | null }> {
  const canonical = toCanonicalTerritoryNumber(number);
  if (!canonical || !congregationId) {
    return { isDuplicate: false, duplicate: null };
  }

  const snap = await getDocs(
    query(
      collection(firestore, FIRESTORE_COLLECTIONS.territories),
      where('congregationId', '==', congregationId)
    )
  );

  for (const docSnap of snap.docs) {
    if (excludeId && docSnap.id === excludeId) continue;
    const data = docSnap.data() as Partial<Territory>;
    const itemCanonical = toCanonicalTerritoryNumber(data.number || '');

    if (itemCanonical === canonical) {
      return {
        isDuplicate: true,
        duplicate: { id: docSnap.id, ...data } as Territory,
      };
    }
  }

  return { isDuplicate: false, duplicate: null };
}
