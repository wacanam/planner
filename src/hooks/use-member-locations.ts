// src/hooks/use-member-locations.ts
'use client';

/**
 * Member Locations Hooks (Privacy Compliance Mode)
 *
 * In accordance with Data Privacy regulations and Branch Guidelines:
 * Central live member location broadcasting and tracking across congregation members
 * has been excised from the cloud database.
 *
 * The user's own local GPS dot (for territory navigation) remains active via useUserLocation,
 * but is strictly client-side and never broadcast to other users.
 */

import type { Group, SharedMemberLocation } from '@/types/api';
import type { SessionUser } from './use-current-user';

export function useMemberLocations(
  _congregationId?: string | null | undefined,
  _user?: SessionUser | null | undefined,
  _groups: Group[] = []
) {
  return {
    memberLocations: [] as SharedMemberLocation[],
    allLocations: [] as SharedMemberLocation[],
    activeSharingCount: 0,
    isLoading: false,
    error: null as string | null,
  };
}

export interface UseLocationSharingProps {
  congregationId?: string | null | undefined;
  user?: SessionUser | null | undefined;
  groups?: Group[];
  defaultDurationMinutes?: number;
}

export function useLocationSharing(_props?: UseLocationSharingProps) {
  return {
    isSharing: false,
    isLocating: false,
    durationMinutes: 0,
    expiresAt: null as string | null,
    currentCoords: null as { lat: number; lng: number } | null,
    error: null as string | null,
    toggleShareLocation: () => {},
    startSharing: () => {},
    stopSharing: async () => {},
    extendDuration: () => {},
  };
}
