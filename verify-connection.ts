import 'reflect-metadata';
import 'dotenv/config';
import { AppDataSource } from './src/lib/data-source';

async function verify() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Data Source has been initialized successfully.');

    const result = await AppDataSource.query('SELECT version()');
    console.log('✅ Successfully connected to Neon!');
    console.log('PostgreSQL version:', result[0].version);

    // Test PostGIS
    const postgisResult = await AppDataSource.query(
      "SELECT PostGIS_Version() AS postgis_version"
    );
    console.log('PostGIS version:', postgisResult[0].postgis_version);

    await AppDataSource.destroy();
    console.log('✅ Data Source has been destroyed successfully.');
  } catch (err) {
    console.error('❌ Error during Data Source initialization:', err);
    process.exit(1);
  }
}

verify();
