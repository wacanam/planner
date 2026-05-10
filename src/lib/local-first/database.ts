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

interface LocalFirstGlobalState {
  __plannerLocalFirstDatabasePromise?: Promise<LocalFirstDatabase> | null;
  __plannerLocalFirstPluginsAdded?: boolean;
}

const localFirstGlobal = globalThis as typeof globalThis & LocalFirstGlobalState;

function isDevelopmentMode() {
  return process.env.NODE_ENV !== 'production';
}

function addPluginsOnce() {
  if (localFirstGlobal.__plannerLocalFirstPluginsAdded) return;
  localFirstGlobal.__plannerLocalFirstPluginsAdded = true;

  if (isDevelopmentMode()) {
    addRxPlugin(RxDBDevModePlugin);
    disableWarnings();
  }
}

export async function getLocalFirstDB(): Promise<LocalFirstDatabase> {
  if (typeof window === 'undefined') {
    throw new Error('Local-first database is only available in the browser');
  }

  if (!localFirstGlobal.__plannerLocalFirstDatabasePromise) {
    localFirstGlobal.__plannerLocalFirstDatabasePromise = createLocalFirstDatabase().catch((error) => {
      localFirstGlobal.__plannerLocalFirstDatabasePromise = null;
      throw error;
    });
  }

  return localFirstGlobal.__plannerLocalFirstDatabasePromise;
}

async function createLocalFirstDatabase(): Promise<LocalFirstDatabase> {
  addPluginsOnce();

  const database = await createRxDatabase<LocalFirstCollections>({
    name: LOCAL_FIRST_DB_NAME,
    storage: wrappedValidateAjvStorage({ storage: getRxStorageDexie() }),
    multiInstance: true,
    eventReduce: true,
    closeDuplicates: isDevelopmentMode(),
  });

  await database.addCollections({
    households: { schema: householdSchema },
    visits: { schema: visitSchema },
    encounters: { schema: encounterSchema },
    avataruploads: { schema: avatarUploadSchema },
  });

  return database as LocalFirstDatabase;
}