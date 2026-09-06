// scripts/sanitize-privacy.ts

/**
 * CLI Script: Data Privacy & S-13 Territory Record Sanitizer
 *
 * Scans Firestore collections for personal data (family/resident names in addresses,
 * telephone numbers in notes, spiritual topics/literature placed) and prunes or sanitizes them.
 *
 * Usage:
 *   bun run scripts/sanitize-privacy.ts --dry-run
 *   bun run scripts/sanitize-privacy.ts --execute
 *   bun run scripts/sanitize-privacy.ts --execute --congregation <congregationId>
 */

import { runPrivacySanitizer } from '../src/lib/privacy/privacy-sanitizer';

async function main() {
  const args = process.argv.slice(2);
  const isExecute = args.includes('--execute');
  const mode = isExecute ? 'execute' : 'dry_run';

  let congregationId: string | null = null;
  const congIdx = args.indexOf('--congregation');
  if (congIdx !== -1 && args[congIdx + 1]) {
    congregationId = args[congIdx + 1];
  }

  console.log('================================================================');
  console.log(`     DATA PRIVACY & S-13 SANITIZER [Mode: ${mode.toUpperCase()}]`);
  console.log('================================================================\n');

  if (!isExecute) {
    console.log('🔍 Running in DRY RUN mode. No changes will be written to database.');
    console.log('   Pass --execute to commit changes to Firestore.\n');
  } else {
    console.log('⚠️  RUNNING IN EXECUTE MODE. Firestore records will be permanently altered.\n');
  }

  if (congregationId) {
    console.log(`Targeting Congregation ID: ${congregationId}\n`);
  } else {
    console.log('Targeting: ALL CONGREGATIONS\n');
  }

  const startTime = Date.now();
  const report = await runPrivacySanitizer({
    mode,
    congregationId,
    targets: ['households', 'visits', 'encounters', 'territories', 'legacy'],
  });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('----------------------------------------------------------------');
  console.log('                       SANITIZATION RESULTS                      ');
  console.log('----------------------------------------------------------------');
  console.log(`- Households Scanned:       ${report.householdsScanned}`);
  console.log(`- Households Needing Fix:   ${report.householdsSanitized}`);
  console.log(`- Visits Scanned:           ${report.visitsScanned}`);
  console.log(`- Visits Needing Fix:       ${report.visitsSanitized}`);
  console.log(`- Encounters Scanned:       ${report.encountersScanned}`);
  console.log(`- Encounters Needing Fix:   ${report.encountersSanitized}`);
  console.log(`- Territories Scanned:      ${report.territoriesScanned}`);
  console.log(`- Territories Needing Fix:  ${report.territoriesSanitized}`);
  console.log(`- Legacy Contacts Pruned:   ${report.contactsDeleted}`);
  console.log(`- Member Locations Pruned:  ${report.memberLocationsDeleted}`);
  console.log(`- Execution Time:           ${elapsed}s\n`);

  if (report.sampleChanges.length > 0) {
    console.log('Sample Changes Detected:');
    for (const sample of report.sampleChanges.slice(0, 10)) {
      console.log(`  [${sample.collection}] doc id: ${sample.id}`);
      for (const item of sample.summary) {
        console.log(`    ↳ ${item}`);
      }
    }
    if (report.sampleChanges.length > 10) {
      console.log(`  ... and ${report.sampleChanges.length - 10} more records.`);
    }
    console.log('');
  }

  console.log('================================================================');
  console.log(
    isExecute
      ? '✓ Sanitization successfully applied to Firestore.'
      : '✓ Audit complete. Run with --execute to apply these changes.'
  );
  console.log('================================================================');
}

main().catch((err) => {
  console.error('Fatal error running privacy sanitizer:', err);
  process.exit(1);
});
