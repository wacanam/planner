// mobile/src/hooks/useCongregations.ts
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  createClientId,
  FIRESTORE_COLLECTIONS,
  getPlannerFirestore,
  nowIso,
} from '@/lib/firebase';
import type { Congregation } from '@/types/api';

function congregationCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.congregations);
}

function congregationDocument(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.congregations, id);
}

function congregationFromData(id: string, data: Partial<Congregation>): Congregation {
  const now = nowIso();
  return {
    id,
    name: data.name ?? 'Unnamed Congregation',
    slug: data.slug ?? id,
    city: data.city ?? null,
    country: data.country ?? null,
    defaultLatitude: data.defaultLatitude ? Number(data.defaultLatitude) : null,
    defaultLongitude: data.defaultLongitude ? Number(data.defaultLongitude) : null,
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
    const q = query(congregationCollection());
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => congregationFromData(d.id, d.data() as Partial<Congregation>))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCongregations(list);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, []);

  return { congregations, data: congregations, isLoading, error };
}

export function useCongregation(congregationId: string | null | undefined) {
  const [congregation, setCongregation] = useState<Congregation | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(congregationId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!congregationId) {
      setCongregation(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    return onSnapshot(
      congregationDocument(congregationId),
      { includeMetadataChanges: true },
      (snap) => {
        setCongregation(
          snap.exists()
            ? congregationFromData(snap.id, snap.data() as Partial<Congregation>)
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
  }, [congregationId]);

  return { congregation, isLoading, error };
}

export function useCreateCongregation() {
  const [isCreating, setIsCreating] = useState(false);

  const create = useCallback(
    async (arg: {
      name: string;
      city?: string | null;
      country?: string | null;
      createdById?: string | null;
    }) => {
      setIsCreating(true);
      try {
        const now = nowIso();
        const id = createClientId();
        const slug = arg.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        const docData: Congregation = {
          id,
          name: arg.name.trim(),
          slug: `${slug}-${id.substring(0, 6)}`,
          city: arg.city || null,
          country: arg.country || null,
          status: 'pending',
          createdById: arg.createdById || null,
          createdAt: now,
          updatedAt: now,
        };

        await setDoc(congregationDocument(id), docData);
        return { id };
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  return { create, isCreating };
}
