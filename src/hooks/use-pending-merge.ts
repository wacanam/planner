/**
 * Offline-first hook utilities.
 * Merges pending items (IDB) with cached/API data.
 */

import { readFromIDB } from '@/lib/idb-store';
import { getPendingEncounters, getPendingHouseholds, getPendingVisits } from '@/lib/visits-store';
import type { Encounter, Household, Visit } from '@/types/api';

function ensureArrayData<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value;
  if (
    value &&
    typeof value === 'object' &&
    'data' in value &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: T[] }).data;
  }
  return [];
}

/**
 * Merge pending visits with API visits.
 * Pending items are shown with a "pending" indicator.
 */
export async function mergePendingVisits(
  apiVisits: Visit[]
): Promise<(Visit & { _pending?: boolean })[]> {
  try {
    const visits = ensureArrayData<Visit>(apiVisits);
    const pending = await getPendingVisits();
    const pendingVisits: (Visit & { _pending?: boolean })[] = pending.map((p) => {
      const data = p.data as Record<string, unknown>;
      return {
        id: p.id,
        householdId: (data.householdId as string) || '',
        assignmentId: '',
        outcome: (data.outcome as string) || '',
        householdStatusAfter: (data.householdStatusAfter as string | null) || null,
        notes: (data.notes as string | null) || null,
        duration: (data.duration as number | null) || null,
        literatureLeft: (data.literatureLeft as string | null) || null,
        bibleTopicDiscussed: (data.bibleTopicDiscussed as string | null) || null,
        returnVisitPlanned: (data.returnVisitPlanned as boolean) || false,
        nextVisitDate: (data.nextVisitDate as string | null) || null,
        nextVisitNotes: (data.nextVisitNotes as string | null) || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _pending: true,
      } as Visit & { _pending: boolean };
    });

    return [...pendingVisits, ...visits];
  } catch (err) {
    console.error('[Hook] Failed to merge pending visits:', err);
    return ensureArrayData<Visit>(apiVisits);
  }
}

/**
 * Merge pending households with API households.
 */
export async function mergePendingHouseholds(
  apiHouseholds: Household[]
): Promise<(Household & { _pending?: boolean })[]> {
  try {
    const households = ensureArrayData<Household>(apiHouseholds);
    const pending = await getPendingHouseholds();
    const pendingHouseholds: (Household & { _pending?: boolean })[] = pending.map((p) => {
      const data = p.data as Record<string, unknown>;
      return {
        id: p.id,
        congregationId: '',
        territoryId: (data.territoryId as string | null) || null,
        address: (data.address as string) || '',
        houseNumber: (data.houseNumber as string | null) || null,
        unitNumber: (data.unitNumber as string | null) || null,
        streetName: (data.streetName as string) || '',
        city: (data.city as string) || '',
        postalCode: (data.postalCode as string | null) || null,
        country: (data.country as string | null) || null,
        type: (data.type as string) || 'house',
        floor: (data.floor as number | null) || null,
        notes: (data.notes as string | null) || null,
        latitude: (data.latitude as string | null) || null,
        longitude: (data.longitude as string | null) || null,
        status: 'New',
        lastVisitDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _pending: true,
      } as Household & { _pending: boolean };
    });

    return [...pendingHouseholds, ...households];
  } catch (err) {
    console.error('[Hook] Failed to merge pending households:', err);
    return ensureArrayData<Household>(apiHouseholds);
  }
}

/**
 * Merge pending encounters with API encounters.
 */
export async function mergePendingEncounters(
  apiEncounters: Encounter[]
): Promise<(Encounter & { _pending?: boolean })[]> {
  try {
    const encounters = ensureArrayData<Encounter>(apiEncounters);
    const pending = await getPendingEncounters();
    const cachedHouseholds = ensureArrayData<Household>(
      await readFromIDB<Household[]>('households-cache', 'all')
    );
    const householdMap = new Map(cachedHouseholds.map((household) => [household.id, household]));

    const pendingEncounters: (Encounter & { _pending?: boolean })[] = pending.map((p) => {
      const data = p.data as Record<string, unknown>;
      const householdId = (data.householdId as string | null) ?? null;
      const household = householdId ? householdMap.get(householdId) : null;
      const encounterDate = (data.encounterDate as string | null) ?? new Date().toISOString();

      return {
        id: p.id,
        visitId: (data.visitId as string | null) ?? null,
        householdId,
        userId: '',
        name: (data.name as string | null) ?? null,
        gender: (data.gender as string | null) ?? null,
        ageGroup: (data.ageGroup as string | null) ?? null,
        role: (data.role as string | null) ?? null,
        response: (data.response as string) ?? '',
        languageSpoken: (data.languageSpoken as string | null) ?? null,
        topicDiscussed: (data.topicDiscussed as string | null) ?? null,
        literatureAccepted: (data.literatureAccepted as string | null) ?? null,
        bibleStudyInterest: (data.bibleStudyInterest as boolean) ?? false,
        returnVisitRequested: (data.returnVisitRequested as boolean) ?? false,
        nextVisitNotes: (data.nextVisitNotes as string | null) ?? null,
        notes: (data.notes as string | null) ?? null,
        syncStatus: 'pending',
        offlineCreated: true,
        syncedAt: null,
        createdAt: encounterDate,
        updatedAt: encounterDate,
        householdAddress: household?.address ?? null,
        householdCity: household?.city ?? null,
        visitDate: encounterDate,
        visitOutcome: null,
        _pending: true,
      };
    });

    return [...pendingEncounters, ...encounters];
  } catch (err) {
    console.error('[Hook] Failed to merge pending encounters:', err);
    return ensureArrayData<Encounter>(apiEncounters);
  }
}
