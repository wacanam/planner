import { addRxPlugin, createRxDatabase } from 'rxdb';
import { disableWarnings, RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import {
  avatarUploadSchema,
  encounterSchema,
  householdSchema,
  visitSchema,
} from './schemas';
import type { LocalFirstCollections, LocalFirstDatabase } from './types';

export const LOCAL_FIRST_DB_NAME = 'ministry_planner_local_first';

let databasePromise: Promise<LocalFirstDatabase> | null = null;
let pluginsAdded = false;

function addPluginsOnce() {
  if (pluginsAdded) return;
  pluginsAdded = true;

  if (process.env.NODE_ENV !== 'production') {
    addRxPlugin(RxDBDevModePlugin);
    disableWarnings();
  }
}

export async function getLocalFirstDB(): Promise<LocalFirstDatabase> {
  if (typeof window === 'undefined') {
    throw new Error('Local-first database is only available in the browser');
  }

  if (!databasePromise) {
    databasePromise = createLocalFirstDatabase();
  }

  return databasePromise;
}

async function createLocalFirstDatabase(): Promise<LocalFirstDatabase> {
  addPluginsOnce();

  const database = await createRxDatabase<LocalFirstCollections>({
    name: LOCAL_FIRST_DB_NAME,
    storage: wrappedValidateAjvStorage({ storage: getRxStorageDexie() }),
    multiInstance: true,
    eventReduce: true,
    ignoreDuplicate: true,
  });

  await database.addCollections({
    households: { schema: householdSchema },
    visits: { schema: visitSchema },
    encounters: { schema: encounterSchema },
    avataruploads: { schema: avatarUploadSchema },
  });

  return database as LocalFirstDatabase;
}