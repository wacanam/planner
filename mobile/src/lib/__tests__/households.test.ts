import { describe, expect, it } from 'vitest';
import {
  findDuplicateHouseholdByNumber,
  getHouseholdMapLabel,
  getNextCongregationHouseNumber,
  normalizeHouseNumber,
  toCanonicalHouseNumber,
} from '../households';

describe('mobile households library', () => {
  describe('normalizeHouseNumber', () => {
    it('trims and normalizes whitespace', () => {
      expect(normalizeHouseNumber('  104   A  ')).toBe('104 A');
      expect(normalizeHouseNumber('')).toBe('');
    });
  });

  describe('toCanonicalHouseNumber', () => {
    it('strips leading # and converts to lowercase', () => {
      expect(toCanonicalHouseNumber('#104A')).toBe('104a');
      expect(toCanonicalHouseNumber('  # 12-b  ')).toBe('12-b');
      expect(toCanonicalHouseNumber('')).toBe('');
    });
  });

  describe('findDuplicateHouseholdByNumber', () => {
    const list = [
      { id: 'h1', houseNumber: '104' },
      { id: 'h2', houseNumber: '#105' },
    ];

    it('detects duplicates case and format insensitively', () => {
      expect(findDuplicateHouseholdByNumber('#104', list)?.id).toBe('h1');
      expect(findDuplicateHouseholdByNumber('105', list)?.id).toBe('h2');
      expect(findDuplicateHouseholdByNumber('106', list)).toBeNull();
    });

    it('excludes specified id', () => {
      expect(findDuplicateHouseholdByNumber('104', list, 'h1')).toBeNull();
      expect(findDuplicateHouseholdByNumber('104', list, ['h1', 'srv-1'])).toBeNull();

      const listWithServerId = [{ id: 'client-1', serverId: 'server-1', houseNumber: '30' }];
      expect(findDuplicateHouseholdByNumber('30', listWithServerId, 'server-1')).toBeNull();
      expect(findDuplicateHouseholdByNumber('30', listWithServerId, ['server-1'])).toBeNull();
    });

    it('allows duplicate JW house numbers as an exception', () => {
      const listWithJW = [{ id: 'h-jw1', houseNumber: 'JW' }];
      expect(findDuplicateHouseholdByNumber('JW', listWithJW)).toBeNull();
      expect(findDuplicateHouseholdByNumber('jw', listWithJW)).toBeNull();
      expect(findDuplicateHouseholdByNumber('#JW', listWithJW)).toBeNull();
      expect(findDuplicateHouseholdByNumber('# jw', listWithJW)).toBeNull();
    });
  });

  describe('getNextCongregationHouseNumber', () => {
    it('finds the next sequential house number', () => {
      const list = [
        { id: 'h1', houseNumber: '1' },
        { id: 'h2', houseNumber: '2' },
        { id: 'h3', houseNumber: '10' },
      ];
      expect(getNextCongregationHouseNumber(list)).toBe('11');
    });

    it('handles empty lists', () => {
      expect(getNextCongregationHouseNumber([])).toBe('1');
    });
  });

  describe('getHouseholdMapLabel', () => {
    it('formats only house number when house number is set (ignoring resident name)', () => {
      expect(
        getHouseholdMapLabel({
          houseNumber: '104',
          name: 'Smith',
          streetName: 'Maple Street',
          address: '104 Maple Street, Springfield',
        })
      ).toBe('#104');
    });

    it('formats only house number instead of street name', () => {
      expect(
        getHouseholdMapLabel({
          houseNumber: '104',
          name: null,
          streetName: 'Maple Street',
          address: '104 Maple Street, Springfield',
        })
      ).toBe('#104');
    });

    it('never displays street or resident name when house number is missing', () => {
      expect(
        getHouseholdMapLabel({
          name: 'Dela Cruz Residence',
          streetName: 'Pine Ave',
          address: '123 Pine Ave, Quezon City',
        })
      ).toBe('');

      expect(
        getHouseholdMapLabel({
          name: null,
          streetName: 'Pine Ave',
          address: '123 Pine Ave, Quezon City, Metro Manila',
        })
      ).toBe('');
    });

    it('displays only house number even when name and street name are present', () => {
      expect(
        getHouseholdMapLabel({
          houseNumber: '30',
          name: 'Lower Calanawan',
          streetName: 'Iza bungcal family',
          address: 'Lower Calanawan',
        })
      ).toBe('#30');
    });

    it('returns empty string when name, street name, and house number are missing', () => {
      expect(
        getHouseholdMapLabel({
          name: null,
          streetName: null,
          address: 'Block 2 Lot 5, Zone 3, Barangay San Jose',
        })
      ).toBe('');

      expect(
        getHouseholdMapLabel({
          name: undefined,
          streetName: undefined,
          householdAddress: '742 Evergreen Terrace, Springfield, OR',
        })
      ).toBe('');
    });

    it('formats house number without address fallback', () => {
      expect(
        getHouseholdMapLabel({
          houseNumber: '104',
          address: '104 Maple Street, Springfield, IL',
        })
      ).toBe('#104');

      expect(
        getHouseholdMapLabel({
          houseNumber: '5',
          address: 'Block 2 Lot 5, Zone 3',
        })
      ).toBe('#5');
    });

    it('preserves existing # prefix on house number without doubling', () => {
      expect(
        getHouseholdMapLabel({
          houseNumber: '#12B',
          name: 'Johnson',
        })
      ).toBe('#12B');
    });

    it('handles house number only when all else missing', () => {
      expect(
        getHouseholdMapLabel({
          houseNumber: '104',
        })
      ).toBe('#104');
    });

    it('returns empty string for empty or null objects', () => {
      expect(getHouseholdMapLabel({})).toBe('');
      expect(getHouseholdMapLabel(null)).toBe('');
      expect(getHouseholdMapLabel(undefined)).toBe('');
    });
  });
});
