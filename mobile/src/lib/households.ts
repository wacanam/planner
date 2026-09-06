// mobile/src/lib/households.ts
import { collection, type Firestore, getDocs, query, where } from 'firebase/firestore';
import type { Household } from '@/types/api';
import { FIRESTORE_COLLECTIONS } from './schema';

/**
 * Normalizes a house number by trimming leading/trailing whitespace
 * and collapsing multiple consecutive whitespace characters into a single space.
 */
export function normalizeHouseNumber(number: string): string {
  if (!number) return '';
  return number.trim().replace(/\s+/g, ' ');
}

/**
 * Converts a house number into canonical format (lowercase, trimmed, normalized spaces,
 * stripped of leading '#' symbols) for case- and format-insensitive duplicate comparison.
 */
export function toCanonicalHouseNumber(number: string): string {
  const normalized = normalizeHouseNumber(number);
  if (!normalized) return '';
  return normalized.replace(/^#\s*/, '').toLowerCase();
}

/**
 * Set of canonical house numbers that are exempt from uniqueness constraints.
 * For example, "JW" (Jehovah's Witness household) can be used across multiple homes.
 */
export const ALLOWED_DUPLICATE_HOUSE_NUMBERS = new Set(['jw']);

export function isDuplicateAllowedHouseNumber(number: string): boolean {
  const canonical = toCanonicalHouseNumber(number);
  return ALLOWED_DUPLICATE_HOUSE_NUMBERS.has(canonical);
}

export interface HouseholdNumberLike {
  id?: string;
  serverId?: string | null;
  houseNumber?: string | null;
  congregationId?: string | null;
}

/**
 * Checks if a household with the same canonical house number already exists in a given list.
 * Returns the matching duplicate item if found, otherwise null.
 */
export function findDuplicateHouseholdByNumber<T extends HouseholdNumberLike>(
  number: string,
  existingList: T[],
  excludeId?: string | string[] | null
): T | null {
  const canonical = toCanonicalHouseNumber(number);
  if (!canonical || isDuplicateAllowedHouseNumber(number)) return null;

  const excludeSet = new Set(
    Array.isArray(excludeId)
      ? (excludeId.filter(Boolean) as string[])
      : excludeId
        ? [excludeId]
        : []
  );

  for (const item of existingList) {
    if (item.id && excludeSet.has(item.id)) continue;
    if (item.serverId && excludeSet.has(item.serverId)) continue;
    const itemCanonical = toCanonicalHouseNumber(item.houseNumber || '');
    if (itemCanonical === canonical) {
      return item;
    }
  }

  return null;
}

/**
 * Calculates the next unique auto-incrementing house number for a congregation.
 * Finds the highest positive integer among existing house numbers, increments by 1,
 * and ensures the candidate does not collide with any existing custom house numbers.
 */
export function getNextCongregationHouseNumber<T extends HouseholdNumberLike>(
  existingList: T[]
): string {
  let maxInt = 0;

  for (const item of existingList) {
    const raw = normalizeHouseNumber(item.houseNumber || '');
    if (!raw) continue;

    // Match leading integer portion (e.g., "1", "104", "#42", "12-A" -> 12)
    const match = raw.replace(/^#\s*/, '').match(/^(\d+)/);
    if (match) {
      const val = parseInt(match[1], 10);
      if (!Number.isNaN(val) && val > maxInt) {
        maxInt = val;
      }
    }
  }

  let candidate = maxInt + 1;
  while (findDuplicateHouseholdByNumber(String(candidate), existingList)) {
    candidate++;
  }

  return String(candidate);
}

/**
 * Queries Firestore households collection to check for duplicates by house number within a congregation.
 */
export async function checkHouseholdNumberDuplicateInFirestore(
  firestore: Firestore,
  congregationId: string,
  houseNumber: string,
  excludeId?: string
): Promise<{ isDuplicate: boolean; duplicate: Household | null }> {
  const canonical = toCanonicalHouseNumber(houseNumber);
  if (!canonical || !congregationId || isDuplicateAllowedHouseNumber(houseNumber)) {
    return { isDuplicate: false, duplicate: null };
  }

  const snap = await getDocs(
    query(
      collection(firestore, FIRESTORE_COLLECTIONS.households),
      where('congregationId', '==', congregationId)
    )
  );

  for (const docSnap of snap.docs) {
    if (excludeId && docSnap.id === excludeId) continue;
    const data = docSnap.data() as Partial<Household>;
    const itemCanonical = toCanonicalHouseNumber(data.houseNumber || '');

    if (itemCanonical === canonical) {
      return {
        isDuplicate: true,
        duplicate: { id: docSnap.id, ...data } as Household,
      };
    }
  }

  return { isDuplicate: false, duplicate: null };
}

/**
 * Formats a concise map label for a pinned household on the map.
 * Strictly displays only the house number (e.g. "#104" or "#12B").
 * Returns an empty string if house number is not set, never displaying street, resident name, or address.
 */
export function getHouseholdMapLabel(
  h?: {
    houseNumber?: string | null;
    name?: string | null;
    streetName?: string | null;
    address?: string | null;
    householdAddress?: string | null;
  } | null
): string {
  if (!h) return '';

  const rawNum = (h.houseNumber || '').trim();
  const cleanNum = rawNum.replace(/^#\s*/, '').trim();
  if (cleanNum) {
    return `#${cleanNum}`;
  }

  return '';
}
