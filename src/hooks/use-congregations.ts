import { useCallback, useEffect, useState } from 'react';
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

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || createClientId();
}

function congregationFromData(id: string, data: Partial<Congregation>): Congregation {
  const now = nowIso();
  return {
    id,
    name: data.name ?? 'Unnamed congregation',
    slug: data.slug ?? slugify(data.name ?? id),
    city: data.city ?? null,
    country: data.country ?? null,
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
      const id = createClientId();
      const now = nowIso();
      const name = String(arg.name ?? '').trim();
      await setDoc(congregationDocument(id), {
        id,
        name,
        slug: slugify(name),
        city: arg.city ? String(arg.city) : null,
        country: arg.country ? String(arg.country) : null,
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
          updates.name = String(arg.name).trim();
          updates.slug = slugify(String(arg.name));
        }
        if (arg.city !== undefined) updates.city = arg.city ? String(arg.city) : null;
        if (arg.country !== undefined) updates.country = arg.country ? String(arg.country) : null;
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
