import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { InitialMigration1774971364706 } from '@/migrations/1774971364706-InitialMigration';
import { Phase1CongregationFoundation1780000000000 } from '@/migrations/1780000000000-Phase1CongregationFoundation';
import { User } from '@/entities/User';
import { Territory } from '@/entities/Territory';
import { TerritoryAssignment } from '@/entities/TerritoryAssignment';
import { TerritoryRotation } from '@/entities/TerritoryRotation';
import { TerritoryRequest } from '@/entities/TerritoryRequest';
import { Congregation } from '@/entities/Congregation';
import { CongregationMember } from '@/entities/CongregationMember';
import { Group } from '@/entities/Group';
import { GroupMember } from '@/entities/GroupMember';
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
  ssl: true,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [
    User,
    Territory,
    TerritoryAssignment,
    TerritoryRotation,
    TerritoryRequest,
    Congregation,
    CongregationMember,
    Group,
    GroupMember,
    ServiceGroup,
    Household,
    Visit,
    Encounter,
    OfflineSyncQueue,
  ],
  migrations: [
    InitialMigration1774971364706,
    Phase1CongregationFoundation1780000000000,
  ],
  migrationsRun: false,
  subscribers: [],
});
