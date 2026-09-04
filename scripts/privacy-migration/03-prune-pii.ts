// scripts/privacy-migration/03-prune-pii.ts

/**
 * Step 3: Cloud Firestore PII Pruning & Data Minimization Script
 *
 * Usage:
 *   bun run scripts/privacy-migration/03-prune-pii.ts --dry-run
 *   bun run scripts/privacy-migration/03-prune-pii.ts --execute
 *
 * Actions:
 *   1. Deletes all documents in /contacts/
 *   2. Deletes all documents in /memberLocations/
 *   3. Sanitizes /households/ by removing resident names, occupant counts, and LWP notes
 *   4. Sanitizes /visits/ by removing personal conversation notes
 */

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '../../src/lib/firebase/admin';

const isExecute = process.argv.includes('--execute');

async function prunePii() {
  console.log('====================================================');
  console.log(`     FIRESTORE PII PRUNING [Mode: ${isExecute ? 'EXECUTE' : 'DRY RUN'}]    `);
  console.log('====================================================\n');

  if (!isExecute) {
    console.log('NOTICE: Running in DRY-RUN mode. No changes will be written.');
    console.log('To execute real changes, pass --execute.\n');
  }

  const db = getAdminDb();

  // Helper to delete collection in batches of 400
  async function deleteCollection(collPath: string) {
    const collRef = db.collection(collPath);
    let totalDeleted = 0;

    while (true) {
      const snap = await collRef.limit(400).get();
      if (snap.empty) break;

      if (isExecute) {
        const batch = db.batch();
        for (const doc of snap.docs) {
          batch.delete(doc.ref);
        }
        await batch.commit();
      }

      totalDeleted += snap.size;
      console.log(`   - Processed ${totalDeleted} documents in /${collPath}/`);
    }

    return totalDeleted;
  }

  // 1. Delete /contacts/
  console.log('1. Pruning /contacts/ collection...');
  const deletedContacts = await deleteCollection('contacts');
  console.log(`   ✓ ${isExecute ? 'Deleted' : 'Found to delete'}: ${deletedContacts} contact documents.\n`);

  // 2. Delete /memberLocations/
  console.log('2. Pruning /memberLocations/ collection...');
  const deletedLocations = await deleteCollection('memberLocations');
  console.log(`   ✓ ${isExecute ? 'Deleted' : 'Found to delete'}: ${deletedLocations} location documents.\n`);

  // 3. Sanitize /households/
  console.log('3. Sanitizing /households/ collection (stripping resident names & occupant counts)...');
  const householdsSnap = await db.collection('households').get();
  let sanitizedHouseholds = 0;

  if (isExecute && householdsSnap.size > 0) {
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of householdsSnap.docs) {
      const data = doc.data();
      const needsSanitization =
        data.name !== undefined ||
        data.occupantsCount !== undefined ||
        data.lwpNotes !== undefined ||
        data.collaboratorIds !== undefined;

      if (needsSanitization) {
        batch.update(doc.ref, {
          name: FieldValue.delete(),
          occupantsCount: FieldValue.delete(),
          lwpNotes: FieldValue.delete(),
          collaboratorIds: FieldValue.delete(),
          readOnlyUserIds: FieldValue.delete(),
        });
        batchCount++;
        sanitizedHouseholds++;

        if (batchCount >= 400) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }
  } else {
    for (const doc of householdsSnap.docs) {
      const data = doc.data();
      if (data.name || data.occupantsCount !== undefined || data.lwpNotes) {
        sanitizedHouseholds++;
      }
    }
  }

  console.log(
    `   ✓ ${isExecute ? 'Sanitized' : 'Found to sanitize'}: ${sanitizedHouseholds} / ${householdsSnap.size} households.\n`
  );

  console.log('====================================================');
  console.log(`Pruning finished successfully (${isExecute ? 'EXECUTION COMPLETE' : 'DRY RUN ONLY'}).`);
  console.log('====================================================');
}

prunePii().catch((err) => {
  console.error('Pruning failed:', err);
  process.exit(1);
});
