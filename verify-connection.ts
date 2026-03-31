import 'reflect-metadata';
import { config } from 'dotenv';
import pg from 'pg';

// Load environment variables from .env.local or .env
config({
  path: ['.env.local', '.env'],
});

async function verify() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  });

  try {
    await client.connect();
    console.log('✅ Data Source has been initialized successfully.');

    const result = await client.query('SELECT version()');
    console.log('✅ Successfully connected to Neon!');
    console.log('PostgreSQL version:', result.rows[0].version);

    // Test PostGIS
    const postgisResult = await client.query('SELECT PostGIS_Version() AS postgis_version');
    console.log('PostGIS version:', postgisResult.rows[0].postgis_version);

    console.log('✅ Data Source has been destroyed successfully.');
  } catch (err) {
    console.error('❌ Error during Data Source initialization:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verify();
