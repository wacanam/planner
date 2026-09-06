import { describe, expect, it } from 'vitest';
import {
  cleanStreetOrAddress,
  hasPiiInNotes,
  redactPiiFromNotes,
  sanitizeHouseholdDoc,
  sanitizeVisitDoc,
} from '../privacy/privacy-sanitizer';

describe('Privacy Sanitizer Rules', () => {
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

  describe('redactPiiFromNotes', () => {
    it('leaves safe physical access notes untouched', () => {
      const safeNote = 'Gate code #4589. Beware of dog on porch. Ring upper buzzer.';
      expect(redactPiiFromNotes(safeNote)).toBe(safeNote);
    });

    it('redacts phone numbers in notes', () => {
      expect(redactPiiFromNotes('Call resident at 09171234567 before visiting')).toBe(
        'Call resident at [REDACTED PHONE] before visiting'
      );
      expect(redactPiiFromNotes('Contact +63 918 555 1234 for gate access')).toBe(
        'Contact [REDACTED PHONE] for gate access'
      );
    });

    it('redacts email addresses in notes', () => {
      expect(redactPiiFromNotes('Email landlord at landlord@example.com for entry')).toBe(
        'Email landlord at [REDACTED EMAIL] for entry'
      );
    });

    it('detects PII with hasPiiInNotes', () => {
      expect(hasPiiInNotes('Gate code 1234')).toBe(false);
      expect(hasPiiInNotes('Call 09171234567')).toBe(true);
      expect(hasPiiInNotes('Send email to test@domain.com')).toBe(true);
    });
  });

  describe('sanitizeHouseholdDoc', () => {
    it('detects and flags deprecated PII fields for deletion', () => {
      const dirtyDoc = {
        name: 'Santos Family',
        occupantsCount: 4,
        lwpNotes: 'Called on Monday',
        bestTimeToCall: 'Evenings',
        streetName: 'Santos Residence, Purok 2',
        address: '104 Santos Residence, Purok 2',
        notes: 'Call 09171234567 for gate buzzer',
        type: 'house',
        status: 'available',
      };

      const result = sanitizeHouseholdDoc(dirtyDoc);
      expect(result.needsUpdate).toBe(true);
      expect(result.deletions).toContain('name');
      expect(result.deletions).toContain('occupantsCount');
      expect(result.deletions).toContain('lwpNotes');
      expect(result.deletions).toContain('bestTimeToCall');
      expect(result.updates.streetName).toBe('Purok 2');
      expect(result.updates.notes).toBe('Call [REDACTED PHONE] for gate buzzer');
    });

    it('returns needsUpdate: false for already clean households', () => {
      const cleanDoc = {
        houseNumber: '104',
        streetName: 'Maple Street',
        address: '104 Maple Street',
        city: 'Springfield',
        type: 'house',
        status: 'available',
        notes: 'Gate code #1234',
      };

      const result = sanitizeHouseholdDoc(cleanDoc);
      expect(result.needsUpdate).toBe(false);
      expect(result.deletions).toHaveLength(0);
      expect(Object.keys(result.updates)).toHaveLength(0);
    });
  });

  describe('sanitizeVisitDoc', () => {
    it('detects and flags spiritual and RV fields for removal', () => {
      const dirtyVisit = {
        outcome: 'answered',
        bibleTopicDiscussed: 'Paradise Hope',
        literaturePlaced: 'Enjoy Life Forever',
        literatureLeft: 'Tract No. 1',
        returnVisitPlanned: true,
        nextVisitDate: '2026-09-10',
        nextVisitTime: '10:00',
        nextVisitNotes: 'Discuss Psalm 37',
        scheduledAppointmentType: 'return_visit',
        notes: 'Visit completed with nice conversation. Call 09181234567 next time.',
      };

      const result = sanitizeVisitDoc(dirtyVisit);
      expect(result.needsUpdate).toBe(true);
      expect(result.deletions).toContain('bibleTopicDiscussed');
      expect(result.deletions).toContain('literaturePlaced');
      expect(result.deletions).toContain('literatureLeft');
      expect(result.deletions).toContain('returnVisitPlanned');
      expect(result.deletions).toContain('nextVisitDate');
      expect(result.deletions).toContain('nextVisitTime');
      expect(result.deletions).toContain('nextVisitNotes');
      expect(result.deletions).toContain('scheduledAppointmentType');
      expect(result.updates.notes).toBe(
        'Visit completed with nice conversation. Call [REDACTED PHONE] next time.'
      );
    });

    it('returns needsUpdate: false for already clean visit', () => {
      const cleanVisit = {
        outcome: 'answered',
        notes: 'Dog behind gate. Not dangerous.',
        visitDate: '2026-09-06T08:00:00Z',
      };

      const result = sanitizeVisitDoc(cleanVisit);
      expect(result.needsUpdate).toBe(false);
    });
  });
});
