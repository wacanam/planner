// src/lib/__tests__/territories-duplicate.test.ts
import { describe, expect, it, vi } from 'vitest';
import { getDocs } from 'firebase/firestore';
import {
  checkTerritoryDuplicateInFirestore,
  findDuplicateTerritory,
  getNextCongregationTerritoryNumber,
  normalizeTerritoryNumber,
  toCanonicalTerritoryNumber,
} from '@/lib/territories';
import { createTerritorySchema, updateTerritorySchema } from '@/schemas/territory';

vi.mock('firebase/firestore', () => ({
  getDocs: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
}));

describe('Territory Duplicate Prevention & Validation Utilities', () => {
  describe('normalizeTerritoryNumber', () => {
    it('trims leading and trailing whitespace', () => {
      expect(normalizeTerritoryNumber('  101  ')).toBe('101');
      expect(normalizeTerritoryNumber('  12-A  ')).toBe('12-A');
    });

    it('collapses multiple consecutive internal whitespace characters into single space', () => {
      expect(normalizeTerritoryNumber('Area   12   North')).toBe('Area 12 North');
    });

    it('handles empty or blank string gracefully', () => {
      expect(normalizeTerritoryNumber('')).toBe('');
      expect(normalizeTerritoryNumber('   ')).toBe('');
    });
  });

  describe('toCanonicalTerritoryNumber', () => {
    it('converts normalized territory number to lower case', () => {
      expect(toCanonicalTerritoryNumber('  12-A ')).toBe('12-a');
      expect(toCanonicalTerritoryNumber('  NORTH-01 ')).toBe('north-01');
    });
  });

  describe('getNextCongregationTerritoryNumber', () => {
    it('returns "1" for empty list', () => {
      expect(getNextCongregationTerritoryNumber([])).toBe('1');
    });

    it('increments highest integer in list', () => {
      const list = [
        { id: '1', number: '1' },
        { id: '2', number: '2' },
        { id: '3', number: '10' },
      ];
      expect(getNextCongregationTerritoryNumber(list)).toBe('11');
    });

    it('handles prefixes or alphanumeric numbers', () => {
      const list = [
        { id: '1', number: '#101' },
        { id: '2', number: '102-A' },
      ];
      expect(getNextCongregationTerritoryNumber(list)).toBe('103');
    });
  });

  describe('findDuplicateTerritory', () => {
    const existingList = [
      { id: 't-1', number: '101', name: 'Downtown Central', congregationId: 'cong-1' },
      { id: 't-2', number: '12-A', name: 'West Hills A', congregationId: 'cong-1' },
      { id: 't-3', number: 'Area 5', name: 'Commercial Strip', congregationId: 'cong-1' },
      { id: 't-4', number: null, name: 'Unnumbered Area', congregationId: 'cong-1' },
    ];

    it('detects duplicate with exact identical number', () => {
      const duplicate = findDuplicateTerritory('101', existingList);
      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).toBe('t-1');
    });

    it('detects duplicate case-insensitively', () => {
      const duplicate = findDuplicateTerritory('12-a', existingList);
      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).toBe('t-2');

      const upperDuplicate = findDuplicateTerritory('12-A', existingList);
      expect(upperDuplicate?.id).toBe('t-2');
    });

    it('detects duplicate with irregular whitespace and spacing', () => {
      const duplicate = findDuplicateTerritory('  101  ', existingList);
      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).toBe('t-1');

      const spaceDuplicate = findDuplicateTerritory('  Area    5  ', existingList);
      expect(spaceDuplicate?.id).toBe('t-3');
    });

    it('excludes specified ID when checking duplicates during edit/update', () => {
      const duplicateSelf = findDuplicateTerritory('101', existingList, 't-1');
      expect(duplicateSelf).toBeNull();

      const duplicateOther = findDuplicateTerritory('12-A', existingList, 't-1');
      expect(duplicateOther?.id).toBe('t-2');
    });

    it('returns null for unique territory numbers', () => {
      const unique = findDuplicateTerritory('102', existingList);
      expect(unique).toBeNull();

      const uniqueAlpha = findDuplicateTerritory('12-B', existingList);
      expect(uniqueAlpha).toBeNull();
    });

    it('handles empty or blank number without false positive match', () => {
      expect(findDuplicateTerritory('', existingList)).toBeNull();
      expect(findDuplicateTerritory('   ', existingList)).toBeNull();
    });
  });

  describe('checkTerritoryDuplicateInFirestore', () => {
    it('returns isDuplicate: true when matching territory number exists in congregation', async () => {
      const fakeDocs = [
        {
          id: 'doc-1',
          data: () => ({ number: '101', name: 'Territory 101', congregationId: 'cong-123' }),
        },
        {
          id: 'doc-2',
          data: () => ({ number: '102-A', name: 'Territory 102A', congregationId: 'cong-123' }),
        },
      ];

      (getDocs as any).mockResolvedValueOnce({
        docs: fakeDocs,
      } as any);

      const fakeFirestore = {} as any;
      const result = await checkTerritoryDuplicateInFirestore(fakeFirestore, 'cong-123', ' 102-a ');

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicate?.id).toBe('doc-2');
      expect(result.duplicate?.number).toBe('102-A');
    });

    it('ignores the specified excludeId during update checks', async () => {
      const fakeDocs = [
        {
          id: 'doc-1',
          data: () => ({ number: '101', name: 'Territory 101', congregationId: 'cong-123' }),
        },
      ];

      (getDocs as any).mockResolvedValueOnce({
        docs: fakeDocs,
      } as any);

      const fakeFirestore = {} as any;
      const result = await checkTerritoryDuplicateInFirestore(
        fakeFirestore,
        'cong-123',
        '101',
        'doc-1'
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicate).toBeNull();
    });

    it('returns isDuplicate: false for unique territory number', async () => {
      const fakeDocs = [
        {
          id: 'doc-1',
          data: () => ({ number: '101', name: 'Territory 101', congregationId: 'cong-123' }),
        },
      ];

      (getDocs as any).mockResolvedValueOnce({
        docs: fakeDocs,
      } as any);

      const fakeFirestore = {} as any;
      const result = await checkTerritoryDuplicateInFirestore(fakeFirestore, 'cong-123', '999');

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicate).toBeNull();
    });

    it('returns isDuplicate: false when congregationId or number is empty', async () => {
      const fakeFirestore = {} as any;
      const resultNoCong = await checkTerritoryDuplicateInFirestore(fakeFirestore, '', '101');
      expect(resultNoCong.isDuplicate).toBe(false);

      const resultNoNum = await checkTerritoryDuplicateInFirestore(fakeFirestore, 'cong-123', '  ');
      expect(resultNoNum.isDuplicate).toBe(false);
    });
  });

  describe('createTerritorySchema & updateTerritorySchema', () => {
    it('trims number and name in createTerritorySchema', () => {
      const result = createTerritorySchema.safeParse({
        number: '  105-B  ',
        name: '  Uptown Commercial  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.number).toBe('105-B');
        expect(result.data.name).toBe('Uptown Commercial');
      }
    });

    it('rejects whitespace-only number or name in createTerritorySchema', () => {
      const invalidNumber = createTerritorySchema.safeParse({
        number: '   ',
        name: 'Valid Name',
      });
      expect(invalidNumber.success).toBe(false);

      const invalidName = createTerritorySchema.safeParse({
        number: '101',
        name: '   ',
      });
      expect(invalidName.success).toBe(false);
    });

    it('trims number and name in updateTerritorySchema', () => {
      const result = updateTerritorySchema.safeParse({
        number: '  202  ',
        name: '  East District  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.number).toBe('202');
        expect(result.data.name).toBe('East District');
      }
    });
  });
});
