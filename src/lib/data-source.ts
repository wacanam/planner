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
  entities: ['src/entities/**/*.ts'],
  migrations: ['src/migrations/**/*.js'], // Use .js migrations
  migrationsRun: true,
  subscribers: [],
  extra: {
    // PostGIS support
    options: '-c search_path=public',
  },
});
