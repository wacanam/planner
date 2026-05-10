import { dispatchDBChange, getPlannerDB } from '@/lib/db/indexeddb';
import type { VisitRecord } from '@/lib/db/types';

interface CreateVisitInput {
  householdId: string;
  outcome: string;
  notes?: string | null;
}

export async function createVisit(input: CreateVisitInput): Promise<VisitRecord> {
  const db = await getPlannerDB();
  const now = new Date().toISOString();

  const record: VisitRecord = {
    id: crypto.randomUUID(),
    householdId: input.householdId,
    outcome: input.outcome,
    notes: input.notes ?? null,
    visitDate: now,
    createdAt: now,
    updatedAt: now,
  };

  await db.put('visits', record);
  dispatchDBChange('visits');
  return record;
}

export async function getVisitsByHousehold(householdId: string): Promise<VisitRecord[]> {
  const db = await getPlannerDB();
  return db.getAllFromIndex('visits', 'by-household', householdId);
}
