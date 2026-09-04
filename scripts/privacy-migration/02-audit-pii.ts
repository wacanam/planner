// scripts/privacy-migration/02-audit-pii.ts

/**
 * Step 2: PII Audit & Dry-Run Script
 *
 * Inspects Firestore documents across the database and generates a report
 * of personal identifiable information (PII) to be pruned or sanitized.
 *
 * Does NOT modify or delete any data.
 */

import { getAdminDb } from '../../src/lib/firebase/admin';

async function auditPii() {
  console.log('====================================================');
  console.log('     FIRESTORE DATA PRIVACY & MINIMIZATION AUDIT    ');
  console.log('====================================================\n');

  const db = getAdminDb();

  // 1. Audit Contacts
  console.log('1. Auditing "contacts" collection (to be pruned):');
  try {
    const contactsSnap = await db.collection('contacts').get();
    console.log(`   - Total contact documents found: ${contactsSnap.size}`);
    let withPhones = 0;
    let withEmails = 0;
    let withNames = 0;
    for (const doc of contactsSnap.docs) {
      const data = doc.data();
      if (data.name) withNames++;
      if (data.phoneNumber) withPhones++;
      if (data.email) withEmails++;
    }
    console.log(`   - With resident names: ${withNames}`);
    console.log(`   - With phone numbers: ${withPhones}`);
    console.log(`   - With emails: ${withEmails}`);
  } catch (err: any) {
    console.log(`   - "contacts" collection check: ${err.message}`);
  }

  // 2. Audit Member Locations
  console.log('\n2. Auditing "memberLocations" collection (to be pruned):');
  try {
    const locSnap = await db.collection('memberLocations').get();
    console.log(`   - Total member location documents found: ${locSnap.size}`);
    console.log('   - (Live location broadcasts to be removed from cloud)');
  } catch (err: any) {
    console.log(`   - "memberLocations" collection check: ${err.message}`);
  }

  // 3. Audit Encounters
  console.log('\n3. Auditing "encounters" collection:');
  try {
    const encountersSnap = await db.collection('encounters').get();
    console.log(`   - Total encounter documents found: ${encountersSnap.size}`);
  } catch (err: any) {
    console.log(`   - "encounters" check: ${err.message}`);
  }

  // 4. Audit Households for PII Fields
  console.log('\n4. Auditing "households" collection for PII:');
  try {
    const householdsSnap = await db.collection('households').get();
    console.log(`   - Total households found: ${householdsSnap.size}`);

    let withNames = 0;
    let withOccupantsCount = 0;
    let withNotes = 0;
    let withLwpNotes = 0;
    let dncCount = 0;

    for (const doc of householdsSnap.docs) {
      const data = doc.data();
      if (data.name) withNames++;
      if (data.occupantsCount !== undefined && data.occupantsCount !== null) withOccupantsCount++;
      if (data.notes) withNotes++;
      if (data.lwpNotes) withLwpNotes++;
      if (data.status === 'do_not_visit' || data.status === 'do_not_call') dncCount++;
    }

    console.log(`   - Households with resident/family name: ${withNames} (will be pruned)`);
    console.log(`   - Households with occupant counts: ${withOccupantsCount} (will be pruned)`);
    console.log(`   - Households with freeform notes: ${withNotes} (will be converted to accessNotes)`);
    console.log(`   - Households with LWP/phone notes: ${withLwpNotes} (will be pruned)`);
    console.log(`   - Do Not Call (DNC) households: ${dncCount} (will be sanitized to address + date only)`);
  } catch (err: any) {
    console.log(`   - "households" check: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log('Audit completed. No changes were made to the database.');
  console.log('====================================================');
}

auditPii().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
