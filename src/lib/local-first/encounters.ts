import type { RxDocument } from 'rxdb';
import { getLocalFirstDB } from './database';
import { notifyLocalFirstChange } from './events';
import { isoDate, nowIso, nullableString, pendingStatus } from './shared';
import type { LocalEncounter, LocalHousehold, LocalVisit } from './types';
import type { Encounter } from '@/types/api';

export interface CreateEncounterInput {
  visitId?: string | null;
  householdId?: string | null;
  encounterDate?: string | null;
  name?: string | null;
  gender?: string | null;
  ageGroup?: string | null;
  role?: string | null;
  response: string;
  languageSpoken?: string | null;
  topicDiscussed?: string | null;
  literatureAccepted?: string | null;
  bibleStudyInterest?: boolean | null;
  returnVisitRequested?: boolean | null;
  nextVisitNotes?: string | null;
  notes?: string | null;
}

type EncounterDocument = RxDocument<LocalEncounter>;

export function toEncounterView(
  record: LocalEncounter,
  household?: LocalHousehold | null,
  visit?: LocalVisit | null
): Encounter & { _pending?: boolean } {
  return {
    id: record.id,
    visitId: record.visitId,
    householdId: record.householdId,
    userId: record.userId ?? '',
    name: record.name,
    gender: record.gender,
    ageGroup: record.ageGroup,
    role: record.role,
    response: record.response,
    languageSpoken: record.languageSpoken,
    topicDiscussed: record.topicDiscussed,
    literatureAccepted: record.literatureAccepted,
    bibleStudyInterest: record.bibleStudyInterest,
    returnVisitRequested: record.returnVisitRequested,
    nextVisitNotes: record.nextVisitNotes,
    notes: record.notes,
    syncStatus: record.syncStatus === 'synced' ? 'synced' : 'pending',
    offlineCreated: record.offlineCreated,
    syncedAt: record.lastSyncedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    householdAddress: household?.address ?? null,
    householdCity: household?.city ?? null,
    visitDate: visit?.visitDate ?? record.encounterDate,
    visitOutcome: visit?.outcome ?? null,
    _pending: pendingStatus(record.syncStatus),
  };
}

export function localEncounterFromApi(encounter: Encounter, existingId?: string): LocalEncounter {
  const now = nowIso();
  const encounterDate = encounter.visitDate ?? encounter.createdAt;
  return {
    id: existingId ?? encounter.id,
    serverId: encounter.id,
    userId: encounter.userId ?? null,
    visitId: encounter.visitId,
    visitServerId: encounter.visitId,
    householdId: encounter.householdId,
    householdServerId: encounter.householdId,
    encounterDate: isoDate(encounterDate, now),
    name: encounter.name ?? null,
    gender: encounter.gender ?? null,
    ageGroup: encounter.ageGroup ?? null,
    role: encounter.role ?? null,
    response: encounter.response,
    languageSpoken: encounter.languageSpoken ?? null,
    topicDiscussed: encounter.topicDiscussed ?? null,
    literatureAccepted: encounter.literatureAccepted ?? null,
    bibleStudyInterest: Boolean(encounter.bibleStudyInterest),
    returnVisitRequested: Boolean(encounter.returnVisitRequested),
    nextVisitNotes: encounter.nextVisitNotes ?? null,
    notes: encounter.notes ?? null,
    syncStatus: 'synced',
    syncError: null,
    offlineCreated: Boolean(encounter.offlineCreated),
    deletedAt: null,
    lastSyncedAt: now,
    createdAt: isoDate(encounter.createdAt, now),
    updatedAt: isoDate(encounter.updatedAt, now),
  };
}

export async function createEncounter(input: CreateEncounterInput): Promise<LocalEncounter> {
  const database = await getLocalFirstDB();
  const now = nowIso();
  const visit = input.visitId ? await database.visits.findOne(input.visitId).exec() : null;
  const visitData = visit?.toMutableJSON() as LocalVisit | undefined;
  const householdId = nullableString(input.householdId) ?? visitData?.householdId ?? null;
  const household = householdId ? await database.households.findOne(householdId).exec() : null;
  const householdData = household?.toMutableJSON() as LocalHousehold | undefined;

  const record: LocalEncounter = {
    id: crypto.randomUUID(),
    serverId: null,
    userId: null,
    visitId: nullableString(input.visitId),
    visitServerId: visitData?.serverId ?? null,
    householdId,
    householdServerId: householdData?.serverId ?? null,
    encounterDate: nullableString(input.encounterDate) ?? now,
    name: nullableString(input.name),
    gender: nullableString(input.gender),
    ageGroup: nullableString(input.ageGroup),
    role: nullableString(input.role),
    response: input.response,
    languageSpoken: nullableString(input.languageSpoken),
    topicDiscussed: nullableString(input.topicDiscussed),
    literatureAccepted: nullableString(input.literatureAccepted),
    bibleStudyInterest: Boolean(input.bibleStudyInterest),
    returnVisitRequested: Boolean(input.returnVisitRequested),
    nextVisitNotes: nullableString(input.nextVisitNotes),
    notes: nullableString(input.notes),
    syncStatus: 'pending',
    syncError: null,
    offlineCreated: true,
    deletedAt: null,
    lastSyncedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await database.encounters.insert(record);
  notifyLocalFirstChange();
  return record;
}

export async function applyRemoteEncounters(encounters: Encounter[]): Promise<number> {
  const database = await getLocalFirstDB();
  let applied = 0;

  for (const encounter of encounters) {
    const localHousehold = encounter.householdId
      ? await database.households.findOne({ selector: { serverId: encounter.householdId } }).exec()
      : null;
    const localVisit = encounter.visitId
      ? await database.visits.findOne({ selector: { serverId: encounter.visitId } }).exec()
      : null;
    const existingByServerId = await database.encounters
      .findOne({ selector: { serverId: encounter.id } })
      .exec();
    const existingById = existingByServerId
      ? null
      : await database.encounters.findOne(encounter.id).exec();
    const existing = existingByServerId ?? existingById;
    const existingData = existing?.toMutableJSON() as LocalEncounter | undefined;

    if (existingData?.deletedAt || (existingData?.syncStatus && existingData.syncStatus !== 'synced')) {
      continue;
    }

    const local = localEncounterFromApi(encounter, existingData?.id);
    await database.encounters.incrementalUpsert({
      ...local,
      householdId: localHousehold?.primary ?? encounter.householdId,
      householdServerId: encounter.householdId,
      visitId: localVisit?.primary ?? encounter.visitId,
      visitServerId: encounter.visitId,
    });
    applied += 1;
  }

  if (applied > 0) notifyLocalFirstChange();
  return applied;
}

export async function getEncountersByVisit(visitId: string): Promise<LocalEncounter[]> {
  const database = await getLocalFirstDB();
  const documents = await database.encounters.find({ selector: { visitId } }).exec();
  return documents
    .map((document) => document.toMutableJSON() as LocalEncounter)
    .filter((encounter) => !encounter.deletedAt)
    .sort((left, right) => right.encounterDate.localeCompare(left.encounterDate));
}

export async function getEncountersByHousehold(householdId: string): Promise<LocalEncounter[]> {
  const database = await getLocalFirstDB();
  const documents = await database.encounters.find({ selector: { householdId } }).exec();
  return documents
    .map((document) => document.toMutableJSON() as LocalEncounter)
    .filter((encounter) => !encounter.deletedAt)
    .sort((left, right) => right.encounterDate.localeCompare(left.encounterDate));
}

export async function deleteEncounter(id: string): Promise<void> {
  const database = await getLocalFirstDB();
  const document = await database.encounters.findOne(id).exec();
  if (!document) return;
  await document.incrementalPatch({
    deletedAt: nowIso(),
    syncStatus: 'pending',
    syncError: null,
    updatedAt: nowIso(),
  });
  notifyLocalFirstChange();
}

export function encounterPayload(
  record: LocalEncounter,
  householdServerId: string | null,
  visitServerId: string | null
) {
  return {
    clientId: record.id,
    visitId: visitServerId,
    householdId: householdServerId,
    encounterDate: record.encounterDate,
    name: record.name,
    gender: record.gender,
    ageGroup: record.ageGroup,
    role: record.role,
    response: record.response,
    languageSpoken: record.languageSpoken,
    topicDiscussed: record.topicDiscussed,
    literatureAccepted: record.literatureAccepted,
    bibleStudyInterest: record.bibleStudyInterest,
    returnVisitRequested: record.returnVisitRequested,
    nextVisitNotes: record.nextVisitNotes,
    notes: record.notes,
  };
}

export async function markEncounterSynced(
  document: EncounterDocument,
  encounter: Encounter
): Promise<void> {
  const current = document.toMutableJSON() as LocalEncounter;
  const local = localEncounterFromApi(encounter, document.primary);
  await document.incrementalPatch({
    ...local,
    id: document.primary,
    householdId: current.householdId,
    householdServerId: encounter.householdId,
    visitId: current.visitId,
    visitServerId: encounter.visitId,
    serverId: encounter.id,
    syncStatus: 'synced',
    syncError: null,
    offlineCreated: false,
    deletedAt: null,
    lastSyncedAt: nowIso(),
  });
}