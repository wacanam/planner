import { getPlannerDB, dispatchDBChange } from '@/lib/db/indexeddb';
import type { HouseholdRecord } from '@/lib/db/types';

interface CreateHouseholdInput {
  name: string;
  address: string;
  membersCount: number;
  notes?: string | null;
  latitude: number;
  longitude: number;
  territoryId?: string | null;
  congregationId?: string | null;
}

export async function createHousehold(input: CreateHouseholdInput): Promise<HouseholdRecord> {
  const db = await getPlannerDB();
  const now = new Date().toISOString();
  const record: HouseholdRecord = {
    id: crypto.randomUUID(),
    name: input.name,
    address: input.address,
    membersCount: input.membersCount,
    notes: input.notes ?? null,
    latitude: input.latitude,
    longitude: input.longitude,
    territoryId: input.territoryId ?? null,
    congregationId: input.congregationId ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db.put('households', record);
  dispatchDBChange('households');
  return record;
}

export async function upsertHousehold(record: HouseholdRecord): Promise<void> {
  const db = await getPlannerDB();
  await db.put('households', { ...record, updatedAt: new Date().toISOString() });
  dispatchDBChange('households');
}

export async function bulkUpsertHouseholds(records: HouseholdRecord[]): Promise<void> {
  const db = await getPlannerDB();
  const tx = db.transaction('households', 'readwrite');
  const now = new Date().toISOString();
  for (const record of records) {
    await tx.store.put({ ...record, updatedAt: now });
  }
  await tx.done;
  dispatchDBChange('households');
}

export async function getAllHouseholds(): Promise<HouseholdRecord[]> {
  const db = await getPlannerDB();
  return db.getAll('households');
}

export async function getHouseholdById(id: string): Promise<HouseholdRecord | undefined> {
  const db = await getPlannerDB();
  return db.get('households', id);
}

export async function deleteHousehold(id: string): Promise<void> {
  const db = await getPlannerDB();
  await db.delete('households', id);
  dispatchDBChange('households');
}
