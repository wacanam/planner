import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { InitialMigration1774971364706 } from '@/migrations/1774971364706-InitialMigration';
import { User } from '@/entities/User';
import { Territory } from '@/entities/Territory';
import { TerritoryAssignment } from '@/entities/TerritoryAssignment';
import { TerritoryRotation } from '@/entities/TerritoryRotation';
import { Congregation } from '@/entities/Congregation';
import { ServiceGroup } from '@/entities/ServiceGroup';
import { Household } from '@/entities/Household';
import { Visit } from '@/entities/Visit';
import { Encounter } from '@/entities/Encounter';
import { OfflineSyncQueue } from '@/entities/OfflineSyncQueue';

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
  entities: [
    User,
    Territory,
    TerritoryAssignment,
    TerritoryRotation,
    Congregation,
    ServiceGroup,
    Household,
    Visit,
    Encounter,
    OfflineSyncQueue,
  ],
  migrations: [
    InitialMigration1774971364706
  ],
  migrationsRun: false, // Don't auto-run migrations (handled by Vercel workflow)
  subscribers: [],
  // Note: Do NOT use extra.options with pooled connections (Vercel)
  // PgBouncer doesn't support search_path parameter in startup
  // PostGIS still works without explicit search_path in pooled mode
});
