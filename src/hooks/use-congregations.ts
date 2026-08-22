'use client';

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  checkCongregationDuplicateInFirestore,
  normalizeCongregationName,
  slugifyCongregation,
} from '@/lib/congregations';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { createClientId, FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';
import type { Congregation } from '@/types/api';

function congregationCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.congregations);
}

function congregationDocument(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.congregations, id);
}

async function deleteCongregationScopedDocuments(congregationId: string) {
  const firestore = getPlannerFirestore();
  const scopedCollections = [
    FIRESTORE_COLLECTIONS.congregationMembers,
    FIRESTORE_COLLECTIONS.groups,
    FIRESTORE_COLLECTIONS.territories,
    FIRESTORE_COLLECTIONS.territoryRequests,
    FIRESTORE_COLLECTIONS.households,
  ];
  const batch = writeBatch(firestore);

  for (const name of scopedCollections) {
    const snapshot = await getDocs(
      query(collection(firestore, name), where('congregationId', '==', congregationId))
    );
    for (const document of snapshot.docs) batch.delete(document.ref);
  }

  await batch.commit();
}

function congregationFromData(id: string, data: Partial<Congregation>): Congregation {
  const now = nowIso();
  const name = data.name ? normalizeCongregationName(data.name) : 'Unnamed congregation';
  return {
    id,
    name,
    slug: data.slug ?? slugifyCongregation(name || id),
    city: data.city ? normalizeCongregationName(data.city) : null,
    country: data.country ? normalizeCongregationName(data.country) : null,
    defaultLatitude: typeof data.defaultLatitude === 'number' ? data.defaultLatitude : null,
    defaultLongitude: typeof data.defaultLongitude === 'number' ? data.defaultLongitude : null,
    status: data.status ?? 'active',
    createdById: data.createdById ?? null,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  };
}

export function useCongregations() {
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    return onSnapshot(
      congregationCollection(),
      { includeMetadataChanges: true },
      (snapshot) => {
        setCongregations(
          snapshot.docs
            .map((document) =>
              congregationFromData(document.id, document.data() as Partial<Congregation>)
            )
            .sort((left, right) => left.name.localeCompare(right.name))
        );
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, []);

  return { congregations, isLoading, error };
}

export function useCongregation(id: string | null | undefined) {
  const [congregation, setCongregation] = useState<Congregation | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setCongregation(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    return onSnapshot(
      congregationDocument(id),
      { includeMetadataChanges: true },
      (snapshot) => {
        setCongregation(
          snapshot.exists()
            ? congregationFromData(snapshot.id, snapshot.data() as Partial<Congregation>)
            : null
        );
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, [id]);

  return { congregation, isLoading, error };
}

export function useCreateCongregation() {
  const [isCreating, setIsCreating] = useState(false);
  const create = useCallback(async (arg: Record<string, unknown>) => {
    setIsCreating(true);
    try {
      const name = normalizeCongregationName(String(arg.name ?? ''));
      if (!name) {
        throw new Error('Congregation name is required.');
      }

      const firestore = getPlannerFirestore();
      const { isDuplicate, duplicate } = await checkCongregationDuplicateInFirestore(
        firestore,
        name
      );
      if (isDuplicate && duplicate) {
        throw new Error(`A congregation named "${duplicate.name}" already exists.`);
      }

      const id = createClientId();
      const now = nowIso();
      const slug = slugifyCongregation(name);

      await setDoc(congregationDocument(id), {
        id,
        name,
        slug,
        city: arg.city ? normalizeCongregationName(String(arg.city)) : null,
        country: arg.country ? normalizeCongregationName(String(arg.country)) : null,
        defaultLatitude: typeof arg.defaultLatitude === 'number' ? arg.defaultLatitude : null,
        defaultLongitude: typeof arg.defaultLongitude === 'number' ? arg.defaultLongitude : null,
        status: String(arg.status ?? 'active'),
        createdById: arg.createdById ? String(arg.createdById) : null,
        createdAt: now,
        updatedAt: now,
      } satisfies Congregation);
      return { id };
    } finally {
      setIsCreating(false);
    }
  }, []);
  return { create, isCreating };
}

export function useUpdateCongregation(id: string) {
  const [isUpdating, setIsUpdating] = useState(false);
  const update = useCallback(
    async (arg: Record<string, unknown>) => {
      setIsUpdating(true);
      try {
        const updates: Record<string, unknown> = { updatedAt: nowIso() };
        if (arg.name !== undefined) {
          const name = normalizeCongregationName(String(arg.name));
          if (!name) {
            throw new Error('Congregation name cannot be empty.');
          }

          const firestore = getPlannerFirestore();
          const { isDuplicate, duplicate } = await checkCongregationDuplicateInFirestore(
            firestore,
            name,
            id
          );
          if (isDuplicate && duplicate) {
            throw new Error(`A congregation named "${duplicate.name}" already exists.`);
          }

          updates.name = name;
          updates.slug = slugifyCongregation(name);
        }
        if (arg.city !== undefined) {
          updates.city = arg.city ? normalizeCongregationName(String(arg.city)) : null;
        }
        if (arg.country !== undefined) {
          updates.country = arg.country ? normalizeCongregationName(String(arg.country)) : null;
        }
        if (arg.defaultLatitude !== undefined) {
          updates.defaultLatitude =
            typeof arg.defaultLatitude === 'number' ? arg.defaultLatitude : null;
        }
        if (arg.defaultLongitude !== undefined) {
          updates.defaultLongitude =
            typeof arg.defaultLongitude === 'number' ? arg.defaultLongitude : null;
        }
        if (arg.status !== undefined) updates.status = String(arg.status);
        await updateDoc(congregationDocument(id), updates);
      } finally {
        setIsUpdating(false);
      }
    },
    [id]
  );
  return { update, isUpdating };
}

export function useDeleteCongregation(id: string) {
  const [isDeleting, setIsDeleting] = useState(false);
  const remove = useCallback(async () => {
    setIsDeleting(true);
    try {
      await deleteCongregationScopedDocuments(id);
      await deleteDoc(congregationDocument(id));
    } finally {
      setIsDeleting(false);
    }
  }, [id]);
  return { remove, isDeleting };
}
