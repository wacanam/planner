import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { EncounterRecord, HouseholdRecord, VisitRecord } from '@/lib/db/types';

export const APP_DB_NAME = 'ministry-planner';
export const APP_DB_VERSION = 6;

interface PlannerDBSchema extends DBSchema {
  households: {
    key: string;
    value: HouseholdRecord;
  };
  visits: {
    key: string;
    value: VisitRecord;
    indexes: { 'by-household': string };
  };
  encounters: {
    key: string;
    value: EncounterRecord;
    indexes: { 'by-visit': string; 'by-household': string };
  };
}

let dbPromise: Promise<IDBPDatabase<PlannerDBSchema>> | null = null;

export function dispatchDBChange(store: 'households' | 'visits' | 'encounters') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('planner:idb-change', { detail: { store } }));
  }
}

export async function getPlannerDB() {
  if (!dbPromise) {
    dbPromise = openDB<PlannerDBSchema>(APP_DB_NAME, APP_DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('households')) {
          db.createObjectStore('households', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('visits')) {
          const visits = db.createObjectStore('visits', { keyPath: 'id' });
          visits.createIndex('by-household', 'householdId');
        }

        if (!db.objectStoreNames.contains('encounters')) {
          const encounters = db.createObjectStore('encounters', { keyPath: 'id' });
          encounters.createIndex('by-visit', 'visitId');
          encounters.createIndex('by-household', 'householdId');
        }
      },
    });
  }

  return dbPromise;
}
