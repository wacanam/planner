import 'reflect-metadata';
import { config } from 'dotenv';
import { CliDataSource } from './cli-data-source';

config({ path: ['.env.local', '.env'] });

async function runMigrations() {
  try {
    // Initialize the data source (connects to database)
    await CliDataSource.initialize();
    console.log('✅ Connected to Neon Postgres');

    // Run pending migrations
    console.log('\n🔄 Running migrations...\n');
    const migrations = await CliDataSource.runMigrations();

    if (migrations.length === 0) {
      console.log('ℹ️  No pending migrations');
    } else {
      console.log(`✅ Successfully executed ${migrations.length} migration(s)`);
      migrations.forEach((migration) => {
        console.log(`  ✓ ${migration.name}`);
      });
    }

    await CliDataSource.destroy();
    console.log('\n✅ All migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigrations();
