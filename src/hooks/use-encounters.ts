import { useEffect, useMemo, useState } from 'react';
import {
  createEncounter,
  toEncounterView,
  watchEncounters,
  watchHouseholds,
  watchVisits,
} from '@/lib/local-first';
import type { LocalEncounter, LocalHousehold, LocalVisit } from '@/lib/local-first/types';
import { isTerritoryServant } from '@/lib/permissions';
import type { Encounter } from '@/types/api';

function sortEncounters(encounters: Encounter[]) {
  return [...encounters].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function useEncounterRecords(filters?: {
  visitId?: string | null;
  householdId?: string | null;
  userId?: string | null;
  userRole?: string | null;
}) {
  const visitId = filters?.visitId ?? null;
  const householdId = filters?.householdId ?? null;
  const userId = filters?.userId ?? null;
  const userRole = filters?.userRole ?? null;

  const [encounters, setEncounters] = useState<LocalEncounter[]>([]);
  const [households, setHouseholds] = useState<LocalHousehold[]>([]);
  const [visits, setVisits] = useState<LocalVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const handleError = (err: Error) => {
      setError(err.message);
      setIsLoading(false);
    };
    const unsubscribeEncounters = watchEncounters(
      { visitId, householdId },
      (records) => {
        setEncounters(records);
        setError(null);
        setIsLoading(false);
      },
      handleError
    );
    const unsubscribeHouseholds = watchHouseholds(
      { personalOnly: true, userId, userRole },
      setHouseholds,
      handleError
    );
    const unsubscribeVisits = watchVisits(undefined, setVisits, handleError);
    return () => {
      unsubscribeEncounters();
      unsubscribeHouseholds();
      unsubscribeVisits();
    };
  }, [householdId, userId, userRole, visitId]);

  const householdMap = useMemo(
    () => new Map(households.map((household) => [household.id, household] as const)),
    [households]
  );
  const visitMap = useMemo(
    () => new Map(visits.map((visit) => [visit.id, visit] as const)),
    [visits]
  );

  const mappedEncounters = useMemo(() => {
    let filtered = encounters;
    if (userId && !isTerritoryServant(userRole)) {
      filtered = encounters.filter(
        (e) => e.userId === userId || (e.householdId && householdMap.has(e.householdId))
      );
    }
    return sortEncounters(
      filtered.map((encounter) =>
        toEncounterView(
          encounter,
          encounter.householdId ? householdMap.get(encounter.householdId) : null,
          encounter.visitId ? visitMap.get(encounter.visitId) : null
        )
      )
    );
  }, [encounters, householdMap, userId, userRole, visitMap]);

  return { encounters: mappedEncounters, households, isLoading, error };
}

export function useVisitEncounters(visitId: string | null) {
  return useEncounterRecords({ visitId });
}

export function useMyEncounters(filters?: {
  visitId?: string | null;
  householdId?: string | null;
  userId?: string | null;
  userRole?: string | null;
}) {
  return useEncounterRecords(filters);
}

export function useAddEncounter() {
  const addEncounter = async (data: Record<string, unknown>, visitId?: string | null) => {
    const encounter = await createEncounter({
      ...data,
      visitId: visitId ?? (data.visitId as string | null | undefined) ?? null,
      response: String(data.response ?? 'other'),
    });
    return encounter.id;
  };

  return {
    addEncounter,
  };
}
