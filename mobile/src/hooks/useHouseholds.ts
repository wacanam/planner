// mobile/src/hooks/useHouseholds.ts
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
import type { Household } from '@/types/api';

function householdCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.households);
}

function householdDocument(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.households, id);
}

function householdFromData(id: string, data: Partial<Household>): Household {
  const now = nowIso();
  return {
    id,
    name: data.name ?? null,
    address: data.address ?? '',
    houseNumber: data.houseNumber ?? null,
    unitNumber: data.unitNumber ?? null,
    streetName: data.streetName ?? '',
    city: data.city ?? '',
    postalCode: data.postalCode ?? null,
    country: data.country ?? null,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    type: data.type ?? 'house',
    floor: data.floor ? Number(data.floor) : null,
    occupantsCount: data.occupantsCount ? Number(data.occupantsCount) : null,
    languages: data.languages ?? null,
    bestTimeToCall: data.bestTimeToCall ?? null,
    status: data.status ?? 'new',
    notes: data.notes ?? null,
    lwpNotes: data.lwpNotes ?? null,
    lastVisitDate: data.lastVisitDate ?? null,
    lastVisitOutcome: data.lastVisitOutcome ?? null,
    territoryId: data.territoryId ?? null,
    congregationId: data.congregationId ?? null,
    createdById: data.createdById ?? null,
    creatorName: data.creatorName ?? null,
    collaboratorIds: data.collaboratorIds ?? null,
    readOnlyUserIds: data.readOnlyUserIds ?? null,
    transferredFrom: data.transferredFrom ?? null,
    transferredFromId: data.transferredFromId ?? null,
    transferredAt: data.transferredAt ?? null,
    totalVisitsCount: data.totalVisitsCount ?? 0,
    totalEncountersCount: data.totalEncountersCount ?? 0,
    updatedById: data.updatedById ?? null,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  };
}

export interface HouseholdFilters {
  congregationId?: string | null;
  territoryId?: string | null;
  userId?: string | null;
}

export function useHouseholds(filters?: HouseholdFilters) {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const territoryId = filters?.territoryId ?? null;
  const congregationId = filters?.congregationId ?? null;

  useEffect(() => {
    setIsLoading(true);
    const constraints: QueryConstraint[] = [];

    if (territoryId) {
      constraints.push(where('territoryId', '==', territoryId));
    } else if (congregationId) {
      constraints.push(where('congregationId', '==', congregationId));
    }

    const q =
      constraints.length > 0
        ? query(householdCollection(), ...constraints)
        : query(householdCollection());

    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const list = snapshot.docs
          .map((document) => householdFromData(document.id, document.data() as Partial<Household>))
          .sort((a, b) => a.address.localeCompare(b.address));
        setHouseholds(list);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, [territoryId, congregationId]);

  return { households, data: households, isLoading, error };
}

export function useHouseholdDetail(householdId: string | null | undefined) {
  const [household, setHousehold] = useState<Household | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(householdId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!householdId) {
      setHousehold(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    return onSnapshot(
      householdDocument(householdId),
      { includeMetadataChanges: true },
      (snap) => {
        setHousehold(
          snap.exists() ? householdFromData(snap.id, snap.data() as Partial<Household>) : null
        );
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, [householdId]);

  return { household, isLoading, error };
}

export function useCreateHousehold() {
  const [isCreating, setIsCreating] = useState(false);

  const create = useCallback(async (data: Partial<Household>) => {
    setIsCreating(true);
    try {
      const now = nowIso();
      const id = createClientId();
      const docData: Household = {
        id,
        name: data.name || null,
        address: data.address?.trim() || 'Household Record',
        houseNumber: data.houseNumber || null,
        unitNumber: data.unitNumber || null,
        streetName: data.streetName || '',
        city: data.city || '',
        postalCode: data.postalCode || null,
        country: data.country || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        type: data.type || 'house',
        floor: data.floor || null,
        occupantsCount: data.occupantsCount || null,
        languages: data.languages || null,
        bestTimeToCall: data.bestTimeToCall || null,
        status: data.status || 'new',
        notes: data.notes || null,
        lwpNotes: null,
        lastVisitDate: null,
        lastVisitOutcome: null,
        territoryId: data.territoryId || null,
        congregationId: data.congregationId || null,
        createdById: data.createdById || null,
        creatorName: data.creatorName || null,
        collaboratorIds: null,
        readOnlyUserIds: null,
        transferredFrom: null,
        transferredFromId: null,
        transferredAt: null,
        totalVisitsCount: 0,
        totalEncountersCount: 0,
        updatedById: null,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(householdDocument(id), docData);
      return { id };
    } finally {
      setIsCreating(false);
    }
  }, []);

  return { create, isCreating };
}

export function useUpdateHousehold() {
  const [isUpdating, setIsUpdating] = useState(false);

  const update = useCallback(async (id: string, body: Partial<Household>) => {
    setIsUpdating(true);
    try {
      const now = nowIso();
      await updateDoc(householdDocument(id), { ...body, updatedAt: now });
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return { update, isUpdating };
}

export function useDeleteHousehold() {
  const [isDeleting, setIsDeleting] = useState(false);

  const remove = useCallback(async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteDoc(householdDocument(id));
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { remove, isDeleting };
}
