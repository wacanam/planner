import { describe, expect, it } from 'vitest';
import {
  findDuplicateCongregation,
  findSimilarCongregations,
  normalizeCongregationName,
  slugifyCongregation,
  toCanonicalName,
} from '@/lib/congregations';
import { createCongregationSchema } from '@/schemas/congregation';

describe('Congregation Duplicate Prevention & Validation Utilities', () => {
  describe('normalizeCongregationName', () => {
    it('trims leading and trailing whitespace', () => {
      expect(normalizeCongregationName('  South Manila  ')).toBe('South Manila');
    });

    it('collapses multiple consecutive internal whitespace characters into single space', () => {
      expect(normalizeCongregationName('Central    English   Congregation')).toBe(
        'Central English Congregation'
      );
    });

    it('handles empty or blank string gracefully', () => {
      expect(normalizeCongregationName('')).toBe('');
      expect(normalizeCongregationName('   ')).toBe('');
    });
  });

  describe('toCanonicalName', () => {
    it('converts normalized name to lower case', () => {
      expect(toCanonicalName('  QUEZON   CITY   NORTH ')).toBe('quezon city north');
    });
  });

  describe('slugifyCongregation', () => {
    it('generates clean, hyphenated lowercase slug', () => {
      expect(slugifyCongregation('Manila Central English')).toBe('manila-central-english');
    });

    it('strips non-alphanumeric characters and removes leading/trailing hyphens', () => {
      expect(slugifyCongregation('--- South-Side & North #1! ---')).toBe('south-side-north-1');
    });
  });

  describe('findDuplicateCongregation', () => {
    const existingList = [
      {
        id: 'cong-1',
        name: 'Manila Central English',
        slug: 'manila-central-english',
        city: 'Manila',
        country: 'Philippines',
      },
      {
        id: 'cong-2',
        name: 'Quezon City North',
        slug: 'quezon-city-north',
        city: 'Quezon City',
        country: 'Philippines',
      },
      {
        id: 'cong-3',
        name: 'Tokyo International',
        slug: 'tokyo-international',
        city: 'Tokyo',
        country: 'Japan',
      },
      {
        id: 'cong-4',
        name: 'Old Archived Congregation',
        slug: 'old-archived',
        status: 'archived',
      },
    ];

    it('detects duplicate with exact identical characters', () => {
      const duplicate = findDuplicateCongregation('Manila Central English', existingList);
      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).toBe('cong-1');
    });

    it('detects duplicate case-insensitively', () => {
      const duplicate = findDuplicateCongregation('manila central english', existingList);
      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).toBe('cong-1');

      const upperDuplicate = findDuplicateCongregation('QUEZON CITY NORTH', existingList);
      expect(upperDuplicate?.id).toBe('cong-2');
    });

    it('detects duplicate with irregular whitespace and spacing', () => {
      const duplicate = findDuplicateCongregation('  Manila   Central    English  ', existingList);
      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).toBe('cong-1');
    });

    it('detects duplicate by slug collision', () => {
      const duplicate = findDuplicateCongregation('Tokyo-International', existingList);
      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).toBe('cong-3');
    });

    it('ignores archived congregations when detecting duplicates', () => {
      const duplicate = findDuplicateCongregation('Old Archived Congregation', existingList);
      expect(duplicate).toBeNull();
    });

    it('excludes specified ID when checking duplicates during update/edit', () => {
      const duplicateSelf = findDuplicateCongregation(
        'Manila Central English',
        existingList,
        'cong-1'
      );
      expect(duplicateSelf).toBeNull();

      const duplicateOther = findDuplicateCongregation('Quezon City North', existingList, 'cong-1');
      expect(duplicateOther?.id).toBe('cong-2');
    });

    it('returns null for unique congregation names', () => {
      const unique = findDuplicateCongregation('Makati East Congregation', existingList);
      expect(unique).toBeNull();
    });
  });

  describe('findSimilarCongregations', () => {
    const existingList = [
      {
        id: 'cong-1',
        name: 'Manila Central English',
        slug: 'manila-central-english',
        city: 'Manila',
        country: 'Philippines',
      },
      {
        id: 'cong-2',
        name: 'Manila South Tagalog',
        slug: 'manila-south-tagalog',
        city: 'Manila',
        country: 'Philippines',
      },
      {
        id: 'cong-3',
        name: 'Quezon City North',
        slug: 'quezon-city-north',
        city: 'Quezon City',
        country: 'Philippines',
      },
    ];

    it('finds similar congregations sharing significant keywords', () => {
      const similar = findSimilarCongregations('Manila West', existingList);
      expect(similar.length).toBeGreaterThanOrEqual(1);
      expect(similar.some((c) => c.id === 'cong-1')).toBe(true);
      expect(similar.some((c) => c.id === 'cong-2')).toBe(true);
    });

    it('excludes exact duplicates from suggestions when excludeDuplicate is true', () => {
      const similar = findSimilarCongregations('Manila Central English', existingList, {
        excludeDuplicate: true,
      });
      // Should not contain cong-1 which is the exact match
      expect(similar.some((c) => c.id === 'cong-1')).toBe(false);
      // May contain cong-2 which shares Manila
      expect(similar.some((c) => c.id === 'cong-2')).toBe(true);
    });

    it('returns empty array when input length is too short', () => {
      expect(findSimilarCongregations('Ma', existingList)).toEqual([]);
    });
  });

  describe('createCongregationSchema', () => {
    it('validates and transforms valid congregation name by normalizing spaces', () => {
      const result = createCongregationSchema.safeParse({
        name: '  Cebu   East   ',
        city: 'Cebu City',
        country: 'Philippines',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Cebu East');
      }
    });

    it('rejects empty or whitespace-only name', () => {
      const result = createCongregationSchema.safeParse({
        name: '    ',
      });
      expect(result.success).toBe(false);
    });

    it('rejects name with less than 2 characters', () => {
      const result = createCongregationSchema.safeParse({
        name: 'A',
      });
      expect(result.success).toBe(false);
    });
  });
});
