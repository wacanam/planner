import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { Congregation } from './src/entities/Congregation';
import { User } from './src/entities/User';
import { Territory } from './src/entities/Territory';
import { TerritoryAssignment } from './src/entities/TerritoryAssignment';
import { ServiceGroup } from './src/entities/ServiceGroup';
import { Household } from './src/entities/Household';
import { Visit } from './src/entities/Visit';
import { Encounter } from './src/entities/Encounter';
import { TerritoryRotation } from './src/entities/TerritoryRotation';
import { OfflineSyncQueue } from './src/entities/OfflineSyncQueue';

// Load environment variables
config({
  path: ['.env.local', '.env'],
});

// Standalone DataSource for CLI operations (migrations)
export const CliDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: true,
  synchronize: false,
  logging: false,
  entities: [
    Congregation,
    User,
    Territory,
    TerritoryAssignment,
    ServiceGroup,
    Household,
    Visit,
    Encounter,
    TerritoryRotation,
    OfflineSyncQueue,
  ],
  migrations: ['src/migrations/**/*.{js,ts}'],
  subscribers: [],
  extra: {
    options: '-c search_path=public',
  },
});
