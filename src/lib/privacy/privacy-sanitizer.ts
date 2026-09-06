// src/lib/privacy/privacy-sanitizer.ts

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/schema';

// ─── Regular Expressions for PII Detection & Cleansing ────────────────────────

const RESIDENCE_PATTERNS = [
  /\b(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Atty\.?|Engr\.?)\s+[A-Za-z'-]+(?:\s+[A-Za-z'-]+)*(?:'s)?\s*(?:residence|house)?\b/gi,
  /\b(?:(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Atty\.?|Engr\.?)\s+)?[A-Za-z'-]+(?:\s+[A-Za-z'-]+)*\s+Residence\b/gi,
  /\bResidence\s+(?:of|ni)\s+(?:(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?)\s+)?[A-Za-z'-]+(?:\s+[A-Za-z'-]+)*\b/gi,
  /\b(?:(?:Mr\.?|Mrs\.?|Ms\.?)\s+)?[A-Za-z'-]+\s+Family\b/gi,
  /\bFamily\s+[A-Za-z'-]+\b/gi,
];

// Matches common Philippine mobile numbers and standard formatted numbers
const PHONE_REGEX =
  /(?:\+?63\s*|0)?9\d{2}[-\s]?\d{3}[-\s]?\d{4}|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b|\b09\d{9}\b/g;

// Matches email addresses
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

/**
 * Strips family or resident names from street/address fields (e.g. "Santos Residence, Purok 3" -> "Purok 3").
 */
export function cleanStreetOrAddress(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null;
  if (!text.trim()) return '';

  let cleaned = text;
  for (const pattern of RESIDENCE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Clean up dangling delimiters like leading/trailing commas, slashes, dashes, extra spaces
  cleaned = cleaned
    .replace(/^\s*[,/\\-]\s*/g, '')
    .replace(/\s*[,/\\-]\s*$/g, '')
    .replace(/\s*[,/\\-]\s*[,/\\-]\s*/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned;
}

/**
 * Replaces phone numbers and email addresses in freeform notes with [REDACTED] placeholders.
 */
export function redactPiiFromNotes(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null;
  if (!text.trim()) return '';

  let sanitized = text.replace(EMAIL_REGEX, '[REDACTED EMAIL]');
  sanitized = sanitized.replace(PHONE_REGEX, '[REDACTED PHONE]');
  return sanitized;
}

/**
 * Checks if notes contain phone numbers or email addresses.
 */
export function hasPiiInNotes(text: string | null | undefined): boolean {
  if (!text) return false;
  return EMAIL_REGEX.test(text) || PHONE_REGEX.test(text);
}

// ─── Document-Level Sanitizer Rules ──────────────────────────────────────────

export interface DocSanitizeResult {
  needsUpdate: boolean;
  deletions: string[];
  updates: Record<string, any>;
  summary: string[];
}

export function sanitizeHouseholdDoc(data: Record<string, any>): DocSanitizeResult {
  const deletions: string[] = [];
  const updates: Record<string, any> = {};
  const summary: string[] = [];

  // 1. Deprecated PII fields to prune
  const fieldsToPrune = [
    'name',
    'occupantsCount',
    'lwpNotes',
    'bestTimeToCall',
    'collaboratorIds',
    'readOnlyUserIds',
  ];

  for (const f of fieldsToPrune) {
    if (data[f] !== undefined && data[f] !== null) {
      deletions.push(f);
      summary.push(`Prune deprecated field: ${f}`);
    }
  }

  // 2. Clean streetName
  if (typeof data.streetName === 'string') {
    const cleanedStreet = cleanStreetOrAddress(data.streetName);
    if (cleanedStreet !== null && cleanedStreet !== data.streetName) {
      updates.streetName = cleanedStreet;
      summary.push(`Cleaned streetName: "${data.streetName}" → "${cleanedStreet}"`);
    }
  }

  // 3. Clean address
  if (typeof data.address === 'string') {
    const cleanedAddress = cleanStreetOrAddress(data.address);
    if (cleanedAddress !== null && cleanedAddress !== data.address) {
      updates.address = cleanedAddress;
      summary.push(`Cleaned address: "${data.address}" → "${cleanedAddress}"`);
    }
  }

  // 4. Redact notes
  if (typeof data.notes === 'string') {
    const redactedNotes = redactPiiFromNotes(data.notes);
    if (redactedNotes !== null && redactedNotes !== data.notes) {
      updates.notes = redactedNotes;
      summary.push('Redacted phone/email PII in household notes');
    }
  }

  return {
    needsUpdate: deletions.length > 0 || Object.keys(updates).length > 0,
    deletions,
    updates,
    summary,
  };
}

export function sanitizeVisitDoc(data: Record<string, any>): DocSanitizeResult {
  const deletions: string[] = [];
  const updates: Record<string, any> = {};
  const summary: string[] = [];

  // Fields to prune from shared congregation visit records
  const spiritualAndRvFields = [
    'bibleTopicDiscussed',
    'literaturePlaced',
    'literatureLeft',
    'returnVisitPlanned',
    'returnVisitDate',
    'nextVisitDate',
    'nextVisitTime',
    'nextVisitNotes',
    'scheduledAppointmentType',
    'bibleStudyStatus',
    'studyOffered',
    'isAppointmentMissed',
  ];

  for (const f of spiritualAndRvFields) {
    if (data[f] !== undefined && data[f] !== null && data[f] !== '' && data[f] !== false) {
      deletions.push(f);
      summary.push(`Removed shared spiritual/RV field: ${f}`);
    }
  }

  // Redact notes
  if (typeof data.notes === 'string') {
    const redactedNotes = redactPiiFromNotes(data.notes);
    if (redactedNotes !== null && redactedNotes !== data.notes) {
      updates.notes = redactedNotes;
      summary.push('Redacted phone/email PII in visit notes');
    }
  }

  return {
    needsUpdate: deletions.length > 0 || Object.keys(updates).length > 0,
    deletions,
    updates,
    summary,
  };
}

// ─── Firestore Execution Engine ──────────────────────────────────────────────

export interface SanitizerOptions {
  mode: 'dry_run' | 'execute';
  congregationId?: string | null;
  targets?: Array<'households' | 'visits' | 'legacy'>;
}

export interface SanitizerReport {
  timestamp: string;
  mode: 'dry_run' | 'execute';
  congregationId: string | null;
  householdsScanned: number;
  householdsSanitized: number;
  visitsScanned: number;
  visitsSanitized: number;
  contactsDeleted: number;
  memberLocationsDeleted: number;
  sampleChanges: Array<{
    collection: string;
    id: string;
    summary: string[];
  }>;
}

export async function runPrivacySanitizer(options: SanitizerOptions): Promise<SanitizerReport> {
  const db = getAdminDb();
  const isExecute = options.mode === 'execute';
  const targets = options.targets || ['households', 'visits', 'legacy'];

  const report: SanitizerReport = {
    timestamp: new Date().toISOString(),
    mode: options.mode,
    congregationId: options.congregationId || null,
    householdsScanned: 0,
    householdsSanitized: 0,
    visitsScanned: 0,
    visitsSanitized: 0,
    contactsDeleted: 0,
    memberLocationsDeleted: 0,
    sampleChanges: [],
  };

  // 1. Sanitize Households
  if (targets.includes('households')) {
    let q: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.households);
    if (options.congregationId && options.congregationId !== 'all') {
      q = q.where('congregationId', '==', options.congregationId);
    }

    const snap = await q.get();
    report.householdsScanned = snap.size;

    let batch = db.batch();
    let batchCount = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      const res = sanitizeHouseholdDoc(data);

      if (res.needsUpdate) {
        report.householdsSanitized++;
        if (report.sampleChanges.length < 25) {
          report.sampleChanges.push({
            collection: 'households',
            id: doc.id,
            summary: res.summary,
          });
        }

        if (isExecute) {
          const updatePayload: Record<string, any> = { ...res.updates };
          for (const d of res.deletions) {
            updatePayload[d] = FieldValue.delete();
          }
          batch.update(doc.ref, updatePayload);
          batchCount++;

          if (batchCount >= 400) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
          }
        }
      }
    }

    if (isExecute && batchCount > 0) {
      await batch.commit();
    }
  }

  // 2. Sanitize Visits
  if (targets.includes('visits')) {
    let q: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.visits);
    if (options.congregationId && options.congregationId !== 'all') {
      q = q.where('congregationId', '==', options.congregationId);
    }

    const snap = await q.get();
    report.visitsScanned = snap.size;

    let batch = db.batch();
    let batchCount = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      const res = sanitizeVisitDoc(data);

      if (res.needsUpdate) {
        report.visitsSanitized++;
        if (report.sampleChanges.length < 50) {
          report.sampleChanges.push({
            collection: 'visits',
            id: doc.id,
            summary: res.summary,
          });
        }

        if (isExecute) {
          const updatePayload: Record<string, any> = { ...res.updates };
          for (const d of res.deletions) {
            updatePayload[d] = FieldValue.delete();
          }
          batch.update(doc.ref, updatePayload);
          batchCount++;

          if (batchCount >= 400) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
          }
        }
      }
    }

    if (isExecute && batchCount > 0) {
      await batch.commit();
    }
  }

  // 3. Prune Legacy Collections (contacts, memberLocations)
  if (targets.includes('legacy')) {
    // Contacts
    let contactsQ: FirebaseFirestore.Query = db.collection('contacts');
    if (options.congregationId && options.congregationId !== 'all') {
      contactsQ = contactsQ.where('congregationId', '==', options.congregationId);
    }
    const contactsSnap = await contactsQ.get();
    report.contactsDeleted = contactsSnap.size;

    if (isExecute && contactsSnap.size > 0) {
      let batch = db.batch();
      let count = 0;
      for (const doc of contactsSnap.docs) {
        batch.delete(doc.ref);
        count++;
        if (count >= 400) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
    }

    // Member Locations (Live GPS tracking)
    const locSnap = await db.collection('memberLocations').get();
    report.memberLocationsDeleted = locSnap.size;

    if (isExecute && locSnap.size > 0) {
      let batch = db.batch();
      let count = 0;
      for (const doc of locSnap.docs) {
        batch.delete(doc.ref);
        count++;
        if (count >= 400) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
    }
  }

  return report;
}
