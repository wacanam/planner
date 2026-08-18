// mobile/src/hooks/useEncounters.ts
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  createClientId,
  FIRESTORE_COLLECTIONS,
  getPlannerFirestore,
  nowIso,
} from '@/lib/firebase';
import type { Encounter } from '@/types/api';

function encounterCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.encounters);
}

function encounterDocument(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.encounters, id);
}

function encounterFromData(id: string, data: Partial<Encounter>): Encounter {
  const now = nowIso();
  return {
    id,
    visitId: data.visitId ?? null,
    householdId: data.householdId ?? null,
    territoryId: data.territoryId ?? null,
    congregationId: data.congregationId ?? null,
    locationType: data.locationType ?? 'household',
    locationDescription: data.locationDescription ?? null,
    userId: data.userId ?? '',
    publisherName: data.publisherName ?? null,
    name: data.name ?? null,
    gender: data.gender ?? null,
    ageGroup: data.ageGroup ?? null,
    role: data.role ?? null,
    response: data.response ?? 'neutral',
    language: data.language ?? null,
    languageSpoken: data.languageSpoken ?? null,
    topicsDiscussed: data.topicsDiscussed ?? null,
    topicDiscussed: data.topicDiscussed ?? null,
    literatureOffered: data.literatureOffered ?? null,
    literatureAccepted: data.literatureAccepted ?? null,
    bibleStudyInterest: Boolean(data.bibleStudyInterest),
    returnVisitRequested: Boolean(data.returnVisitRequested),
    nextVisitNotes: data.nextVisitNotes ?? null,
    notes: data.notes ?? null,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
    householdAddress: data.householdAddress ?? null,
    householdCity: data.householdCity ?? null,
    houseNumber: data.houseNumber ?? null,
    unitNumber: data.unitNumber ?? null,
    streetName: data.streetName ?? null,
    visitDate: data.visitDate ?? null,
    visitOutcome: data.visitOutcome ?? null,
  };
}

export function useEncounters(filters?: { householdId?: string; visitId?: string; userId?: string }) {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const householdId = filters?.householdId ?? null;
  const visitId = filters?.visitId ?? null;

  useEffect(() => {
    setIsLoading(true);
    const constraints: QueryConstraint[] = [];

    if (householdId) {
      constraints.push(where('householdId', '==', householdId));
    } else if (visitId) {
      constraints.push(where('visitId', '==', visitId));
    }

    const q = constraints.length > 0 ? query(encounterCollection(), ...constraints) : query(encounterCollection());

    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const list = snapshot.docs
          .map((document) => encounterFromData(document.id, document.data() as Partial<Encounter>))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setEncounters(list);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, [householdId, visitId]);

  return { encounters, data: encounters, isLoading, error };
}

export function useCreateEncounter() {
  const [isCreating, setIsCreating] = useState(false);

  const create = useCallback(async (data: Partial<Encounter>) => {
    setIsCreating(true);
    try {
      const now = nowIso();
      const id = createClientId();

      const docData: Encounter = {
        id,
        visitId: data.visitId || null,
        householdId: data.householdId || null,
        territoryId: data.territoryId || null,
        congregationId: data.congregationId || null,
        locationType: data.locationType || 'household',
        locationDescription: data.locationDescription || null,
        userId: data.userId || '',
        publisherName: data.publisherName || null,
        name: data.name || null,
        gender: data.gender || null,
        ageGroup: data.ageGroup || null,
        role: data.role || null,
        response: data.response || 'neutral',
        languageSpoken: data.languageSpoken || null,
        topicDiscussed: data.topicDiscussed || null,
        literatureAccepted: data.literatureAccepted || null,
        bibleStudyInterest: Boolean(data.bibleStudyInterest),
        returnVisitRequested: Boolean(data.returnVisitRequested),
        nextVisitNotes: data.nextVisitNotes || null,
        notes: data.notes || null,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(encounterDocument(id), docData);
      return { id };
    } finally {
      setIsCreating(false);
    }
  }, []);

  return { create, isCreating };
}

export function useDeleteEncounter() {
  const [isDeleting, setIsDeleting] = useState(false);

  const remove = useCallback(async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteDoc(encounterDocument(id));
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { remove, isDeleting };
}
