import { dispatchDBChange, getPlannerDB } from '@/lib/db/indexeddb';
import type { EncounterRecord } from '@/lib/db/types';

interface CreateEncounterInput {
  visitId: string;
  householdId: string;
  name: string;
  response: string;
  notes?: string | null;
}

export async function createEncounter(input: CreateEncounterInput): Promise<EncounterRecord> {
  const db = await getPlannerDB();
  const now = new Date().toISOString();
  const record: EncounterRecord = {
    id: crypto.randomUUID(),
    visitId: input.visitId,
    householdId: input.householdId,
    name: input.name,
    response: input.response,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db.put('encounters', record);
  dispatchDBChange('encounters');
  return record;
}

export async function getEncountersByVisit(visitId: string): Promise<EncounterRecord[]> {
  const db = await getPlannerDB();
  return db.getAllFromIndex('encounters', 'by-visit', visitId);
}

export async function getEncountersByHousehold(householdId: string): Promise<EncounterRecord[]> {
  const db = await getPlannerDB();
  return db.getAllFromIndex('encounters', 'by-household', householdId);
}
