'use client';

import { collection, doc, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';
import { filterVisibleMemberLocations } from '@/lib/permissions';
import type { Group, SharedMemberLocation } from '@/types/api';
import type { SessionUser } from './use-current-user';

function memberLocationDocId(congregationId: string, userId: string): string {
  return `${congregationId}_${userId}`;
}

/**
 * Ultra-lightweight background audio keepalive.
 * Plays a tiny inaudible buffer ONLY when the document is hidden/backgrounded
 * to keep the mobile browser process alive without consuming CPU/battery in foreground.
 */
function createSilentAudioKeepalive(): {
  play: () => void;
  stop: () => void;
  isPlaying: () => boolean;
} {
  if (typeof window === 'undefined') {
    return { play: () => {}, stop: () => {}, isPlaying: () => false };
  }

  let audioEl: HTMLAudioElement | null = null;
  let active = false;

  try {
    // 44-byte silent mono WAV base64
    const silentWavBase64 =
      'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP//';
    audioEl = new Audio(silentWavBase64);
    audioEl.loop = true;
    audioEl.volume = 0.001; // Inaudible & ultra-low CPU
  } catch {
    // Audio unavailable in this environment
  }

  return {
    play: () => {
      if (!audioEl || active) return;
      active = true;
      audioEl.play().catch(() => {
        // Autoplay restrictions handled gracefully
      });
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: 'Live Location Sharing',
            artist: 'Ministry Planner',
            album: 'Field Service',
          });
          navigator.mediaSession.playbackState = 'playing';
        } catch {
          // Ignored
        }
      }
    },
    stop: () => {
      if (!audioEl || !active) return;
      active = false;
      try {
        audioEl.pause();
        audioEl.currentTime = 0;
      } catch {
        // Ignored
      }
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'none';
        } catch {
          // Ignored
        }
      }
    },
    isPlaying: () => active,
  };
}

/**
 * Ultra-lightweight Web Worker heartbeat.
 * Runs on a separate thread with a relaxed 15s interval to minimize wakeups and battery drain.
 */
function createWorkerHeartbeat(onTick: () => void): { start: () => void; stop: () => void } {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return { start: () => {}, stop: () => {} };
  }

  let worker: Worker | null = null;
  let objectUrl: string | null = null;

  return {
    start: () => {
      if (worker) return;
      try {
        const code = `
          let timer = null;
          self.onmessage = function(e) {
            if (e.data === 'start') {
              if (timer) clearInterval(timer);
              timer = setInterval(function() {
                self.postMessage('tick');
              }, 15000); // Relaxed 15s interval saves CPU & battery
            } else if (e.data === 'stop') {
              if (timer) clearInterval(timer);
              timer = null;
            }
          };
        `;
        const blob = new Blob([code], { type: 'application/javascript' });
        objectUrl = URL.createObjectURL(blob);
        worker = new Worker(objectUrl);
        worker.onmessage = (e) => {
          if (e.data === 'tick') {
            onTick();
          }
        };
        worker.postMessage('start');
      } catch (err) {
        console.warn('Web Worker heartbeat initialization notice:', err);
      }
    },
    stop: () => {
      if (worker) {
        try {
          worker.postMessage('stop');
          worker.terminate();
        } catch {
          // Ignored
        }
        worker = null;
      }
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // Ignored
        }
        objectUrl = null;
      }
    },
  };
}

export function useMemberLocations(
  congregationId: string | null | undefined,
  user: SessionUser | null | undefined,
  groups: Group[] = []
) {
  const [allLocations, setAllLocations] = useState<SharedMemberLocation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(congregationId));
  const [error, setError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  // Periodically tick every 10s to reactively expire locations on client
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

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
            durationMinutes: data.durationMinutes != null ? Number(data.durationMinutes) : null,
            expiresAt: data.expiresAt || null,
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

  // Filter based on user's role, assigned groups, active status, and expiry
  const memberLocations = useMemo(() => {
    if (!user?.id) return [];

    // Ensure current user's location instantly reflects any local profile updates (avatar, name)
    const enrichedLocations = allLocations.map((loc) => {
      if (loc.userId === user.id) {
        return {
          ...loc,
          userName: user.name || loc.userName,
          userEmail: user.email || loc.userEmail,
          avatarUrl: user.avatarUrl !== undefined ? user.avatarUrl : loc.avatarUrl,
        };
      }
      return loc;
    });

    const filtered = filterVisibleMemberLocations(user, groups, enrichedLocations, nowTick);

    // Sort: active sharing by lastSeenAt / updatedAt descending
    return filtered.sort((a, b) => {
      return (
        new Date(b.lastSeenAt || b.updatedAt).getTime() -
        new Date(a.lastSeenAt || a.updatedAt).getTime()
      );
    });
  }, [user, groups, allLocations, nowTick]);

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
  defaultDurationMinutes?: number;
}

export function useLocationSharing({
  congregationId,
  user,
  groups = [],
  defaultDurationMinutes = 120, // Default 2 hours
}: UseLocationSharingProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState<number>(defaultDurationMinutes);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
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
  const expiresAtRef = useRef<string | null>(expiresAt);
  expiresAtRef.current = expiresAt;
  const durationMinutesRef = useRef<number>(durationMinutes);
  durationMinutesRef.current = durationMinutes;
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wakeLockRef = useRef<unknown>(null);
  const audioKeepaliveRef = useRef<ReturnType<typeof createSilentAudioKeepalive> | null>(null);
  const workerHeartbeatRef = useRef<ReturnType<typeof createWorkerHeartbeat> | null>(null);

  // Find user's service group
  const userGroup = useMemo(() => {
    if (!user?.id || groups.length === 0) return null;
    return (
      groups.find(
        (g) =>
          g.id === user.groupId ||
          g.overseerId === user.id ||
          g.assistantOverseerId === user.id ||
          g.members?.some((m) => m.userId === user.id || m.id === user.id)
      ) || null
    );
  }, [user, groups]);

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  // Screen Wake Lock acquisition (Only acquired when tab is active and visible to conserve battery)
  const acquireWakeLock = useCallback(async () => {
    if (
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible' &&
      typeof navigator !== 'undefined' &&
      'wakeLock' in navigator
    ) {
      try {
        if (!wakeLockRef.current) {
          const sentinel = await (
            navigator as unknown as { wakeLock: { request: (type: string) => Promise<unknown> } }
          ).wakeLock.request('screen');
          wakeLockRef.current = sentinel;
        }
      } catch {
        // WakeLock rejection handled gracefully
      }
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      try {
        const sentinel = wakeLockRef.current as { release?: () => Promise<void> };
        if (typeof sentinel.release === 'function') {
          void sentinel.release();
        }
      } catch {
        // Ignored
      }
      wakeLockRef.current = null;
    }
  }, []);

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
      const iosHeading = (event as unknown as { webkitCompassHeading?: number })
        .webkitCompassHeading;
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

  // Sync GPS to Firestore with battery-optimized distance/time thresholds
  const syncLocationToFirestore = useCallback(
    async (
      coords: { lat: number; lng: number; accuracy?: number; heading?: number | null },
      sharing: boolean,
      expTime?: string | null,
      durMins?: number | null
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
          durationMinutes: durMins !== undefined ? durMins : durationMinutesRef.current,
          expiresAt: expTime !== undefined ? expTime : expiresAtRef.current,
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

  const stopSharing = useCallback(async () => {
    clearExpiryTimer();
    releaseWakeLock();

    if (audioKeepaliveRef.current) {
      audioKeepaliveRef.current.stop();
      audioKeepaliveRef.current = null;
    }

    if (workerHeartbeatRef.current) {
      workerHeartbeatRef.current.stop();
      workerHeartbeatRef.current = null;
    }

    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener(
        'deviceorientationabsolute',
        handleDeviceOrientation as EventListener,
        true
      );
      window.removeEventListener('deviceorientation', handleDeviceOrientation, true);
    }
    setIsSharing(false);
    setIsLocating(false);
    setExpiresAt(null);

    if (congregationId && user?.id) {
      try {
        const firestore = getPlannerFirestore();
        const docId = memberLocationDocId(congregationId, user.id);
        const docRef = doc(firestore, FIRESTORE_COLLECTIONS.memberLocations, docId);
        await updateDoc(docRef, {
          isSharing: false,
          expiresAt: null,
          updatedAt: nowIso(),
          lastSeenAt: nowIso(),
        });
      } catch (err) {
        console.warn('Failed to update sharing state:', err);
      }
    }

    toast.info('Location sharing stopped');
  }, [congregationId, user?.id, clearExpiryTimer, releaseWakeLock, handleDeviceOrientation]);

  // Request high-accuracy position snapshot (used during background worker ticks & visibility resume)
  const triggerBackgroundPositionCheck = useCallback(() => {
    if (!isSharingRef.current || typeof navigator === 'undefined' || !navigator.geolocation) return;

    // Check expiration
    if (expiresAtRef.current && new Date(expiresAtRef.current).getTime() <= Date.now()) {
      void stopSharing();
      return;
    }

    // Only request fresh position if more than 15 seconds elapsed since last GPS write
    const last = lastWrittenCoordsRef.current;
    const now = Date.now();
    if (last && now - last.time < 15000) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
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

        // Smart battery write check:
        // - If moved > 8 meters (approx 0.00008 deg): sync every ~8s
        // - If stationary: sync only every ~35s to refresh lastSeenAt
        const movedSignificantly =
          !last ||
          Math.abs(latitude - last.lat) > 0.00008 ||
          Math.abs(longitude - last.lng) > 0.00008;
        const timeElapsed = !last || now - last.time > 35000;

        if (movedSignificantly || timeElapsed) {
          syncLocationToFirestore(coords, true, expiresAtRef.current, durationMinutesRef.current);
        }
      },
      (err) => {
        // Silent catch in background to avoid spamming alerts
        console.debug('Background GPS tick notice:', err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );
  }, [stopSharing, syncLocationToFirestore]);

  // Check initial sharing status in Firestore and handle remote expiration
  useEffect(() => {
    if (!congregationId || !user?.id) return;

    const firestore = getPlannerFirestore();
    const docId = memberLocationDocId(congregationId, user.id);
    const docRef = doc(firestore, FIRESTORE_COLLECTIONS.memberLocations, docId);

    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const remoteIsSharing = Boolean(data.isSharing);
        const remoteExpiresAt = data.expiresAt || null;
        const remoteDuration = data.durationMinutes != null ? Number(data.durationMinutes) : null;

        if (remoteExpiresAt && new Date(remoteExpiresAt).getTime() <= Date.now()) {
          // Already expired
          if (isSharingRef.current) {
            void stopSharing();
          }
          return;
        }

        if (remoteDuration) {
          setDurationMinutes(remoteDuration);
        }
        if (remoteExpiresAt) {
          setExpiresAt(remoteExpiresAt);
        }

        if (remoteIsSharing && !isSharingRef.current && !watchIdRef.current) {
          setIsSharing(true);
        } else if (!remoteIsSharing && isSharingRef.current) {
          void stopSharing();
        }
      }
    });

    return () => unsub();
  }, [congregationId, user?.id, stopSharing]);

  // Reactively sync user profile updates (avatarUrl, name) to Firestore if currently sharing
  useEffect(() => {
    if (!isSharing || !congregationId || !user?.id || !currentCoords) return;
    void syncLocationToFirestore(
      currentCoords,
      true,
      expiresAtRef.current,
      durationMinutesRef.current
    );
  }, [
    user?.avatarUrl,
    user?.name,
    isSharing,
    congregationId,
    user?.id,
    currentCoords,
    syncLocationToFirestore,
  ]);

  const startSharing = useCallback(
    async (mins?: number) => {
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

      const activeMins = mins ?? durationMinutesRef.current ?? 120;
      setDurationMinutes(activeMins);
      const calculatedExpiresAt = new Date(Date.now() + activeMins * 60 * 1000).toISOString();
      setExpiresAt(calculatedExpiresAt);
      expiresAtRef.current = calculatedExpiresAt;
      durationMinutesRef.current = activeMins;

      // Setup client auto-expiry timer
      clearExpiryTimer();
      expiryTimerRef.current = setTimeout(
        () => {
          toast.info('Location sharing expired.');
          void stopSharing();
        },
        activeMins * 60 * 1000
      );

      // Acquire Screen Wake Lock if visible
      void acquireWakeLock();

      // Setup background audio keepalive instance (only activated when tab is hidden)
      if (!audioKeepaliveRef.current) {
        audioKeepaliveRef.current = createSilentAudioKeepalive();
      }

      // Setup Web Worker background timer heartbeat
      if (!workerHeartbeatRef.current) {
        workerHeartbeatRef.current = createWorkerHeartbeat(() => {
          triggerBackgroundPositionCheck();
        });
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

      window.addEventListener(
        'deviceorientationabsolute',
        handleDeviceOrientation as EventListener,
        true
      );
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

          // Check if expired
          if (expiresAtRef.current && new Date(expiresAtRef.current).getTime() <= Date.now()) {
            void stopSharing();
            return;
          }

          // Battery-smart write throttling:
          // Write immediately if moved > 8 meters or > 35 seconds elapsed
          const last = lastWrittenCoordsRef.current;
          const now = Date.now();
          const movedSignificantly =
            !last ||
            Math.abs(latitude - last.lat) > 0.00008 ||
            Math.abs(longitude - last.lng) > 0.00008;
          const minTimePassed = !last || now - last.time > 8000;
          const heartbeatTimePassed = !last || now - last.time > 35000;

          if ((movedSignificantly && minTimePassed) || heartbeatTimePassed) {
            syncLocationToFirestore(coords, true, calculatedExpiresAt, activeMins);
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
          maximumAge: 4000,
          timeout: 20000,
        }
      );

      watchIdRef.current = id;
      setIsSharing(true);

      const hours = Math.floor(activeMins / 60);
      const remainingMins = activeMins % 60;
      const durationLabel =
        hours > 0 && remainingMins > 0
          ? `${hours}h ${remainingMins}m`
          : hours > 0
            ? `${hours} hour${hours > 1 ? 's' : ''}`
            : `${remainingMins} minutes`;

      toast.success(
        `Live location sharing active for ${durationLabel} (Background energy-optimized)`
      );
    },
    [
      congregationId,
      user?.id,
      clearExpiryTimer,
      acquireWakeLock,
      triggerBackgroundPositionCheck,
      handleDeviceOrientation,
      syncLocationToFirestore,
      stopSharing,
    ]
  );

  const extendDuration = useCallback(
    (additionalMins: number) => {
      if (!isSharing) return;
      const currentExpiryMs = expiresAtRef.current
        ? new Date(expiresAtRef.current).getTime()
        : Date.now();
      const baseMs = Math.max(Date.now(), currentExpiryMs);
      const newExpiryMs = baseMs + additionalMins * 60 * 1000;
      const newExpiresAt = new Date(newExpiryMs).toISOString();
      const newTotalMins = Math.round((newExpiryMs - Date.now()) / (60 * 1000));

      setExpiresAt(newExpiresAt);
      setDurationMinutes(newTotalMins);
      expiresAtRef.current = newExpiresAt;
      durationMinutesRef.current = newTotalMins;

      clearExpiryTimer();
      expiryTimerRef.current = setTimeout(() => {
        toast.info('Location sharing expired.');
        void stopSharing();
      }, newExpiryMs - Date.now());

      if (currentCoords) {
        syncLocationToFirestore(currentCoords, true, newExpiresAt, newTotalMins);
      }

      toast.success(`Location sharing extended by ${additionalMins}m`);
    },
    [isSharing, currentCoords, syncLocationToFirestore, stopSharing, clearExpiryTimer]
  );

  const toggleShareLocation = useCallback(
    (mins?: number) => {
      if (isSharing) {
        void stopSharing();
      } else {
        void startSharing(mins);
      }
    },
    [isSharing, startSharing, stopSharing]
  );

  // Dynamic Energy-Saver Lifecycle:
  // - In Foreground: Pause audio keepalive and worker to consume 0% background overhead.
  // - In Background (hidden): Engage ultra-low-power audio keepalive and worker heartbeat.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (!isSharingRef.current) return;

      if (document.visibilityState === 'visible') {
        // Returned to foreground:
        // 1. Pause background audio keepalive (saves battery & audio engine decoding)
        audioKeepaliveRef.current?.stop();
        // 2. Stop worker heartbeat (watchPosition handles foreground)
        workerHeartbeatRef.current?.stop();
        // 3. Re-acquire Screen Wake Lock
        void acquireWakeLock();
        // 4. Quick fresh position check
        triggerBackgroundPositionCheck();
      } else {
        // Went to background (hidden / switched apps / changed tab):
        // 1. Release wake lock to allow screen sleep
        releaseWakeLock();
        // 2. Start lightweight silent audio keepalive for mobile OS background execution
        audioKeepaliveRef.current?.play();
        // 3. Start relaxed Web Worker heartbeat
        workerHeartbeatRef.current?.start();
      }
    };

    const handlePageShow = () => {
      if (isSharingRef.current) {
        void acquireWakeLock();
        audioKeepaliveRef.current?.stop();
        triggerBackgroundPositionCheck();
      }
    };

    const handlePageHide = () => {
      if (isSharingRef.current) {
        releaseWakeLock();
        audioKeepaliveRef.current?.play();
        workerHeartbeatRef.current?.start();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [acquireWakeLock, releaseWakeLock, triggerBackgroundPositionCheck]);

  // Clean up watchers on unmount
  useEffect(() => {
    return () => {
      clearExpiryTimer();
      releaseWakeLock();
      audioKeepaliveRef.current?.stop();
      workerHeartbeatRef.current?.stop();

      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener(
          'deviceorientationabsolute',
          handleDeviceOrientation as EventListener,
          true
        );
        window.removeEventListener('deviceorientation', handleDeviceOrientation, true);
      }
    };
  }, [handleDeviceOrientation, clearExpiryTimer, releaseWakeLock]);

  return {
    isSharing,
    isLocating,
    durationMinutes,
    expiresAt,
    currentCoords,
    error,
    toggleShareLocation,
    startSharing,
    stopSharing,
    extendDuration,
  };
}
