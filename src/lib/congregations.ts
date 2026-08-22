// src/lib/congregations.ts
import { collection, type Firestore, getDocs } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/schema';
import type { Congregation } from '@/types/api';

/**
 * Normalizes congregation name by trimming whitespace and collapsing
 * multiple consecutive whitespace characters into a single space.
 */
export function normalizeCongregationName(name: string): string {
  if (!name) return '';
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Converts a congregation name into its canonical format (lowercase, normalized spaces)
 * for case-insensitive duplicate comparisons.
 */
export function toCanonicalName(name: string): string {
  return normalizeCongregationName(name).toLowerCase();
}

/**
 * Generates a clean URL slug from a congregation name.
 * e.g., "Manila Central English" -> "manila-central-english"
 */
export function slugifyCongregation(name: string): string {
  const normalized = normalizeCongregationName(name).toLowerCase();
  return normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export interface CongregationSummaryLike {
  id?: string;
  name: string;
  slug?: string | null;
  city?: string | null;
  country?: string | null;
  status?: string | null;
}

/**
 * Checks if a congregation with the same canonical name or slug already exists in a given list.
 * Returns the matching duplicate item if found, otherwise null.
 */
export function findDuplicateCongregation<T extends CongregationSummaryLike>(
  name: string,
  existingList: T[],
  excludeId?: string
): T | null {
  const canonicalName = toCanonicalName(name);
  const targetSlug = slugifyCongregation(name);

  if (!canonicalName && !targetSlug) return null;

  for (const item of existingList) {
    if (excludeId && item.id === excludeId) continue;
    if (item.status === 'archived') continue;

    const itemCanonical = toCanonicalName(item.name || '');
    const itemSlug = item.slug
      ? item.slug.toLowerCase().trim()
      : slugifyCongregation(item.name || '');

    if (canonicalName && itemCanonical === canonicalName) {
      return item;
    }

    if (targetSlug && itemSlug === targetSlug) {
      return item;
    }
  }

  return null;
}

/**
 * Finds existing congregations that share similar words or substrings with the given name,
 * useful for suggesting existing congregations before a user accidentally creates a duplicate.
 */
export function findSimilarCongregations<T extends CongregationSummaryLike>(
  name: string,
  existingList: T[],
  options?: {
    excludeId?: string;
    excludeDuplicate?: boolean;
    limit?: number;
  }
): T[] {
  const cleanName = normalizeCongregationName(name);
  const canonical = toCanonicalName(name);
  const targetSlug = slugifyCongregation(name);
  const limit = options?.limit ?? 4;

  if (cleanName.length < 3) return [];

  const nameWords = canonical
    .split(' ')
    .filter((w) => w.length >= 3 && !['congregation', 'cong', 'the', 'and', 'city'].includes(w));

  const results: { item: T; score: number }[] = [];

  for (const item of existingList) {
    if (options?.excludeId && item.id === options.excludeId) continue;
    if (item.status === 'archived') continue;

    const itemCanonical = toCanonicalName(item.name || '');
    const itemSlug = item.slug
      ? item.slug.toLowerCase().trim()
      : slugifyCongregation(item.name || '');

    // Skip exact duplicate if excluded
    if (options?.excludeDuplicate !== false) {
      if (itemCanonical === canonical || (targetSlug && itemSlug === targetSlug)) {
        continue;
      }
    }

    let score = 0;

    // Substring match
    if (itemCanonical.includes(canonical) || canonical.includes(itemCanonical)) {
      score += 5;
    }

    // Word token overlap
    const itemWords = itemCanonical.split(' ').filter((w) => w.length >= 3);
    for (const word of nameWords) {
      if (itemWords.some((iw) => iw.includes(word) || word.includes(iw))) {
        score += 2;
      }
    }

    // Slug match
    if (
      targetSlug &&
      itemSlug &&
      (itemSlug.includes(targetSlug) || targetSlug.includes(itemSlug))
    ) {
      score += 3;
    }

    if (score > 0) {
      results.push({ item, score });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.item);
}

/**
 * Queries Firestore congregations collection to check for duplicates by canonical name or slug.
 */
export async function checkCongregationDuplicateInFirestore(
  firestore: Firestore,
  name: string,
  excludeId?: string
): Promise<{ isDuplicate: boolean; duplicate: Congregation | null; reason?: 'name' | 'slug' }> {
  const canonicalName = toCanonicalName(name);
  const targetSlug = slugifyCongregation(name);

  if (!canonicalName) {
    return { isDuplicate: false, duplicate: null };
  }

  const snap = await getDocs(collection(firestore, FIRESTORE_COLLECTIONS.congregations));
  for (const docSnap of snap.docs) {
    if (excludeId && docSnap.id === excludeId) continue;
    const data = docSnap.data() as Partial<Congregation>;
    if (data.status === 'archived') continue;

    const itemCanonical = toCanonicalName(data.name || '');
    const itemSlug = (data.slug || slugifyCongregation(data.name || '')).toLowerCase().trim();

    if (itemCanonical === canonicalName) {
      return {
        isDuplicate: true,
        duplicate: { id: docSnap.id, ...data } as Congregation,
        reason: 'name',
      };
    }

    if (targetSlug && itemSlug === targetSlug) {
      return {
        isDuplicate: true,
        duplicate: { id: docSnap.id, ...data } as Congregation,
        reason: 'slug',
      };
    }
  }

  return { isDuplicate: false, duplicate: null };
}
