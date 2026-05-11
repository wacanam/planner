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
  type QueryConstraint,
} from 'firebase/firestore';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { createClientId, FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';
import type { Territory, TerritoryRequest } from '@/types/api';

type MutationOptions = { throwOnError?: boolean };

function territoryCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.territories);
}

function requestCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.territoryRequests);
}

function territoryDocument(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.territories, id);
}

function requestDocument(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.territoryRequests, id);
}

function territoryFromData(id: string, data: Partial<Territory>): Territory {
  const now = nowIso();
  return {
    id,
    number: data.number ?? '',
    name: data.name ?? 'Unnamed territory',
    notes: data.notes ?? null,
    status: data.status ?? 'available',
    householdsCount: Number(data.householdsCount ?? 0),
    coveragePercent: String(data.coveragePercent ?? '0'),
    congregationId: data.congregationId ?? '',
    publisherId: data.publisherId ?? null,
    groupId: data.groupId ?? null,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
    boundary: data.boundary ?? null,
    publisherName: data.publisherName ?? null,
    groupName: data.groupName ?? null,
  };
}

function requestFromData(id: string, data: Partial<TerritoryRequest>): TerritoryRequest {
  const now = nowIso();
  return {
    id,
    congregationId: data.congregationId ?? '',
    publisherId: data.publisherId ?? '',
    territoryId: data.territoryId ?? null,
    status: data.status ?? 'pending',
    message: data.message ?? null,
    approvedBy: data.approvedBy ?? null,
    approvedAt: data.approvedAt ?? null,
    responseMessage: data.responseMessage ?? null,
    requestedAt: data.requestedAt ?? now,
    publisherName: data.publisherName ?? null,
    publisher: data.publisher ?? (data.publisherName ? { name: data.publisherName } : null),
  };
}

export function useCongregationTerritories(congregationId: string | null | undefined) {
  const [data, setData] = useState<Territory[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(congregationId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!congregationId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const territoryQuery = query(territoryCollection(), where('congregationId', '==', congregationId));
    return onSnapshot(
      territoryQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        setData(
          snapshot.docs
            .map((document) => territoryFromData(document.id, document.data() as Partial<Territory>))
            .sort((left, right) => left.number.localeCompare(right.number, undefined, { numeric: true }))
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

  return { data, isLoading, error };
}

export function useCreateTerritory(congregationId: string) {
  const [isCreating, setIsCreating] = useState(false);

  const create = useCallback(
    async (arg: Record<string, unknown>) => {
      setIsCreating(true);
      try {
        const now = nowIso();
        const id = createClientId();
        const name = String(arg.name ?? '').trim() || 'Unnamed territory';
        const number = String(arg.number ?? '').trim() || name;
        await setDoc(territoryDocument(id), {
          id,
          congregationId,
          name,
          number,
          notes: arg.notes ? String(arg.notes) : null,
          status: 'available',
          householdsCount: 0,
          coveragePercent: '0',
          publisherId: null,
          publisherName: null,
          groupId: null,
          groupName: null,
          boundary: null,
          createdAt: now,
          updatedAt: now,
        } satisfies Territory);
        return { id };
      } finally {
        setIsCreating(false);
      }
    },
    [congregationId]
  );

  return { create, isCreating };
}

export function useUpdateTerritory() {
  const [isUpdating, setIsUpdating] = useState(false);

  const update = useCallback(async (id: string, body: Record<string, unknown>) => {
    setIsUpdating(true);
    try {
      await updateDoc(territoryDocument(id), { ...body, updatedAt: nowIso() });
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return { update, isUpdating };
}

export function useCongregationTerritoryRequests(
  congregationId: string | null | undefined,
  status?: string
) {
  const [data, setData] = useState<TerritoryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(congregationId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!congregationId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const constraints: QueryConstraint[] = [where('congregationId', '==', congregationId)];
    if (status) constraints.push(where('status', '==', status));
    const requestQuery = query(requestCollection(), ...constraints);
    return onSnapshot(
      requestQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        setData(
          snapshot.docs
            .map((document) => requestFromData(document.id, document.data() as Partial<TerritoryRequest>))
            .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))
        );
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, [congregationId, status]);

  return { data, isLoading, error };
}

export function useCreateTerritoryRequest(congregationId: string) {
  const [isRequesting, setIsRequesting] = useState(false);

  const request = useCallback(
    async (arg: Record<string, unknown>, _options?: MutationOptions) => {
      setIsRequesting(true);
      try {
        const now = nowIso();
        const id = createClientId();
        await setDoc(requestDocument(id), {
          id,
          congregationId,
          publisherId: String(arg.publisherId ?? ''),
          publisherName: arg.publisherName ? String(arg.publisherName) : null,
          publisher: arg.publisherName ? { name: String(arg.publisherName) } : null,
          territoryId: arg.territoryId ? String(arg.territoryId) : null,
          status: 'pending',
          message: arg.message ? String(arg.message) : null,
          approvedBy: null,
          approvedAt: null,
          responseMessage: null,
          requestedAt: now,
        } satisfies TerritoryRequest);
        return { id };
      } finally {
        setIsRequesting(false);
      }
    },
    [congregationId]
  );

  return { request, isRequesting };
}

export function useReviewTerritoryRequest(_congregationId: string) {
  const [isReviewing, setIsReviewing] = useState(false);

  const reviewRequest = useCallback(
    async (arg: {
      requestId: string;
      status: string;
      responseMessage?: string | null;
      territoryId?: string;
      approvedBy?: string | null;
      publisherId?: string | null;
      publisherName?: string | null;
    }) => {
      setIsReviewing(true);
      try {
        const now = nowIso();
        await updateDoc(requestDocument(arg.requestId), {
          status: arg.status,
          responseMessage: arg.responseMessage ?? null,
          approvedBy: arg.approvedBy ?? null,
          approvedAt: now,
          ...(arg.territoryId ? { territoryId: arg.territoryId } : {}),
        });

        if (arg.status === 'approved' && arg.territoryId) {
          const assignmentId = createClientId();
          await setDoc(doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.assignments, assignmentId), {
            id: assignmentId,
            territoryId: arg.territoryId,
            userId: arg.publisherId ?? null,
            serviceGroupId: null,
            status: 'assigned',
            assignedAt: now,
            dueAt: null,
            returnedAt: null,
            notes: null,
            coverageAtAssignment: '0',
            createdAt: now,
            assigneeName: arg.publisherName ?? null,
            assigneeEmail: null,
            groupName: null,
          });
          await updateDoc(territoryDocument(arg.territoryId), {
            status: 'assigned',
            publisherId: arg.publisherId ?? null,
            publisherName: arg.publisherName ?? null,
            updatedAt: now,
          });
        }
      } finally {
        setIsReviewing(false);
      }
    },
    []
  );

  return { reviewRequest, isReviewing };
}

export function useTerritoryDetail(territoryId: string | null | undefined) {
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(territoryId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!territoryId) {
      setTerritory(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    return onSnapshot(
      territoryDocument(territoryId),
      { includeMetadataChanges: true },
      (snapshot) => {
        setTerritory(snapshot.exists() ? territoryFromData(snapshot.id, snapshot.data() as Partial<Territory>) : null);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, [territoryId]);

  return { territory, isLoading, error };
}

export function useDeleteTerritory() {
  const [isDeleting, setIsDeleting] = useState(false);

  const remove = useCallback(async (id: string) => {
    setIsDeleting(true);
    try {
      const firestore = getPlannerFirestore();
      const [assignments, requests] = await Promise.all([
        getDocs(query(collection(firestore, FIRESTORE_COLLECTIONS.assignments), where('territoryId', '==', id))),
        getDocs(query(requestCollection(), where('territoryId', '==', id))),
      ]);
      const batch = writeBatch(firestore);
      batch.delete(territoryDocument(id));
      for (const assignment of assignments.docs) batch.delete(assignment.ref);
      for (const request of requests.docs) batch.delete(request.ref);
      await batch.commit();
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { remove, isDeleting };
}

export function useDeleteTerritoryRequest() {
  const [isDeleting, setIsDeleting] = useState(false);
  const remove = useCallback(async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteDoc(requestDocument(id));
    } finally {
      setIsDeleting(false);
    }
  }, []);
  return { remove, isDeleting };
}