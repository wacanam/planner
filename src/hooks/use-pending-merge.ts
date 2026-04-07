/**
 * Offline-first hook utilities.
 * Merges pending items (IDB) with cached/API data.
 */

import { getPendingVisits, getPendingHouseholds } from '@/lib/visits-store';
import type { Visit, Household } from '@/types/api';

/**
 * Merge pending visits with API visits.
 * Pending items are shown with a "pending" indicator.
 */
export async function mergePendingVisits(apiVisits: Visit[]): Promise<(Visit & { _pending?: boolean })[]> {
  try {
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

    return [...pendingVisits, ...apiVisits];
  } catch (err) {
    console.error('[Hook] Failed to merge pending visits:', err);
    return apiVisits;
  }
}

/**
 * Merge pending households with API households.
 */
export async function mergePendingHouseholds(apiHouseholds: Household[]): Promise<(Household & { _pending?: boolean })[]> {
  try {
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

    return [...pendingHouseholds, ...apiHouseholds];
  } catch (err) {
    console.error('[Hook] Failed to merge pending households:', err);
    return apiHouseholds;
  }
}
