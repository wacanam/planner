import { describe, expect, it } from 'vitest';
import {
  cleanStreetOrAddress,
  containsSpiOrPii,
  detectSpiAndPiiViolations,
  sanitizeEncounterDoc,
  sanitizeHouseholdDoc,
  sanitizeOpenText,
  sanitizeTerritoryDoc,
  sanitizeVisitDoc,
} from '../privacy/privacy-sanitizer';

describe('Privacy Sanitizer & Open Text Governance', () => {
  describe('cleanStreetOrAddress', () => {
    it('leaves standard street names untouched', () => {
      expect(cleanStreetOrAddress('Maple Street')).toBe('Maple Street');
      expect(cleanStreetOrAddress('742 Evergreen Terrace')).toBe('742 Evergreen Terrace');
      expect(cleanStreetOrAddress('Purok 3, Barangay San Jose')).toBe('Purok 3, Barangay San Jose');
      expect(cleanStreetOrAddress('Blk 5 Lot 12, Phase 2')).toBe('Blk 5 Lot 12, Phase 2');
    });

    it('removes family residence patterns from address string', () => {
      expect(cleanStreetOrAddress('Santos Residence, Purok 3')).toBe('Purok 3');
      expect(cleanStreetOrAddress('Purok 3, Cruz Residence')).toBe('Purok 3');
      expect(cleanStreetOrAddress('Dela Cruz Residence')).toBe('');
      expect(cleanStreetOrAddress('Garcia Family, Blk 2 Lot 3')).toBe('Blk 2 Lot 3');
      expect(cleanStreetOrAddress('Mr. Tan, Main Street')).toBe('Main Street');
      expect(cleanStreetOrAddress('Mrs. Reyes Residence, Sitio Ilaya')).toBe('Sitio Ilaya');
      expect(cleanStreetOrAddress('Bahay ni Juan, Purok 1')).toBe('Purok 1');
    });

    it('cleans up residual punctuation after removing residence names', () => {
      expect(cleanStreetOrAddress('Santos Residence - Purok 4')).toBe('Purok 4');
      expect(cleanStreetOrAddress('Purok 4 / Santos Residence')).toBe('Purok 4');
    });

    it('handles null/undefined gracefully', () => {
      expect(cleanStreetOrAddress(null)).toBeNull();
      expect(cleanStreetOrAddress(undefined)).toBeNull();
      expect(cleanStreetOrAddress('')).toBe('');
    });
  });

  describe('containsSpiOrPii & detectSpiAndPiiViolations', () => {
    it('detects religious affiliations and spiritual status keywords (SPI)', () => {
      expect(containsSpiOrPii('Resident is Roman Catholic')).toBe(true);
      expect(containsSpiOrPii('They are Born Again Christians')).toBe(true);
      expect(containsSpiOrPii('Active member of Iglesia ni Cristo')).toBe(true);
      expect(containsSpiOrPii('Family is Muslim')).toBe(true);
      expect(containsSpiOrPii('Householder is a former JW')).toBe(true);
      expect(containsSpiOrPii('Spoke to the parish priest')).toBe(true);

      const violations = detectSpiAndPiiViolations('Resident is Catholic priest');
      expect(violations).toContain('Religious affiliation / spiritual status (SPI)');
    });

    it('detects health and medical vulnerabilities (SPI)', () => {
      expect(containsSpiOrPii('Householder has cancer')).toBe(true);
      expect(containsSpiOrPii('Elderly resident is bedridden')).toBe(true);
      expect(containsSpiOrPii('Undergoing dialysis twice a week')).toBe(true);
      expect(containsSpiOrPii('Suffers from dementia and memory loss')).toBe(true);
      expect(containsSpiOrPii('Currently confined in hospital')).toBe(true);
      expect(containsSpiOrPii('Child is autistic with special needs')).toBe(true);

      const violations = detectSpiAndPiiViolations('Patient is bedridden with stroke');
      expect(violations).toContain('Health or medical condition (SPI)');
    });

    it('detects political opinions and sensitive statuses (SPI)', () => {
      expect(containsSpiOrPii('Vocal communist supporter')).toBe(true);
      expect(containsSpiOrPii('Separated from spouse, living with mistress')).toBe(true);
      expect(containsSpiOrPii('Resident is an ex-convict')).toBe(true);
    });

    it('detects resident names and contact details (PII)', () => {
      expect(containsSpiOrPii('Look for Mrs. Santos')).toBe(true);
      expect(containsSpiOrPii('Hanapin si Juan Dela Cruz')).toBe(true);
      expect(containsSpiOrPii('Spoke with Dr. Ramos')).toBe(true);
      expect(containsSpiOrPii('Call 09171234567')).toBe(true);
      expect(containsSpiOrPii('Email owner at owner@gmail.com')).toBe(true);
      expect(containsSpiOrPii('Message on https://fb.com/juandelacruz')).toBe(true);
    });

    it('returns false for safe physical access notes', () => {
      expect(containsSpiOrPii('Gate code is #1234. Ring upper buzzer.')).toBe(false);
      expect(containsSpiOrPii('Beware of dog on front porch.')).toBe(false);
      expect(containsSpiOrPii('Slippery stairs on left side of building.')).toBe(false);
      expect(containsSpiOrPii('Blue gate beside Purok 2 basketball court.')).toBe(false);
    });
  });

  describe('sanitizeOpenText', () => {
    it('preserves legitimate physical access notes while redacting SPI and PII', () => {
      const input =
        'Gate code #1234. Spoke with Mrs. Santos, she is Catholic and said her husband is bedridden. Beware of loose dog.';
      const output = sanitizeOpenText(input);

      expect(output).toContain('Gate code #1234');
      expect(output).toContain('Beware of loose dog');
      expect(output).toContain('[REDACTED NAME]');
      expect(output).toContain('[REDACTED SPI]');
      expect(output).not.toContain('Mrs. Santos');
      expect(output).not.toContain('Catholic');
      expect(output).not.toContain('bedridden');
    });

    it('redacts phones, emails, and social links when physical access notes are present', () => {
      const input =
        'Call 0917-123-4567 or email admin@building.com for buzzer access. Heavy iron gate.';
      const output = sanitizeOpenText(input);

      expect(output).toContain('[REDACTED PHONE]');
      expect(output).toContain('[REDACTED EMAIL]');
      expect(output).toContain('buzzer access');
      expect(output).toContain('Heavy iron gate');
      expect(output).not.toContain('0917-123-4567');
      expect(output).not.toContain('admin@building.com');
    });

    it('prunes notes to empty string when they contain solely PII or SPI with no physical access data', () => {
      // Pure religion note
      expect(sanitizeOpenText('Resident is Roman Catholic')).toBe('');
      // Pure health note
      expect(sanitizeOpenText('She has cancer and is in hospital')).toBe('');
      // Pure PII note
      expect(sanitizeOpenText('Look for Mrs. Santos 09171234567')).toBe('');
      // Pure spiritual rejection note
      expect(sanitizeOpenText('INC member, tiwalag, hates religion')).toBe('');
    });

    it('handles empty and null text gracefully', () => {
      expect(sanitizeOpenText(null)).toBeNull();
      expect(sanitizeOpenText(undefined)).toBeNull();
      expect(sanitizeOpenText('')).toBe('');
      expect(sanitizeOpenText('   ')).toBe('');
    });
  });

  describe('sanitizeHouseholdDoc', () => {
    it('prunes deprecated fields, cleans address, and sanitizes open text notes', () => {
      const dirtyDoc = {
        name: 'Santos Family',
        occupantsCount: 4,
        lwpNotes: 'Called on Monday',
        bestTimeToCall: 'Evenings',
        streetName: 'Santos Residence, Purok 2',
        address: '104 Santos Residence, Purok 2',
        landmark: 'Beside Cruz Residence',
        notes:
          'Gate is locked. Talked to Mrs. Santos, she is Catholic. Call 09171234567 before entering.',
        type: 'house',
        status: 'available',
      };

      const result = sanitizeHouseholdDoc(dirtyDoc);
      expect(result.needsUpdate).toBe(true);
      expect(result.deletions).toContain('name');
      expect(result.deletions).toContain('occupantsCount');
      expect(result.deletions).toContain('lwpNotes');
      expect(result.updates.streetName).toBe('Purok 2');
      expect(result.updates.landmark).toBe('');
      expect(result.updates.notes).toContain('Gate is locked');
      expect(result.updates.notes).toContain('[REDACTED SPI]');
      expect(result.updates.notes).toContain('[REDACTED PHONE]');
      expect(result.updates.notes).not.toContain('Catholic');
    });

    it('clears notes entirely if household notes were 100% PII/SPI', () => {
      const dirtyDoc = {
        streetName: 'Maple Street',
        address: '104 Maple Street',
        notes: 'Mrs. Santos, 09171234567, Catholic family',
      };

      const result = sanitizeHouseholdDoc(dirtyDoc);
      expect(result.needsUpdate).toBe(true);
      expect(result.updates.notes).toBe('');
    });
  });

  describe('sanitizeVisitDoc', () => {
    it('clears shared spiritual fields and sanitizes visit notes for SPI', () => {
      const dirtyVisit = {
        outcome: 'answered',
        bibleTopicDiscussed: 'Kingdom of God',
        literaturePlaced: 'Watchtower No. 2',
        returnVisitPlanned: true,
        nextVisitNotes: 'Discuss Trinity vs One God',
        notes:
          'Padlock on gate. Resident is Baptist and was argumentative. Watch out for dog on stairs.',
      };

      const result = sanitizeVisitDoc(dirtyVisit);
      expect(result.needsUpdate).toBe(true);
      expect(result.deletions).toContain('bibleTopicDiscussed');
      expect(result.deletions).toContain('literaturePlaced');
      expect(result.deletions).toContain('returnVisitPlanned');
      expect(result.deletions).toContain('nextVisitNotes');
      expect(result.updates.notes).toContain('Padlock on gate');
      expect(result.updates.notes).toContain('Watch out for dog on stairs');
      expect(result.updates.notes).toContain('[REDACTED SPI]');
      expect(result.updates.notes).not.toContain('Baptist');
    });
  });

  describe('sanitizeEncounterDoc', () => {
    it('prunes PII/spiritual fields and sanitizes notes and location description', () => {
      const dirtyEncounter = {
        name: 'Juan Dela Cruz',
        phoneNumber: '09181234567',
        topicsDiscussed: 'Paradise',
        locationDescription: 'In front of Santos Residence, Purok 3',
        notes: 'Resident has stroke. Gate buzzer broken.',
      };

      const result = sanitizeEncounterDoc(dirtyEncounter);
      expect(result.needsUpdate).toBe(true);
      expect(result.deletions).toContain('name');
      expect(result.deletions).toContain('phoneNumber');
      expect(result.deletions).toContain('topicsDiscussed');
      expect(result.updates.locationDescription).toBe('Purok 3');
      expect(result.updates.notes).toContain('Gate buzzer broken');
      expect(result.updates.notes).toContain('[REDACTED SPI]');
      expect(result.updates.notes).not.toContain('stroke');
    });
  });

  describe('sanitizeTerritoryDoc', () => {
    it('sanitizes description and notes in territories', () => {
      const dirtyTerritory = {
        name: 'Territory 101',
        description: 'Covers Purok 1. Contact coordinator at 09171234567 for key.',
        notes: 'Area includes Catholic chapel and private compound with guard.',
      };

      const result = sanitizeTerritoryDoc(dirtyTerritory);
      expect(result.needsUpdate).toBe(true);
      expect(result.updates.description).toContain('[REDACTED PHONE]');
      expect(result.updates.notes).toContain('[REDACTED SPI]');
      expect(result.updates.notes).toContain('private compound with guard');
    });
  });
});
