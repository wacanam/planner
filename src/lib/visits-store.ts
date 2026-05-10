import {
  createEncounter,
  createHousehold,
  createVisit,
  deleteEncounter,
  deleteHousehold,
  deleteVisit,
  getLocalFirstDB,
  requestLocalFirstSync,
} from '@/lib/local-first';
import type { LocalEncounter, LocalHousehold, LocalVisit } from '@/lib/local-first/types';

export interface PendingWrite<T = unknown> {
  id: string;
  data: T;
  createdAt: string;
}

export async function queueVisit(data: Record<string, unknown>): Promise<string> {
  const visit = await createVisit({
    householdId: String(data.householdId ?? ''),
    assignmentId: (data.assignmentId as string | null | undefined) ?? null,
    outcome: String(data.outcome ?? 'other'),
    householdStatusAfter: (data.householdStatusAfter as string | null | undefined) ?? null,
    duration: (data.duration as number | null | undefined) ?? null,
    literatureLeft: (data.literatureLeft as string | null | undefined) ?? null,
    bibleTopicDiscussed: (data.bibleTopicDiscussed as string | null | undefined) ?? null,
    returnVisitPlanned: Boolean(data.returnVisitPlanned),
    nextVisitDate: (data.nextVisitDate as string | null | undefined) ?? null,
    nextVisitNotes: (data.nextVisitNotes as string | null | undefined) ?? null,
    notes: (data.notes as string | null | undefined) ?? null,
  });
  requestLocalFirstSync();
  return visit.id;
}

export async function getPendingVisits(): Promise<PendingWrite<Record<string, unknown>>[]> {
  const database = await getLocalFirstDB();
  const documents = await database.visits.find().exec();
  return documents
    .map((document) => document.toMutableJSON() as LocalVisit)
    .filter((visit) => visit.syncStatus !== 'synced')
    .map((visit) => ({
      id: visit.id,
      data: visit as unknown as Record<string, unknown>,
      createdAt: visit.createdAt,
    }));
}

export async function clearPendingVisit(id: string): Promise<void> {
  const database = await getLocalFirstDB();
  const document = await database.visits.findOne(id).exec();
  if (document) await document.incrementalPatch({ syncStatus: 'synced' });
}

export async function queueHousehold(data: Record<string, unknown>): Promise<string> {
  const household = await createHousehold({
    address: String(data.address ?? ''),
    houseNumber: (data.houseNumber as string | null | undefined) ?? null,
    unitNumber: (data.unitNumber as string | null | undefined) ?? null,
    streetName: (data.streetName as string | null | undefined) ?? null,
    city: (data.city as string | null | undefined) ?? null,
    postalCode: (data.postalCode as string | null | undefined) ?? null,
    country: (data.country as string | null | undefined) ?? null,
    type: (data.type as string | null | undefined) ?? 'house',
    floor: (data.floor as number | null | undefined) ?? null,
    occupantsCount: (data.occupantsCount as number | null | undefined) ?? null,
    notes: (data.notes as string | null | undefined) ?? null,
    latitude: (data.latitude as string | number | null | undefined) ?? null,
    longitude: (data.longitude as string | number | null | undefined) ?? null,
    territoryId: (data.territoryId as string | null | undefined) ?? null,
    congregationId: (data.congregationId as string | null | undefined) ?? null,
  });
  requestLocalFirstSync();
  return household.id;
}

export async function getPendingHouseholds(): Promise<PendingWrite<Record<string, unknown>>[]> {
  const database = await getLocalFirstDB();
  const documents = await database.households.find().exec();
  return documents
    .map((document) => document.toMutableJSON() as LocalHousehold)
    .filter((household) => household.syncStatus !== 'synced')
    .map((household) => ({
      id: household.id,
      data: household as unknown as Record<string, unknown>,
      createdAt: household.createdAt,
    }));
}

export async function clearPendingHousehold(id: string): Promise<void> {
  const database = await getLocalFirstDB();
  const document = await database.households.findOne(id).exec();
  if (document) await document.incrementalPatch({ syncStatus: 'synced' });
}

export async function registerVisitSync(): Promise<void> {
  requestLocalFirstSync(0);
}

export async function queueEncounter(data: Record<string, unknown>): Promise<string> {
  const encounter = await createEncounter({
    visitId: (data.visitId as string | null | undefined) ?? null,
    householdId: (data.householdId as string | null | undefined) ?? null,
    encounterDate: (data.encounterDate as string | null | undefined) ?? null,
    name: (data.name as string | null | undefined) ?? null,
    gender: (data.gender as string | null | undefined) ?? null,
    ageGroup: (data.ageGroup as string | null | undefined) ?? null,
    role: (data.role as string | null | undefined) ?? null,
    response: String(data.response ?? 'other'),
    languageSpoken: (data.languageSpoken as string | null | undefined) ?? null,
    topicDiscussed: (data.topicDiscussed as string | null | undefined) ?? null,
    literatureAccepted: (data.literatureAccepted as string | null | undefined) ?? null,
    bibleStudyInterest: Boolean(data.bibleStudyInterest),
    returnVisitRequested: Boolean(data.returnVisitRequested),
    nextVisitNotes: (data.nextVisitNotes as string | null | undefined) ?? null,
    notes: (data.notes as string | null | undefined) ?? null,
  });
  requestLocalFirstSync();
  return encounter.id;
}

export async function getPendingEncounters(): Promise<PendingWrite<Record<string, unknown>>[]> {
  const database = await getLocalFirstDB();
  const documents = await database.encounters.find().exec();
  return documents
    .map((document) => document.toMutableJSON() as LocalEncounter)
    .filter((encounter) => encounter.syncStatus !== 'synced')
    .map((encounter) => ({
      id: encounter.id,
      data: encounter as unknown as Record<string, unknown>,
      createdAt: encounter.createdAt,
    }));
}

export async function clearPendingEncounter(id: string): Promise<void> {
  const database = await getLocalFirstDB();
  const document = await database.encounters.findOne(id).exec();
  if (document) await document.incrementalPatch({ syncStatus: 'synced' });
}

export async function queueHouseholdDelete(householdId: string): Promise<string> {
  await deleteHousehold(householdId);
  requestLocalFirstSync();
  return householdId;
}

export async function queueVisitDelete(visitId: string): Promise<string> {
  await deleteVisit(visitId);
  requestLocalFirstSync();
  return visitId;
}

export async function queueEncounterDelete(encounterId: string): Promise<string> {
  await deleteEncounter(encounterId);
  requestLocalFirstSync();
  return encounterId;
}

export function hasPendingVisitsFlag(): boolean {
  return false;
}

export function setPendingVisitsFlag(_value: boolean): void {
  // Pending state is derived from RxDB documents now.
}