import type { RxDocument } from 'rxdb';
import { getLocalFirstDB } from './database';
import { notifyLocalFirstChange } from './events';
import { isoDate, nowIso, nullableNumber, nullableString, pendingStatus } from './shared';
import type { LocalHousehold, LocalVisit } from './types';
import type { Visit } from '@/types/api';

export interface CreateVisitInput {
  householdId: string;
  assignmentId?: string | null;
  outcome: string;
  householdStatusAfter?: string | null;
  duration?: number | null;
  literatureLeft?: string | null;
  bibleTopicDiscussed?: string | null;
  returnVisitPlanned?: boolean | null;
  nextVisitDate?: string | null;
  nextVisitNotes?: string | null;
  notes?: string | null;
}

type VisitDocument = RxDocument<LocalVisit>;

export function toVisitView(
  record: LocalVisit,
  household?: LocalHousehold | null
): Visit & { _pending?: boolean } {
  return {
    id: record.id,
    userId: record.userId ?? '',
    householdId: record.householdId,
    assignmentId: record.assignmentId,
    visitDate: record.visitDate,
    outcome: record.outcome,
    householdStatusBefore: record.householdStatusBefore,
    householdStatusAfter: record.householdStatusAfter,
    duration: record.duration,
    literatureLeft: record.literatureLeft,
    bibleTopicDiscussed: record.bibleTopicDiscussed,
    returnVisitPlanned: record.returnVisitPlanned,
    nextVisitDate: record.nextVisitDate,
    nextVisitNotes: record.nextVisitNotes,
    notes: record.notes,
    syncStatus: record.syncStatus === 'synced' ? 'synced' : 'pending',
    offlineCreated: record.offlineCreated,
    syncedAt: record.lastSyncedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    householdAddress: household?.address,
    householdCity: household?.city ?? undefined,
    _pending: pendingStatus(record.syncStatus),
  };
}

export function localVisitFromApi(visit: Visit, existingId?: string): LocalVisit {
  const now = nowIso();
  return {
    id: existingId ?? visit.id,
    serverId: visit.id,
    userId: visit.userId ?? null,
    householdId: visit.householdId,
    householdServerId: visit.householdId,
    assignmentId: visit.assignmentId ?? null,
    visitDate: isoDate(visit.visitDate, now),
    outcome: visit.outcome,
    householdStatusBefore: visit.householdStatusBefore ?? null,
    householdStatusAfter: visit.householdStatusAfter ?? null,
    duration: nullableNumber(visit.duration),
    literatureLeft: visit.literatureLeft ?? null,
    bibleTopicDiscussed: visit.bibleTopicDiscussed ?? null,
    returnVisitPlanned: Boolean(visit.returnVisitPlanned),
    nextVisitDate: visit.nextVisitDate ?? null,
    nextVisitNotes: visit.nextVisitNotes ?? null,
    notes: visit.notes ?? null,
    syncStatus: 'synced',
    syncError: null,
    offlineCreated: Boolean(visit.offlineCreated),
    deletedAt: null,
    lastSyncedAt: now,
    createdAt: isoDate(visit.createdAt, now),
    updatedAt: isoDate(visit.updatedAt, now),
  };
}

export async function createVisit(input: CreateVisitInput): Promise<LocalVisit> {
  const database = await getLocalFirstDB();
  const now = nowIso();
  const household = await database.households.findOne(input.householdId).exec();
  const householdData = household?.toMutableJSON() as LocalHousehold | undefined;
  const record: LocalVisit = {
    id: crypto.randomUUID(),
    serverId: null,
    userId: null,
    householdId: input.householdId,
    householdServerId: householdData?.serverId ?? null,
    assignmentId: nullableString(input.assignmentId),
    visitDate: now,
    outcome: input.outcome,
    householdStatusBefore: householdData?.status ?? null,
    householdStatusAfter: nullableString(input.householdStatusAfter),
    duration: nullableNumber(input.duration),
    literatureLeft: nullableString(input.literatureLeft),
    bibleTopicDiscussed: nullableString(input.bibleTopicDiscussed),
    returnVisitPlanned: Boolean(input.returnVisitPlanned),
    nextVisitDate: nullableString(input.nextVisitDate),
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

  await database.visits.insert(record);

  if (household) {
    await household.incrementalPatch({
      lastVisitDate: record.visitDate,
      lastVisitOutcome: record.outcome,
      status: record.householdStatusAfter ?? householdData?.status ?? 'new',
      syncStatus: householdData?.syncStatus === 'synced' ? 'pending' : householdData?.syncStatus,
      updatedAt: now,
    });
  }

  notifyLocalFirstChange();
  return record;
}

export async function applyRemoteVisits(visits: Visit[]): Promise<number> {
  const database = await getLocalFirstDB();
  let applied = 0;

  for (const visit of visits) {
    const household = await database.households
      .findOne({ selector: { serverId: visit.householdId } })
      .exec();
    const existingByServerId = await database.visits
      .findOne({ selector: { serverId: visit.id } })
      .exec();
    const existingById = existingByServerId ? null : await database.visits.findOne(visit.id).exec();
    const existing = existingByServerId ?? existingById;
    const existingData = existing?.toMutableJSON() as LocalVisit | undefined;

    if (existingData?.deletedAt || (existingData?.syncStatus && existingData.syncStatus !== 'synced')) {
      continue;
    }

    const local = localVisitFromApi(visit, existingData?.id);
    await database.visits.incrementalUpsert({
      ...local,
      householdId: household?.primary ?? visit.householdId,
      householdServerId: visit.householdId,
    });
    applied += 1;
  }

  if (applied > 0) notifyLocalFirstChange();
  return applied;
}

export async function getVisitsByHousehold(householdId: string): Promise<LocalVisit[]> {
  const database = await getLocalFirstDB();
  const documents = await database.visits.find({ selector: { householdId } }).exec();
  return documents
    .map((document) => document.toMutableJSON() as LocalVisit)
    .filter((visit) => !visit.deletedAt)
    .sort((left, right) => right.visitDate.localeCompare(left.visitDate));
}

export async function deleteVisit(id: string): Promise<void> {
  const database = await getLocalFirstDB();
  const document = await database.visits.findOne(id).exec();
  if (!document) return;
  await document.incrementalPatch({
    deletedAt: nowIso(),
    syncStatus: 'pending',
    syncError: null,
    updatedAt: nowIso(),
  });
  notifyLocalFirstChange();
}

export function visitPayload(record: LocalVisit, householdServerId: string) {
  return {
    clientId: record.id,
    householdId: householdServerId,
    assignmentId: record.assignmentId,
    outcome: record.outcome,
    householdStatusAfter: record.householdStatusAfter,
    duration: record.duration,
    literatureLeft: record.literatureLeft,
    bibleTopicDiscussed: record.bibleTopicDiscussed,
    returnVisitPlanned: record.returnVisitPlanned,
    nextVisitDate: record.nextVisitDate,
    nextVisitNotes: record.nextVisitNotes,
    notes: record.notes,
  };
}

export async function markVisitSynced(document: VisitDocument, visit: Visit): Promise<void> {
  const local = localVisitFromApi(visit, document.primary);
  await document.incrementalPatch({
    ...local,
    id: document.primary,
    householdId: (document.toMutableJSON() as LocalVisit).householdId,
    householdServerId: visit.householdId,
    serverId: visit.id,
    syncStatus: 'synced',
    syncError: null,
    offlineCreated: false,
    deletedAt: null,
    lastSyncedAt: nowIso(),
  });
}