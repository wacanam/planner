import {
  createEncounter,
  createHousehold,
  createVisit,
  deleteEncounter,
  deleteHousehold,
  deleteVisit,
  updateEncounter,
  updateHousehold,
  updateVisit,
  type CreateEncounterInput,
  type CreateHouseholdInput,
  type CreateVisitInput,
} from '@/lib/local-first';

export async function saveVisitRecord(data: Record<string, unknown>): Promise<string> {
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
  return visit.id;
}

export async function saveHouseholdRecord(data: Record<string, unknown>): Promise<string> {
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
  return household.id;
}

export async function saveEncounterRecord(data: Record<string, unknown>): Promise<string> {
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
  return encounter.id;
}

export async function deleteHouseholdRecord(householdId: string): Promise<string> {
  await deleteHousehold(householdId);
  return householdId;
}

export async function deleteVisitRecord(visitId: string): Promise<string> {
  await deleteVisit(visitId);
  return visitId;
}

export async function deleteEncounterRecord(encounterId: string): Promise<string> {
  await deleteEncounter(encounterId);
  return encounterId;
}

export async function updateVisitRecord(id: string, data: Partial<CreateVisitInput>): Promise<string> {
  await updateVisit(id, data);
  return id;
}

export async function updateHouseholdRecord(
  id: string,
  data: Partial<CreateHouseholdInput>
): Promise<string> {
  await updateHousehold(id, data);
  return id;
}

export async function updateEncounterRecord(
  id: string,
  data: Partial<CreateEncounterInput>
): Promise<string> {
  await updateEncounter(id, data);
  return id;
}