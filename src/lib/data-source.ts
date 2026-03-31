import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

// Load environment variables from .env.local or .env
config({
  path: ['.env.local', '.env'],
});

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: true, // Enable SSL for Neon
  synchronize: false, // Use migrations in production
  logging: process.env.NODE_ENV === 'development',
  entities: ['src/**/*.ts'],
  migrations: ['src/migrations/**/*.js'], // Use .js migrations
  migrationsRun: true,
  subscribers: [],
  // Note: Do NOT use extra.options with pooled connections (Vercel)
  // PgBouncer doesn't support search_path parameter in startup
  // PostGIS still works without explicit search_path in pooled mode
});
