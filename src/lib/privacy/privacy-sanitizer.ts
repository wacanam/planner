// src/lib/privacy/privacy-sanitizer.ts

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/schema';
import {
  cleanStreetOrAddress,
  detectSpiAndPiiViolations,
  sanitizeOpenText,
} from './open-text-guard';

// Re-export all guard definitions and utilities for backwards compatibility
export {
  CONTACT_HANDLE_REGEX,
  cleanStreetOrAddress,
  containsSpiOrPii,
  detectSpiAndPiiViolations,
  EMAIL_REGEX,
  HONORIFIC_NAME_REGEX,
  hasPiiInNotes,
  NAME_CONVERSATIONAL_REGEX,
  PHONE_REGEX,
  RESIDENCE_PATTERNS,
  redactPiiFromNotes,
  SPI_HEALTH_REGEX,
  SPI_POLITICAL_REGEX,
  SPI_RELIGION_REGEX,
  SPI_SENSITIVE_STATUS_REGEX,
  sanitizeOpenText,
} from './open-text-guard';

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

  // 1. Deprecated PII fields to prune completely
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

  // 4. Clean and sanitize landmark if present
  if (typeof data.landmark === 'string') {
    const cleanedLandmark = cleanStreetOrAddress(data.landmark);
    if (cleanedLandmark !== null && cleanedLandmark !== data.landmark) {
      updates.landmark = cleanedLandmark;
      summary.push(`Cleaned landmark: "${data.landmark}" → "${cleanedLandmark}"`);
    }
  }

  // 5. Sanitize open text notes for both SPI and PII
  if (typeof data.notes === 'string') {
    const violations = detectSpiAndPiiViolations(data.notes);
    const sanitizedNotes = sanitizeOpenText(data.notes);
    if (sanitizedNotes !== null && sanitizedNotes !== data.notes) {
      updates.notes = sanitizedNotes;
      const details = violations.length > 0 ? ` (${violations.join(', ')})` : '';
      summary.push(`Sanitized SPI/PII in household notes${details}`);
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

  // Sanitize open text notes for both SPI and PII
  if (typeof data.notes === 'string') {
    const violations = detectSpiAndPiiViolations(data.notes);
    const sanitizedNotes = sanitizeOpenText(data.notes);
    if (sanitizedNotes !== null && sanitizedNotes !== data.notes) {
      updates.notes = sanitizedNotes;
      const details = violations.length > 0 ? ` (${violations.join(', ')})` : '';
      summary.push(`Sanitized SPI/PII in visit notes${details}`);
    }
  }

  return {
    needsUpdate: deletions.length > 0 || Object.keys(updates).length > 0,
    deletions,
    updates,
    summary,
  };
}

export function sanitizeEncounterDoc(data: Record<string, any>): DocSanitizeResult {
  const deletions: string[] = [];
  const updates: Record<string, any> = {};
  const summary: string[] = [];

  // Contact and spiritual fields to prune from shared encounters
  const fieldsToPrune = [
    'name',
    'phoneNumber',
    'email',
    'topicsDiscussed',
    'topicDiscussed',
    'literatureOffered',
    'literatureAccepted',
    'nextVisitNotes',
    'bestTimeToCall',
    'bibleStudyPublication',
    'bibleStudyLesson',
  ];

  for (const f of fieldsToPrune) {
    if (data[f] !== undefined && data[f] !== null && data[f] !== '') {
      deletions.push(f);
      summary.push(`Removed encounter field: ${f}`);
    }
  }

  // Sanitize notes
  if (typeof data.notes === 'string') {
    const violations = detectSpiAndPiiViolations(data.notes);
    const sanitized = sanitizeOpenText(data.notes);
    if (sanitized !== null && sanitized !== data.notes) {
      updates.notes = sanitized;
      const details = violations.length > 0 ? ` (${violations.join(', ')})` : '';
      summary.push(`Sanitized SPI/PII in encounter notes${details}`);
    }
  }

  // Clean locationDescription
  if (typeof data.locationDescription === 'string') {
    const cleaned = cleanStreetOrAddress(data.locationDescription);
    if (cleaned !== null && cleaned !== data.locationDescription) {
      updates.locationDescription = cleaned;
      summary.push(
        `Cleaned encounter locationDescription: "${data.locationDescription}" → "${cleaned}"`
      );
    }
  }

  return {
    needsUpdate: deletions.length > 0 || Object.keys(updates).length > 0,
    deletions,
    updates,
    summary,
  };
}

export function sanitizeTerritoryDoc(data: Record<string, any>): DocSanitizeResult {
  const deletions: string[] = [];
  const updates: Record<string, any> = {};
  const summary: string[] = [];

  // Sanitize description
  if (typeof data.description === 'string') {
    const violations = detectSpiAndPiiViolations(data.description);
    const sanitized = sanitizeOpenText(data.description);
    if (sanitized !== null && sanitized !== data.description) {
      updates.description = sanitized;
      const details = violations.length > 0 ? ` (${violations.join(', ')})` : '';
      summary.push(`Sanitized SPI/PII in territory description${details}`);
    }
  }

  // Sanitize notes
  if (typeof data.notes === 'string') {
    const violations = detectSpiAndPiiViolations(data.notes);
    const sanitized = sanitizeOpenText(data.notes);
    if (sanitized !== null && sanitized !== data.notes) {
      updates.notes = sanitized;
      const details = violations.length > 0 ? ` (${violations.join(', ')})` : '';
      summary.push(`Sanitized SPI/PII in territory notes${details}`);
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
  targets?: Array<'households' | 'visits' | 'encounters' | 'territories' | 'legacy'>;
}

export interface SanitizerReport {
  timestamp: string;
  mode: 'dry_run' | 'execute';
  congregationId: string | null;
  householdsScanned: number;
  householdsSanitized: number;
  visitsScanned: number;
  visitsSanitized: number;
  encountersScanned: number;
  encountersSanitized: number;
  territoriesScanned: number;
  territoriesSanitized: number;
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
  const targets = options.targets || [
    'households',
    'visits',
    'encounters',
    'territories',
    'legacy',
  ];

  const report: SanitizerReport = {
    timestamp: new Date().toISOString(),
    mode: options.mode,
    congregationId: options.congregationId || null,
    householdsScanned: 0,
    householdsSanitized: 0,
    visitsScanned: 0,
    visitsSanitized: 0,
    encountersScanned: 0,
    encountersSanitized: 0,
    territoriesScanned: 0,
    territoriesSanitized: 0,
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

  // 3. Sanitize Encounters
  if (targets.includes('encounters')) {
    let q: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.encounters);
    if (options.congregationId && options.congregationId !== 'all') {
      q = q.where('congregationId', '==', options.congregationId);
    }

    const snap = await q.get();
    report.encountersScanned = snap.size;

    let batch = db.batch();
    let batchCount = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      const res = sanitizeEncounterDoc(data);

      if (res.needsUpdate) {
        report.encountersSanitized++;
        if (report.sampleChanges.length < 75) {
          report.sampleChanges.push({
            collection: 'encounters',
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

  // 4. Sanitize Territories
  if (targets.includes('territories')) {
    let q: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.territories);
    if (options.congregationId && options.congregationId !== 'all') {
      q = q.where('congregationId', '==', options.congregationId);
    }

    const snap = await q.get();
    report.territoriesScanned = snap.size;

    let batch = db.batch();
    let batchCount = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      const res = sanitizeTerritoryDoc(data);

      if (res.needsUpdate) {
        report.territoriesSanitized++;
        if (report.sampleChanges.length < 100) {
          report.sampleChanges.push({
            collection: 'territories',
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

  // 5. Prune Legacy Collections (contacts, memberLocations)
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
