import { useCallback, useEffect, useState } from 'react';
import {
  getLocalFirstDB,
  requestLocalFirstSync,
  syncLocalFirst,
  toHouseholdView,
  toVisitView,
} from '@/lib/local-first';
import type { LocalHousehold, LocalVisit } from '@/lib/local-first/types';
import type { Household, Visit } from '@/types/api';

type DataSource = 'server' | 'cache';

function useDataSource(): DataSource {
  const [source, setSource] = useState<DataSource>('server');

  useEffect(() => {
    const update = () => setSource(navigator.onLine ? 'server' : 'cache');
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return source;
}

function sortVisits(visits: (Visit & { _pending?: boolean })[]) {
  return [...visits].sort((left, right) => right.visitDate.localeCompare(left.visitDate));
}

export function useMyVisits(filters?: { householdId?: string; assignmentId?: string }) {
  const [visits, setVisits] = useState<(Visit & { _pending?: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataSource = useDataSource();

  const refresh = useCallback(async () => {
    const database = await getLocalFirstDB();
    const [visitDocuments, householdDocuments] = await Promise.all([
      database.visits.find().exec(),
      database.households.find().exec(),
    ]);
    const households = new Map(
      householdDocuments.map((document) => {
        const household = document.toMutableJSON() as LocalHousehold;
        return [household.id, household] as const;
      })
    );

    const mapped = visitDocuments
      .map((document) => document.toMutableJSON() as LocalVisit)
      .filter((visit) => !visit.deletedAt)
      .filter((visit) => {
        if (filters?.householdId && visit.householdId !== filters.householdId) return false;
        if (filters?.assignmentId && visit.assignmentId !== filters.assignmentId) return false;
        return true;
      })
      .map((visit) => toVisitView(visit, households.get(visit.householdId)));

    setVisits(sortVisits(mapped));
    setError(null);
  }, [filters?.assignmentId, filters?.householdId]);

  useEffect(() => {
    let cancelled = false;
    let visitSubscription: { unsubscribe: () => void } | null = null;
    let householdSubscription: { unsubscribe: () => void } | null = null;

    const start = async () => {
      try {
        const database = await getLocalFirstDB();
        if (cancelled) return;
        await refresh();
        visitSubscription = database.visits.$.subscribe(() => void refresh());
        householdSubscription = database.households.$.subscribe(() => void refresh());
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
      visitSubscription?.unsubscribe();
      householdSubscription?.unsubscribe();
    };
  }, [refresh]);

  const mutate = useCallback(async () => {
    await syncLocalFirst();
    await refresh();
  }, [refresh]);

  return { visits, isLoading, error, dataSource, mutate };
}

export function useHouseholdVisits(householdId: string | null) {
  return useMyVisits(householdId ? { householdId } : undefined);
}

export function useTerritoryVisits(territoryId: string | null) {
  const [visits, setVisits] = useState<(Visit & { _pending?: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const database = await getLocalFirstDB();
    const [visitDocuments, householdDocuments] = await Promise.all([
      database.visits.find().exec(),
      database.households.find().exec(),
    ]);
    const households = new Map(
      householdDocuments
        .map((document) => document.toMutableJSON() as LocalHousehold)
        .filter((household) => !territoryId || household.territoryId === territoryId)
        .map((household) => [household.id, household] as const)
    );

    setVisits(
      sortVisits(
        visitDocuments
          .map((document) => document.toMutableJSON() as LocalVisit)
          .filter((visit) => !visit.deletedAt && households.has(visit.householdId))
          .map((visit) => toVisitView(visit, households.get(visit.householdId)))
      )
    );
    setError(null);
  }, [territoryId]);

  useEffect(() => {
    let cancelled = false;
    let visitSubscription: { unsubscribe: () => void } | null = null;
    let householdSubscription: { unsubscribe: () => void } | null = null;

    const start = async () => {
      try {
        const database = await getLocalFirstDB();
        if (cancelled) return;
        await refresh();
        visitSubscription = database.visits.$.subscribe(() => void refresh());
        householdSubscription = database.households.$.subscribe(() => void refresh());
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void start();
    return () => {
      cancelled = true;
      visitSubscription?.unsubscribe();
      householdSubscription?.unsubscribe();
    };
  }, [refresh]);

  return { visits, isLoading, error, dataSource: 'cache' as DataSource };
}

export function useHouseholds() {
  const [households, setHouseholds] = useState<(Household & { _pending?: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataSource = useDataSource();

  const refresh = useCallback(async () => {
    const database = await getLocalFirstDB();
    const documents = await database.households.find().exec();
    setHouseholds(
      documents
        .map((document) => document.toMutableJSON() as LocalHousehold)
        .filter((household) => !household.deletedAt)
        .map(toHouseholdView)
        .sort((left, right) => left.address.localeCompare(right.address))
    );
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    const start = async () => {
      try {
        const database = await getLocalFirstDB();
        if (cancelled) return;
        await refresh();
        subscription = database.households.$.subscribe(() => void refresh());
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
      subscription?.unsubscribe();
    };
  }, [refresh]);

  const mutate = useCallback(async () => {
    await syncLocalFirst();
    await refresh();
  }, [refresh]);

  return { households, isLoading, error, dataSource, mutate };
}