import { useCallback, useEffect, useState } from 'react';
import {
  createEncounter,
  getLocalFirstDB,
  requestLocalFirstSync,
  syncLocalFirst,
  toEncounterView,
} from '@/lib/local-first';
import type { LocalEncounter, LocalHousehold, LocalVisit } from '@/lib/local-first/types';
import type { Encounter } from '@/types/api';

function sortEncounters(encounters: (Encounter & { _pending?: boolean })[]) {
  return [...encounters].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function useEncounterRecords(visitId?: string | null) {
  const [encounters, setEncounters] = useState<(Encounter & { _pending?: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const database = await getLocalFirstDB();
    const [encounterDocuments, householdDocuments, visitDocuments] = await Promise.all([
      database.encounters.find().exec(),
      database.households.find().exec(),
      database.visits.find().exec(),
    ]);
    const households = new Map(
      householdDocuments.map((document) => {
        const household = document.toMutableJSON() as LocalHousehold;
        return [household.id, household] as const;
      })
    );
    const visits = new Map(
      visitDocuments.map((document) => {
        const visit = document.toMutableJSON() as LocalVisit;
        return [visit.id, visit] as const;
      })
    );

    setEncounters(
      sortEncounters(
        encounterDocuments
          .map((document) => document.toMutableJSON() as LocalEncounter)
          .filter((encounter) => !encounter.deletedAt)
          .filter((encounter) => (visitId ? encounter.visitId === visitId : true))
          .map((encounter) =>
            toEncounterView(
              encounter,
              encounter.householdId ? households.get(encounter.householdId) : null,
              encounter.visitId ? visits.get(encounter.visitId) : null
            )
          )
      )
    );
    setError(null);
  }, [visitId]);

  useEffect(() => {
    let cancelled = false;
    let encounterSubscription: { unsubscribe: () => void } | null = null;
    let householdSubscription: { unsubscribe: () => void } | null = null;
    let visitSubscription: { unsubscribe: () => void } | null = null;

    const start = async () => {
      try {
        const database = await getLocalFirstDB();
        if (cancelled) return;
        await refresh();
        encounterSubscription = database.encounters.$.subscribe(() => void refresh());
        householdSubscription = database.households.$.subscribe(() => void refresh());
        visitSubscription = database.visits.$.subscribe(() => void refresh());
        requestLocalFirstSync();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void start();
    return () => {
      cancelled = true;
      encounterSubscription?.unsubscribe();
      householdSubscription?.unsubscribe();
      visitSubscription?.unsubscribe();
    };
  }, [refresh]);

  const mutate = useCallback(async () => {
    await syncLocalFirst();
    await refresh();
  }, [refresh]);

  return { encounters, isLoading, error, mutate };
}

export function useVisitEncounters(visitId: string | null) {
  return useEncounterRecords(visitId);
}

export function useMyEncounters() {
  return useEncounterRecords();
}

export function useAddEncounter() {
  const addEncounter = async (data: Record<string, unknown>, visitId?: string | null) => {
    const encounter = await createEncounter({
      ...data,
      visitId: visitId ?? (data.visitId as string | null | undefined) ?? null,
      response: String(data.response ?? 'other'),
    });
    requestLocalFirstSync();
    return encounter.id;
  };

  return {
    addEncounter,
    getPendingEncounters: async () => [],
    clearPendingEncounter: async () => undefined,
  };
}