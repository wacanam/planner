// mobile/src/hooks/useVisits.ts
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  type QueryConstraint,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { createClientId, FIRESTORE_COLLECTIONS, getPlannerFirestore, nowIso } from '@/lib/firebase';
import type { Visit } from '@/types/api';

function visitCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.visits);
}

function visitDocument(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.visits, id);
}

function visitFromData(id: string, data: Partial<Visit>): Visit {
  const now = nowIso();
  return {
    id,
    userId: data.userId ?? '',
    congregationId: (data as any).congregationId ?? null,
    publisherName: data.publisherName ?? null,
    householdId: data.householdId ?? '',
    visitDate: data.visitDate ?? now,
    outcome: data.outcome ?? 'other',
    householdStatusBefore: data.householdStatusBefore ?? null,
    householdStatusAfter: data.householdStatusAfter ?? null,
    duration: data.duration ?? null,
    literatureLeft: data.literatureLeft ?? null,
    literaturePlaced: data.literaturePlaced ?? null,
    bibleTopicDiscussed: data.bibleTopicDiscussed ?? null,
    returnVisitPlanned: Boolean(data.returnVisitPlanned),
    nextVisitDate: data.nextVisitDate ?? null,
    nextVisitTime: data.nextVisitTime ?? null,
    nextVisitNotes: data.nextVisitNotes ?? null,
    assignmentId: data.assignmentId ?? null,
    notes: data.notes ?? null,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
    householdAddress: data.householdAddress,
    householdCity: data.householdCity,
    houseNumber: data.houseNumber,
    unitNumber: data.unitNumber,
    streetName: data.streetName,
  };
}

export function useVisits(filters?: {
  congregationId?: string;
  householdId?: string;
  assignmentId?: string;
  userId?: string;
}) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const congregationId = filters?.congregationId ?? null;
  const householdId = filters?.householdId ?? null;
  const assignmentId = filters?.assignmentId ?? null;

  useEffect(() => {
    if (!congregationId && !householdId && !assignmentId) {
      setVisits([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const constraints: QueryConstraint[] = [];

    if (congregationId) {
      constraints.push(where('congregationId', '==', congregationId));
    }
    if (householdId) {
      constraints.push(where('householdId', '==', householdId));
    } else if (assignmentId) {
      constraints.push(where('assignmentId', '==', assignmentId));
    }

    const q =
      constraints.length > 0 ? query(visitCollection(), ...constraints) : query(visitCollection());

    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const list = snapshot.docs
          .map((document) => visitFromData(document.id, document.data() as Partial<Visit>))
          .sort((a, b) => b.visitDate.localeCompare(a.visitDate));
        setVisits(list);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, [congregationId, householdId, assignmentId]);

  return { visits, data: visits, isLoading, error };
}

export function useCreateVisit() {
  const [isCreating, setIsCreating] = useState(false);

  const create = useCallback(async (data: Partial<Visit>) => {
    setIsCreating(true);
    try {
      const now = nowIso();
      const id = createClientId();
      const firestore = getPlannerFirestore();

      let congregationId = (data as any).congregationId || null;
      if (!congregationId && data.householdId) {
        const hDoc = await getDoc(doc(firestore, FIRESTORE_COLLECTIONS.households, data.householdId));
        if (hDoc.exists()) {
          congregationId = hDoc.data().congregationId || null;
        }
      }

      const docData = {
        id,
        userId: data.userId || '',
        congregationId,
        publisherName: data.publisherName || null,
        householdId: data.householdId || '',
        visitDate: data.visitDate || now,
        outcome: data.outcome || 'other',
        householdStatusBefore: data.householdStatusBefore || null,
        householdStatusAfter: data.householdStatusAfter || null,
        duration: data.duration || null,
        literatureLeft: data.literatureLeft || null,
        literaturePlaced: data.literaturePlaced || null,
        bibleTopicDiscussed: data.bibleTopicDiscussed || null,
        returnVisitPlanned: Boolean(data.returnVisitPlanned),
        nextVisitDate: data.nextVisitDate || null,
        nextVisitTime: data.nextVisitTime || null,
        nextVisitNotes: data.nextVisitNotes || null,
        assignmentId: data.assignmentId || null,
        notes: data.notes || null,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(visitDocument(id), docData);

      // Update parent household last visit date/outcome & status
      if (data.householdId) {
        const householdRef = doc(firestore, FIRESTORE_COLLECTIONS.households, data.householdId);
        const updates: Record<string, unknown> = {
          lastVisitDate: data.visitDate || now,
          lastVisitOutcome: data.outcome || 'other',
          updatedAt: now,
        };
        if (data.householdStatusAfter) {
          updates.status = data.householdStatusAfter;
        }
        await updateDoc(householdRef, updates).catch(() => {});
      }

      return { id };
    } finally {
      setIsCreating(false);
    }
  }, []);

  return { create, isCreating };
}

export function useDeleteVisit() {
  const [isDeleting, setIsDeleting] = useState(false);

  const remove = useCallback(async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteDoc(visitDocument(id));
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { remove, isDeleting };
}
