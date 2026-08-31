import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  type QueryConstraint,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { commitChunkedBatch, type BatchOperation } from '@/lib/batch-utils';
import { createClientId, FIRESTORE_COLLECTIONS, getPlannerFirestore, nowIso } from '@/lib/firebase';
import { checkTerritoryDuplicateInFirestore, normalizeTerritoryNumber } from '@/lib/territories';
import type { Territory, TerritoryRequest } from '@/types/api';

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

export function parseBoundaryCoordinates(
  raw: unknown
): Array<{ lat: number; lng: number }> | Array<Array<{ lat: number; lng: number }>> | null {
  if (!raw) return null;

  if (Array.isArray(raw) && raw.length > 0) {
    if (Array.isArray(raw[0])) {
      return (raw as Array<Array<{ lat: unknown; lng: unknown }>>).map((poly) =>
        poly.map((pt) => ({
          lat: Number(pt.lat),
          lng: Number(pt.lng),
        }))
      );
    }

    return (raw as Array<{ lat: unknown; lng: unknown }>).map((pt) => ({
      lat: Number(pt.lat),
      lng: Number(pt.lng),
    }));
  }

  return null;
}

function territoryFromData(id: string, data: Partial<Territory>): Territory {
  const now = nowIso();
  const boundaryCoordinates = parseBoundaryCoordinates(data.boundaryCoordinates);

  return {
    id,
    number: data.number ?? '',
    name: data.name ?? 'Unnamed territory',
    city: data.city ?? null,
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
    boundaryCoordinates,
    annotations: data.annotations ?? null,
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
    const territoryQuery = query(
      territoryCollection(),
      where('congregationId', '==', congregationId)
    );
    return onSnapshot(
      territoryQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        setData(
          snapshot.docs
            .map((document) =>
              territoryFromData(document.id, document.data() as Partial<Territory>)
            )
            .sort((left, right) =>
              left.number.localeCompare(right.number, undefined, { numeric: true })
            )
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

  return { data, territories: data, isLoading, error };
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
        setTerritory(
          snapshot.exists()
            ? territoryFromData(snapshot.id, snapshot.data() as Partial<Territory>)
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
  }, [territoryId]);

  return { territory, isLoading, error };
}

export function useCreateTerritory(congregationId: string) {
  const [isCreating, setIsCreating] = useState(false);

  const create = useCallback(
    async (arg: {
      name: string;
      number: string;
      city?: string | null;
      notes?: string | null;
      boundaryCoordinates?: Array<{ lat: number; lng: number }> | null;
    }) => {
      setIsCreating(true);
      try {
        const name = arg.name.trim() || 'Unnamed territory';
        const rawNumber = arg.number.trim() || name;
        const number = normalizeTerritoryNumber(rawNumber);

        if (!number) {
          throw new Error('Territory number is required.');
        }

        const firestore = getPlannerFirestore();
        const { isDuplicate, duplicate } = await checkTerritoryDuplicateInFirestore(
          firestore,
          congregationId,
          number
        );
        if (isDuplicate && duplicate) {
          throw new Error(`Territory #${duplicate.number} already exists in this congregation.`);
        }

        const now = nowIso();
        const id = createClientId();

        await setDoc(territoryDocument(id), {
          id,
          congregationId,
          name,
          number,
          city: arg.city || null,
          notes: arg.notes || null,
          status: 'available',
          householdsCount: 0,
          coveragePercent: '0',
          publisherId: null,
          publisherName: null,
          groupId: null,
          groupName: null,
          boundaryCoordinates: arg.boundaryCoordinates || null,
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

  const update = useCallback(async (id: string, body: Partial<Territory>) => {
    setIsUpdating(true);
    try {
      const now = nowIso();
      const firestore = getPlannerFirestore();

      if (body.number !== undefined) {
        const normNumber = normalizeTerritoryNumber(String(body.number));
        if (!normNumber) {
          throw new Error('Territory number cannot be empty.');
        }
        const existingDoc = await getDoc(territoryDocument(id));
        if (existingDoc.exists()) {
          const data = existingDoc.data() as Partial<Territory>;
          const congId = data.congregationId;
          if (congId) {
            const { isDuplicate, duplicate } = await checkTerritoryDuplicateInFirestore(
              firestore,
              congId,
              normNumber,
              id
            );
            if (isDuplicate && duplicate) {
              throw new Error(
                `Territory #${duplicate.number} already exists in this congregation.`
              );
            }
          }
        }
      }

      await updateDoc(territoryDocument(id), { ...body, updatedAt: now });
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return { update, isUpdating };
}

export function useDeleteTerritory() {
  const [isDeleting, setIsDeleting] = useState(false);

  const remove = useCallback(async (id: string) => {
    setIsDeleting(true);
    try {
      const now = nowIso();
      const firestore = getPlannerFirestore();
      const [assignments, requests, households, visits, encounters] = await Promise.all([
        getDocs(
          query(
            collection(firestore, FIRESTORE_COLLECTIONS.assignments),
            where('territoryId', '==', id)
          )
        ),
        getDocs(query(requestCollection(), where('territoryId', '==', id))),
        getDocs(
          query(
            collection(firestore, FIRESTORE_COLLECTIONS.households),
            where('territoryId', '==', id)
          )
        ),
        getDocs(
          query(collection(firestore, FIRESTORE_COLLECTIONS.visits), where('territoryId', '==', id))
        ),
        getDocs(
          query(
            collection(firestore, FIRESTORE_COLLECTIONS.encounters),
            where('territoryId', '==', id)
          )
        ),
      ]);

      const ops: BatchOperation[] = [];

      // Delete territory document
      ops.push((b) => b.delete(territoryDocument(id)));

      // Delete related assignments
      for (const assignment of assignments.docs) {
        ops.push((b) => b.delete(assignment.ref));
      }

      // Delete territory requests
      for (const request of requests.docs) {
        ops.push((b) => b.delete(request.ref));
      }

      // Delete visits and encounters
      for (const visit of visits.docs) {
        ops.push((b) => b.delete(visit.ref));
      }
      for (const encounter of encounters.docs) {
        ops.push((b) => b.delete(encounter.ref));
      }

      // Dissociate households
      for (const household of households.docs) {
        ops.push((b) =>
          b.update(household.ref, {
            territoryId: null,
            territoryNumber: null,
            updatedAt: now,
          })
        );
      }

      await commitChunkedBatch(firestore, ops);
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { remove, isDeleting };
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
            .map((document) =>
              requestFromData(document.id, document.data() as Partial<TerritoryRequest>)
            )
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

  return { data, requests: data, isLoading, error };
}

export function useCreateTerritoryRequest(congregationId: string) {
  const [isRequesting, setIsRequesting] = useState(false);

  const request = useCallback(
    async (arg: {
      publisherId: string;
      publisherName?: string | null;
      territoryId?: string | null;
      message?: string | null;
    }) => {
      setIsRequesting(true);
      try {
        const now = nowIso();
        const id = createClientId();
        await setDoc(requestDocument(id), {
          id,
          congregationId,
          publisherId: arg.publisherId,
          publisherName: arg.publisherName || null,
          publisher: arg.publisherName ? { name: arg.publisherName } : null,
          territoryId: arg.territoryId || null,
          status: 'pending',
          message: arg.message || null,
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
