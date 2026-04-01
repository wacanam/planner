import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { Congregation } from './src/entities/Congregation';
import { User } from './src/entities/User';
import { Territory } from './src/entities/Territory';
import { TerritoryAssignment } from './src/entities/TerritoryAssignment';
import { TerritoryRotation } from './src/entities/TerritoryRotation';
import { TerritoryRequest } from './src/entities/TerritoryRequest';
import { CongregationMember } from './src/entities/CongregationMember';
import { Group } from './src/entities/Group';
import { GroupMember } from './src/entities/GroupMember';
import { ServiceGroup } from './src/entities/ServiceGroup';
import { Household } from './src/entities/Household';
import { Visit } from './src/entities/Visit';
import { Encounter } from './src/entities/Encounter';
import { OfflineSyncQueue } from './src/entities/OfflineSyncQueue';

// Load environment variables
config({
  path: ['.env.local', '.env'],
});

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
    TerritoryRotation,
    TerritoryRequest,
    CongregationMember,
    Group,
    GroupMember,
    ServiceGroup,
    Household,
    Visit,
    Encounter,
    OfflineSyncQueue,
  ],
  migrations: ['src/migrations/**/*.{js,ts}'],
  subscribers: [],
  extra:
    process.env.DATABASE_URL?.includes('-pooler') ?
      {}
      : { options: '-c search_path=public' },
});
