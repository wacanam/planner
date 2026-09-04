import {
  type CreateEncounterInput,
  type CreateHouseholdInput,
  type CreateVisitInput,
  createContact,
  createEncounter,
  createHousehold,
  createVisit,
  deleteContact,
  deleteEncounter,
  deleteHousehold,
  deleteVisit,
  findContactByName,
  updateContact,
  updateEncounter,
  updateHousehold,
  updateVisit,
} from '@/lib/local-first';
import type { CreateContactInput, UpdateContactInput } from '@/types/api';

export async function saveVisitRecord(data: Record<string, unknown>): Promise<string> {
  const visit = await createVisit({
    householdId: String(data.householdId ?? ''),
    congregationId: (data.congregationId as string | null | undefined) ?? null,
    userId: (data.userId as string | null | undefined) ?? null,
    publisherName: (data.publisherName as string | null | undefined) ?? null,
    assignmentId: (data.assignmentId as string | null | undefined) ?? null,
    outcome: String(data.outcome ?? 'other'),
    householdStatusAfter: (data.householdStatusAfter as string | null | undefined) ?? null,
    duration: (data.duration as number | null | undefined) ?? null,
    literatureLeft: ((data.literatureLeft ?? data.literaturePlaced) as string | null | undefined) ?? null,
    literaturePlaced: ((data.literaturePlaced ?? data.literatureLeft) as string | null | undefined) ?? null,
    bibleTopicDiscussed: (data.bibleTopicDiscussed as string | null | undefined) ?? null,
    returnVisitPlanned: Boolean(data.returnVisitPlanned),
    nextVisitDate: (data.nextVisitDate as string | null | undefined) ?? null,
    nextVisitTime: (data.nextVisitTime as string | null | undefined) ?? null,
    nextVisitNotes: (data.nextVisitNotes as string | null | undefined) ?? null,
    scheduledAppointmentType: (data.scheduledAppointmentType as any) ?? null,
    bibleStudyStatus: (data.bibleStudyStatus as any) ?? null,
    studyOffered: Boolean(data.studyOffered),
    isAppointmentMissed: Boolean(data.isAppointmentMissed),
    notes: (data.notes as string | null | undefined) ?? null,
  });
  return visit.id;
}

export async function saveHouseholdRecord(data: Record<string, unknown>): Promise<string> {
  const household = await createHousehold({
    name: (data.name as string | undefined) ?? undefined,
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
    createdById: (data.createdById as string | null | undefined) ?? null,
    creatorName: (data.creatorName as string | null | undefined) ?? null,
    collaboratorIds: (data.collaboratorIds as string[] | null | undefined) ?? null,
    readOnlyUserIds: (data.readOnlyUserIds as string[] | null | undefined) ?? null,
    transferredFrom: (data.transferredFrom as string | null | undefined) ?? null,
    transferredFromId: (data.transferredFromId as string | null | undefined) ?? null,
    transferredAt: (data.transferredAt as string | null | undefined) ?? null,
    updatedById: (data.updatedById as string | null | undefined) ?? null,
  });
  return household.id;
}

export async function saveContactRecord(data: Record<string, unknown>): Promise<string> {
  const contact = await createContact({
    householdId: String(data.householdId ?? ''),
    congregationId: (data.congregationId as string | null | undefined) ?? null,
    territoryId: (data.territoryId as string | null | undefined) ?? null,
    name: String(data.name ?? ''),
    gender: (data.gender as CreateContactInput['gender']) || 'unknown',
    ageGroup: (data.ageGroup as CreateContactInput['ageGroup']) || 'adult',
    language: (data.language as string | null | undefined) ?? null,
    role: (data.role as CreateContactInput['role']) || 'unknown',
    status: (data.status as CreateContactInput['status']) || 'active',
    bestTimeToCall: (data.bestTimeToCall as string | null | undefined) ?? null,
    bibleStudyInterest: Boolean(data.bibleStudyInterest),
    notes: (data.notes as string | null | undefined) ?? null,
    createdById: (data.createdById as string | null | undefined) ?? null,
  });
  return contact.id;
}

export async function updateContactRecord(id: string, data: UpdateContactInput): Promise<string> {
  await updateContact(id, data);
  return id;
}

export async function deleteContactRecord(contactId: string): Promise<string> {
  await deleteContact(contactId);
  return contactId;
}

export async function saveEncounterRecord(data: Record<string, unknown>): Promise<string> {
  const rawName = (data.name as string | null | undefined)?.trim();
  const householdId = (data.householdId as string | null | undefined) ?? null;
  let contactId = (data.contactId as string | null | undefined) ?? null;

  // Auto-link or create contact in Firestore if linked to a household
  if (householdId && rawName) {
    try {
      if (!contactId) {
        const existing = await findContactByName(householdId, rawName);
        if (existing) {
          contactId = existing.id;
          const updates: Record<string, unknown> = {};
          if (data.bibleStudyInterest && !existing.bibleStudyInterest) {
            updates.bibleStudyInterest = true;
          }
          if (data.phoneNumber && !existing.phoneNumber) {
            updates.phoneNumber = data.phoneNumber;
          }
          if (data.email && !existing.email) {
            updates.email = data.email;
          }
          if (data.bestTimeToCall && !existing.bestTimeToCall) {
            updates.bestTimeToCall = data.bestTimeToCall;
          }
          if (data.bibleStudyPublication && !existing.bibleStudyPublication) {
            updates.bibleStudyPublication = data.bibleStudyPublication;
          }
          if (data.bibleStudyLesson && !existing.bibleStudyLesson) {
            updates.bibleStudyLesson = data.bibleStudyLesson;
          }
          if (Object.keys(updates).length > 0) {
            await updateContact(existing.id, updates);
          }
        } else {
          const newContact = await createContact({
            householdId,
            name: rawName,
            gender: (data.gender as CreateContactInput['gender']) || 'unknown',
            ageGroup: (data.ageGroup as CreateContactInput['ageGroup']) || 'adult',
            language: ((data.languageSpoken ?? data.language) as string | null | undefined) ?? null,
            role: (data.role as CreateContactInput['role']) || 'unknown',
            status: 'active',
            phoneNumber: (data.phoneNumber as string | null | undefined) ?? null,
            email: (data.email as string | null | undefined) ?? null,
            bestTimeToCall: (data.bestTimeToCall as string | null | undefined) ?? null,
            bibleStudyInterest: Boolean(data.bibleStudyInterest),
            bibleStudyPublication:
              (data.bibleStudyPublication as string | null | undefined) ?? null,
            bibleStudyLesson: (data.bibleStudyLesson as string | null | undefined) ?? null,
            createdById: (data.userId as string | null | undefined) ?? null,
            creatorName:
              ((data.publisherName ?? data.creatorName) as string | null | undefined) ?? null,
          });
          contactId = newContact.id;
        }
      }
    } catch (err) {
      console.warn(
        '[saveEncounterRecord] Contact auto-link failed, proceeding with encounter',
        err
      );
    }
  }

  const encounter = await createEncounter({
    userId: (data.userId as string | null | undefined) ?? null,
    congregationId: (data.congregationId as string | null | undefined) ?? null,
    publisherName: ((data.publisherName ?? data.creatorName) as string | null | undefined) ?? null,
    visitId: (data.visitId as string | null | undefined) ?? null,
    householdId,
    contactId,
    encounterDate: (data.encounterDate as string | null | undefined) ?? null,
    name: rawName || null,
    gender: (data.gender as string | null | undefined) ?? null,
    ageGroup: (data.ageGroup as string | null | undefined) ?? null,
    role: (data.role as string | null | undefined) ?? null,
    response: String(data.response ?? 'other'),
    languageSpoken: ((data.languageSpoken ?? data.language) as string | null | undefined) ?? null,
    phoneNumber: (data.phoneNumber as string | null | undefined) ?? null,
    email: (data.email as string | null | undefined) ?? null,
    bestTimeToCall: (data.bestTimeToCall as string | null | undefined) ?? null,
    locationDescription: (data.locationDescription as string | null | undefined) ?? null,
    topicDiscussed:
      ((data.topicDiscussed ?? data.topicsDiscussed) as string | null | undefined) ?? null,
    literatureAccepted:
      ((data.literatureAccepted ?? data.literatureOffered) as string | null | undefined) ?? null,
    bibleStudyInterest: Boolean(data.bibleStudyInterest),
    bibleStudyPublication: (data.bibleStudyPublication as string | null | undefined) ?? null,
    bibleStudyLesson: (data.bibleStudyLesson as string | null | undefined) ?? null,
    returnVisitRequested: Boolean(data.returnVisitRequested),
    nextVisitDate: (data.nextVisitDate as string | null | undefined) ?? null,
    nextVisitTime: (data.nextVisitTime as string | null | undefined) ?? null,
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

export async function updateVisitRecord(
  id: string,
  data: Partial<CreateVisitInput>
): Promise<string> {
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
