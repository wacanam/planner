import { describe, expect, it } from 'vitest';
import { canRedactPrivacyFields } from '@/lib/permissions';
import {
  cleanStreetOrAddress,
  detectSpiAndPiiViolations,
  sanitizeOpenText,
} from '@/lib/privacy/open-text-guard';
import { UserRole } from '@/lib/roles';

describe('Inline Privacy Redaction Logic', () => {
  describe('Permission Scoping', () => {
    it('grants redaction capability to Super Admin, Admin, and Service Overseer', () => {
      expect(canRedactPrivacyFields(UserRole.SUPER_ADMIN)).toBe(true);
      expect(canRedactPrivacyFields(UserRole.ADMIN)).toBe(true);
      expect(canRedactPrivacyFields(UserRole.SERVICE_OVERSEER)).toBe(true);
      expect(canRedactPrivacyFields('super_admin')).toBe(true);
      expect(canRedactPrivacyFields('admin')).toBe(true);
      expect(canRedactPrivacyFields('service_overseer')).toBe(true);
    });

    it('grants redaction capability via congregationRole override', () => {
      expect(canRedactPrivacyFields(UserRole.USER, UserRole.SERVICE_OVERSEER)).toBe(true);
      expect(canRedactPrivacyFields('publisher', 'service_overseer')).toBe(true);
      expect(canRedactPrivacyFields('publisher', 'admin')).toBe(true);
    });

    it('denies redaction capability to other congregation roles', () => {
      expect(canRedactPrivacyFields(UserRole.USER)).toBe(false);
      expect(canRedactPrivacyFields('publisher')).toBe(false);
      expect(canRedactPrivacyFields(UserRole.SECRETARY)).toBe(false);
      expect(canRedactPrivacyFields('secretary')).toBe(false);
      expect(canRedactPrivacyFields(UserRole.TERRITORY_SERVANT)).toBe(false);
      expect(canRedactPrivacyFields('territory_servant')).toBe(false);
      expect(canRedactPrivacyFields(UserRole.CIRCUIT_OVERSEER)).toBe(false);
      expect(canRedactPrivacyFields(UserRole.VISITING_PUBLISHER)).toBe(false);
      expect(canRedactPrivacyFields(null, null)).toBe(false);
      expect(canRedactPrivacyFields(undefined, undefined)).toBe(false);
    });
  });

  describe('One-Click Redaction Transformations', () => {
    function computeRedactedValue(
      text: string,
      fieldType: 'notes' | 'address' = 'notes'
    ): string | null {
      const currentText = text.trim();
      if (!currentText || currentText === '[REDACTED]') return null;

      if (fieldType === 'address') {
        const cleaned = cleanStreetOrAddress(currentText);
        if (cleaned && cleaned !== currentText) {
          return cleaned;
        }
        return '[REDACTED]';
      }

      const sanitized = sanitizeOpenText(currentText);
      if (sanitized && sanitized !== currentText) {
        return sanitized;
      }
      if (!sanitized) {
        return null;
      }
      return '[REDACTED]';
    }

    it('preserves legitimate physical access notes while redacting SPI and resident names', () => {
      const rawNote = 'Gate code #1234. Mrs. Santos is Catholic and bedridden.';
      const result = computeRedactedValue(rawNote, 'notes');
      expect(result).not.toBeNull();
      expect(result).toContain('Gate code #1234');
      expect(result).not.toContain('Santos');
      expect(result).not.toContain('Catholic');
      expect(result).not.toContain('bedridden');
      expect(result).toContain('[REDACTED SPI]');
    });

    it('removes the note completely when it consists solely of sensitive personal details', () => {
      const rawNote = 'Talked to Maria Santos, phone 0917-123-4567, Born Again Christian';
      const result = computeRedactedValue(rawNote, 'notes');
      expect(result).toBeNull();
    });

    it('purges notes lacking physical access utility upon one-click redact', () => {
      const rawNote = 'The owner works for the city mayor and told us not to come';
      const result = computeRedactedValue(rawNote, 'notes');
      expect(result).toBeNull();
    });

    it('cleans family and resident names from street and address fields', () => {
      const rawAddress = 'Santos Residence, Purok 3, Barangay San Jose';
      const result = computeRedactedValue(rawAddress, 'address');
      expect(result).toBe('Purok 3, Barangay San Jose');
      expect(result).not.toContain('Santos');
    });

    it('detects violations and alerts overseers with specific violation tags', () => {
      const violations = detectSpiAndPiiViolations(
        'Spoke with Mrs. Dela Cruz, Baptist church member, undergoing dialysis'
      );
      expect(violations).toContain('Resident personal name (PII)');
      expect(violations).toContain('Religious affiliation / spiritual status (SPI)');
      expect(violations).toContain('Health or medical condition (SPI)');
    });
  });
});
