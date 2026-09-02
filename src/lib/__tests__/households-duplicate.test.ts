// src/lib/__tests__/households-duplicate.test.ts
import { describe, expect, it, vi } from 'vitest';
import { getDocs } from 'firebase/firestore';
import {
  checkHouseholdNumberDuplicateInFirestore,
  findDuplicateHouseholdByNumber,
  getNextCongregationHouseNumber,
  normalizeHouseNumber,
  toCanonicalHouseNumber,
} from '@/lib/households';

vi.mock('firebase/firestore', () => ({
  getDocs: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
}));

describe('Household Number & Duplicate Prevention Utilities', () => {
  describe('normalizeHouseNumber', () => {
    it('trims leading and trailing whitespace', () => {
      expect(normalizeHouseNumber('  104  ')).toBe('104');
      expect(normalizeHouseNumber('  #12-B  ')).toBe('#12-B');
    });

    it('collapses multiple consecutive internal whitespace characters into single space', () => {
      expect(normalizeHouseNumber('Bldg   4   Apt 2')).toBe('Bldg 4 Apt 2');
    });

    it('handles empty or blank string gracefully', () => {
      expect(normalizeHouseNumber('')).toBe('');
      expect(normalizeHouseNumber('   ')).toBe('');
    });
  });

  describe('toCanonicalHouseNumber', () => {
    it('converts normalized house number to lower case and strips leading hash symbol', () => {
      expect(toCanonicalHouseNumber('  104 ')).toBe('104');
      expect(toCanonicalHouseNumber('  #104 ')).toBe('104');
      expect(toCanonicalHouseNumber('# 104 ')).toBe('104');
      expect(toCanonicalHouseNumber('  12-A ')).toBe('12-a');
      expect(toCanonicalHouseNumber('  #12-B ')).toBe('12-b');
    });
  });

  describe('findDuplicateHouseholdByNumber', () => {
    const existingList = [
      { id: 'h-1', houseNumber: '1', address: '1 Main St', congregationId: 'cong-1' },
      { id: 'h-2', houseNumber: '104', address: '104 Oak Ave', congregationId: 'cong-1' },
      { id: 'h-3', houseNumber: '12-A', address: '12-A Pine Rd', congregationId: 'cong-1' },
      { id: 'h-4', houseNumber: '#42', address: '42 Elm St', congregationId: 'cong-1' },
      { id: 'h-5', houseNumber: null, address: 'Unnumbered House', congregationId: 'cong-1' },
    ];

    it('detects duplicate with exact identical number', () => {
      const duplicate = findDuplicateHouseholdByNumber('104', existingList);
      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).toBe('h-2');
    });

    it('detects duplicate case-insensitively and with/without hash', () => {
      const duplicateAlpha = findDuplicateHouseholdByNumber('12-a', existingList);
      expect(duplicateAlpha?.id).toBe('h-3');

      const duplicateHash = findDuplicateHouseholdByNumber('42', existingList);
      expect(duplicateHash?.id).toBe('h-4');

      const duplicateHashPrefix = findDuplicateHouseholdByNumber('#104', existingList);
      expect(duplicateHashPrefix?.id).toBe('h-2');
    });

    it('detects duplicate with whitespace differences', () => {
      const duplicate = findDuplicateHouseholdByNumber('   # 104   ', existingList);
      expect(duplicate?.id).toBe('h-2');
    });

    it('excludes specified ID when checking duplicates during edit/update', () => {
      const duplicateSelf = findDuplicateHouseholdByNumber('104', existingList, 'h-2');
      expect(duplicateSelf).toBeNull();

      const duplicateOther = findDuplicateHouseholdByNumber('1', existingList, 'h-2');
      expect(duplicateOther?.id).toBe('h-1');

      // Exclude by array of IDs
      expect(findDuplicateHouseholdByNumber('104', existingList, ['h-2', 'srv-2'])).toBeNull();

      // Exclude by serverId
      const listWithServerId = [
        { id: 'client-1', serverId: 'server-1', houseNumber: '30' },
        { id: 'client-2', serverId: 'server-2', houseNumber: '31' },
      ];
      expect(findDuplicateHouseholdByNumber('30', listWithServerId, 'server-1')).toBeNull();
      expect(findDuplicateHouseholdByNumber('30', listWithServerId, ['server-1'])).toBeNull();
    });

    it('returns null for unique house numbers', () => {
      expect(findDuplicateHouseholdByNumber('105', existingList)).toBeNull();
      expect(findDuplicateHouseholdByNumber('12-B', existingList)).toBeNull();
      expect(findDuplicateHouseholdByNumber('999', existingList)).toBeNull();
    });

    it('handles empty or blank number without false positive match', () => {
      expect(findDuplicateHouseholdByNumber('', existingList)).toBeNull();
      expect(findDuplicateHouseholdByNumber('   ', existingList)).toBeNull();
    });
  });

  describe('getNextCongregationHouseNumber', () => {
    it('returns "1" for an empty list', () => {
      expect(getNextCongregationHouseNumber([])).toBe('1');
    });

    it('increments from highest existing positive integer', () => {
      const list = [
        { id: '1', houseNumber: '1' },
        { id: '2', houseNumber: '2' },
        { id: '3', houseNumber: '3' },
      ];
      expect(getNextCongregationHouseNumber(list)).toBe('4');
    });

    it('handles sparse and high numbers', () => {
      const list = [
        { id: '1', houseNumber: '10' },
        { id: '2', houseNumber: '50' },
        { id: '3', houseNumber: '104' },
      ];
      expect(getNextCongregationHouseNumber(list)).toBe('105');
    });

    it('extracts numbers from prefixed strings (e.g. #104, 12-A)', () => {
      const list = [
        { id: '1', houseNumber: '#20' },
        { id: '2', houseNumber: '25-B' },
      ];
      expect(getNextCongregationHouseNumber(list)).toBe('26');
    });

    it('skips numbers that already exist as custom strings to guarantee uniqueness', () => {
      const list = [
        { id: '1', houseNumber: '1' },
        { id: '2', houseNumber: '2' },
        { id: '3', houseNumber: '4' }, // custom entry ahead
      ];
      // Max is 4, candidate starts at 5
      expect(getNextCongregationHouseNumber(list)).toBe('5');
    });

    it('falls back to "1" if list contains only non-numeric strings', () => {
      const list = [
        { id: '1', houseNumber: 'Gate North' },
        { id: '2', houseNumber: null },
      ];
      expect(getNextCongregationHouseNumber(list)).toBe('1');
    });
  });

  describe('checkHouseholdNumberDuplicateInFirestore', () => {
    it('returns isDuplicate: true when matching house number exists in congregation', async () => {
      const fakeDocs = [
        {
          id: 'doc-1',
          data: () => ({ houseNumber: '101', address: '101 Main St', congregationId: 'cong-123' }),
        },
        {
          id: 'doc-2',
          data: () => ({
            houseNumber: '#102-A',
            address: '102A Oak Ave',
            congregationId: 'cong-123',
          }),
        },
      ];

      (getDocs as any).mockResolvedValueOnce({
        docs: fakeDocs,
      } as any);

      const fakeFirestore = {} as any;
      const result = await checkHouseholdNumberDuplicateInFirestore(
        fakeFirestore,
        'cong-123',
        ' 102-a '
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicate?.id).toBe('doc-2');
    });

    it('ignores the specified excludeId during update checks', async () => {
      const fakeDocs = [
        {
          id: 'doc-1',
          data: () => ({ houseNumber: '101', address: '101 Main St', congregationId: 'cong-123' }),
        },
      ];

      (getDocs as any).mockResolvedValueOnce({
        docs: fakeDocs,
      } as any);

      const fakeFirestore = {} as any;
      const result = await checkHouseholdNumberDuplicateInFirestore(
        fakeFirestore,
        'cong-123',
        '101',
        'doc-1'
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicate).toBeNull();
    });

    it('returns isDuplicate: false for unique house number', async () => {
      const fakeDocs = [
        {
          id: 'doc-1',
          data: () => ({ houseNumber: '101', address: '101 Main St', congregationId: 'cong-123' }),
        },
      ];

      (getDocs as any).mockResolvedValueOnce({
        docs: fakeDocs,
      } as any);

      const fakeFirestore = {} as any;
      const result = await checkHouseholdNumberDuplicateInFirestore(
        fakeFirestore,
        'cong-123',
        '105'
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicate).toBeNull();
    });
  });
});
