'use client';

import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';
import { filterVisibleMemberLocations, isGroupOverseer, isGroupOverseerAssistant, isTerritoryServant } from '@/lib/permissions';
import type { Group, SharedMemberLocation } from '@/types/api';
import type { SessionUser } from './use-current-user';

function memberLocationDocId(congregationId: string, userId: string): string {
  return `${congregationId}_${userId}`;
}

export function useMemberLocations(
  congregationId: string | null | undefined,
  user: SessionUser | null | undefined,
  groups: Group[] = []
) {
  const [allLocations, setAllLocations] = useState<SharedMemberLocation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(congregationId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!congregationId) {
      setAllLocations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const firestore = getPlannerFirestore();
    const locQuery = query(
      collection(firestore, FIRESTORE_COLLECTIONS.memberLocations),
      where('congregationId', '==', congregationId)
    );

    const unsubscribe = onSnapshot(
      locQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        const locations: SharedMemberLocation[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: data.userId || d.id,
            congregationId: data.congregationId || congregationId,
            userName: data.userName || 'Publisher',
            userEmail: data.userEmail || null,
            avatarUrl: data.avatarUrl || null,
            groupId: data.groupId || null,
            groupName: data.groupName || null,
            latitude: Number(data.latitude ?? 0),
            longitude: Number(data.longitude ?? 0),
            accuracy: data.accuracy != null ? Number(data.accuracy) : null,
            heading: data.heading != null ? Number(data.heading) : null,
            isSharing: Boolean(data.isSharing),
            updatedAt: data.updatedAt || nowIso(),
            lastSeenAt: data.lastSeenAt || data.updatedAt || nowIso(),
          };
        });

        setAllLocations(locations);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        console.warn('Member locations subscription error:', err.message);
        setError(err.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [congregationId]);

  // Filter based on user's role and assigned groups
  const memberLocations = useMemo(() => {
    if (!user?.id) return [];
    const filtered = filterVisibleMemberLocations(user, groups, allLocations);

    // Sort: active sharing first, then by lastSeenAt / updatedAt descending
    return filtered.sort((a, b) => {
      if (a.isSharing && !b.isSharing) return -1;
      if (!a.isSharing && b.isSharing) return 1;
      return new Date(b.lastSeenAt || b.updatedAt).getTime() - new Date(a.lastSeenAt || a.updatedAt).getTime();
    });
  }, [user, groups, allLocations]);

  const activeSharingCount = useMemo(() => {
    return memberLocations.filter((l) => l.isSharing && l.userId !== user?.id).length;
  }, [memberLocations, user?.id]);

  return {
    memberLocations,
    allLocations,
    activeSharingCount,
    isLoading,
    error,
  };
}

interface UseLocationSharingProps {
  congregationId: string | null | undefined;
  user: SessionUser | null | undefined;
  groups?: Group[];
}

export function useLocationSharing({ congregationId, user, groups = [] }: UseLocationSharingProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
    heading?: number | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastHeadingRef = useRef<number | null>(null);
  const lastWrittenCoordsRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const isSharingRef = useRef(isSharing);
  isSharingRef.current = isSharing;

  // Find user's service group
  const userGroup = useMemo(() => {
    if (!user?.id || groups.length === 0) return null;
    return groups.find(
      (g) =>
        g.id === user.groupId ||
        g.overseerId === user.id ||
        g.assistantOverseerId === user.id ||
        g.members?.some((m) => m.userId === user.id || m.id === user.id)
    ) || null;
  }, [user, groups]);

  // Check initial sharing status in Firestore
  useEffect(() => {
    if (!congregationId || !user?.id) return;

    const firestore = getPlannerFirestore();
    const docId = memberLocationDocId(congregationId, user.id);
    const docRef = doc(firestore, FIRESTORE_COLLECTIONS.memberLocations, docId);

    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.isSharing === 'boolean' && data.isSharing !== isSharingRef.current) {
          // Sync state if remote state changed
          if (data.isSharing && !watchIdRef.current) {
            // Started sharing remotely / from another device
            setIsSharing(true);
          }
        }
      }
    });

    return () => unsub();
  }, [congregationId, user?.id]);

  // Smooth heading updates
  const updateHeading = useCallback((newHeading: number) => {
    const prev = lastHeadingRef.current;
    if (prev == null) {
      lastHeadingRef.current = newHeading;
      return;
    }
    let diff = (newHeading - prev) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    if (Math.abs(diff) < 0.5) return;
    lastHeadingRef.current = Math.round((prev + diff * 0.35 + 360) % 360);
  }, []);

  const handleDeviceOrientation = useCallback(
    (event: DeviceOrientationEvent) => {
      const iosHeading = (event as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof iosHeading === 'number' && !Number.isNaN(iosHeading)) {
        updateHeading(iosHeading);
        return;
      }
      if (event.absolute && typeof event.alpha === 'number' && !Number.isNaN(event.alpha)) {
        updateHeading((360 - event.alpha) % 360);
        return;
      }
      if (typeof event.alpha === 'number' && !Number.isNaN(event.alpha)) {
        updateHeading((360 - event.alpha) % 360);
      }
    },
    [updateHeading]
  );

  // Sync GPS to Firestore
  const syncLocationToFirestore = useCallback(
    async (
      coords: { lat: number; lng: number; accuracy?: number; heading?: number | null },
      sharing: boolean
    ) => {
      if (!congregationId || !user?.id) return;

      try {
        const firestore = getPlannerFirestore();
        const docId = memberLocationDocId(congregationId, user.id);
        const docRef = doc(firestore, FIRESTORE_COLLECTIONS.memberLocations, docId);
        const now = nowIso();

        const payload: SharedMemberLocation = {
          id: docId,
          userId: user.id,
          congregationId,
          userName: user.name || user.email || 'Publisher',
          userEmail: user.email || null,
          avatarUrl: user.avatarUrl || null,
          groupId: userGroup?.id || user.groupId || null,
          groupName: userGroup?.name || null,
          latitude: coords.lat,
          longitude: coords.lng,
          accuracy: coords.accuracy ?? null,
          heading: coords.heading ?? null,
          isSharing: sharing,
          updatedAt: now,
          lastSeenAt: now,
        };

        await setDoc(docRef, payload, { merge: true });
        lastWrittenCoordsRef.current = { lat: coords.lat, lng: coords.lng, time: Date.now() };
      } catch (err) {
        console.warn('Failed to sync location to Firestore:', err);
      }
    },
    [congregationId, user, userGroup]
  );

  const startSharing = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      const msg = 'Geolocation is not supported by your browser.';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!congregationId || !user?.id) {
      toast.error('You must belong to an active congregation to share location.');
      return;
    }

    setIsLocating(true);

    // Request iOS orientation permission if available
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
        .requestPermission === 'function'
    ) {
      try {
        await (
          DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }
        ).requestPermission();
      } catch {
        // Ignored
      }
    }

    window.addEventListener('deviceorientationabsolute', handleDeviceOrientation as EventListener, true);
    window.addEventListener('deviceorientation', handleDeviceOrientation, true);

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading: gpsHeading } = position.coords;
        const currentH = gpsHeading ?? lastHeadingRef.current;
        const coords = {
          lat: latitude,
          lng: longitude,
          accuracy,
          heading: currentH,
        };
        setCurrentCoords(coords);
        setIsLocating(false);
        setIsSharing(true);
        setError(null);

        // Throttle writes: write if moved > 3 meters or > 8 seconds elapsed
        const last = lastWrittenCoordsRef.current;
        const now = Date.now();
        const shouldWrite =
          !last ||
          now - last.time > 8000 ||
          Math.abs(latitude - last.lat) > 0.00003 ||
          Math.abs(longitude - last.lng) > 0.00003;

        if (shouldWrite) {
          syncLocationToFirestore(coords, true);
        }
      },
      (err) => {
        console.warn('Location watch error:', err.message);
        setError(err.message);
        toast.error(`Location tracking error: ${err.message}`);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 20000,
      }
    );

    watchIdRef.current = id;
    setIsSharing(true);
    toast.success('Live location sharing active (Visible to Group Overseer & Servants)');
  }, [congregationId, user?.id, handleDeviceOrientation, syncLocationToFirestore]);

  const stopSharing = useCallback(async () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('deviceorientationabsolute', handleDeviceOrientation as EventListener, true);
      window.removeEventListener('deviceorientation', handleDeviceOrientation, true);
    }
    setIsSharing(false);
    setIsLocating(false);

    if (congregationId && user?.id) {
      try {
        const firestore = getPlannerFirestore();
        const docId = memberLocationDocId(congregationId, user.id);
        const docRef = doc(firestore, FIRESTORE_COLLECTIONS.memberLocations, docId);
        await updateDoc(docRef, {
          isSharing: false,
          updatedAt: nowIso(),
          lastSeenAt: nowIso(),
        });
      } catch (err) {
        console.warn('Failed to update sharing state:', err);
      }
    }

    toast.info('Location sharing disabled');
  }, [congregationId, user?.id, handleDeviceOrientation]);

  const toggleShareLocation = useCallback(() => {
    if (isSharing) {
      stopSharing();
    } else {
      startSharing();
    }
  }, [isSharing, startSharing, stopSharing]);

  // Clean up watchers on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientationabsolute', handleDeviceOrientation as EventListener, true);
        window.removeEventListener('deviceorientation', handleDeviceOrientation, true);
      }
    };
  }, [handleDeviceOrientation]);

  return {
    isSharing,
    isLocating,
    currentCoords,
    error,
    toggleShareLocation,
    startSharing,
    stopSharing,
  };
}
