import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { Location } from './src/entities/Location';
import { Zone } from './src/entities/Zone';
import { Route } from './src/entities/Route';
import { Task } from './src/entities/Task';

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
  entities: [Location, Zone, Route, Task],
  migrations: ['src/migrations/**/*.{js,ts}'],
  subscribers: [],
  extra: {
    options: '-c search_path=public',
  },
});
