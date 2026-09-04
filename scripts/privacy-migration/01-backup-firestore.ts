// scripts/privacy-migration/01-backup-firestore.ts

/**
 * Step 1: Full Offline Firestore Backup
 *
 * Downloads an offline snapshot of collections that will be sanitized or pruned:
 * - contacts
 * - memberLocations
 * - encounters
 * - households
 * - visits
 *
 * Saves to backups/firestore-backup-<ISO_TIMESTAMP>.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { getAdminDb } from '../../src/lib/firebase/admin';

async function runBackup() {
  console.log('--- Starting Firestore Privacy Backup ---');
  const db = getAdminDb();

  const collectionsToBackup = [
    'contacts',
    'memberLocations',
    'encounters',
    'households',
    'visits',
    'territories',
    'assignments',
  ];

  const backupData: Record<string, any[]> = {};
  const backupDir = path.join(process.cwd(), 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  for (const collName of collectionsToBackup) {
    try {
      console.log(`Fetching collection: ${collName}...`);
      const snap = await db.collection(collName).get();
      backupData[collName] = snap.docs.map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }));
      console.log(`✓ Fetched ${snap.size} documents from ${collName}`);
    } catch (err: any) {
      console.warn(`! Could not fetch ${collName} (might not exist or be empty):`, err.message);
      backupData[collName] = [];
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `firestore-backup-${timestamp}.json`;
  const filePath = path.join(backupDir, filename);

  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`\n✓ Backup completed successfully!`);
  console.log(`✓ Saved to: ${filePath}`);
}

runBackup().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
