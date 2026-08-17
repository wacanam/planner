'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export interface UserLocationState {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number | null;
}

export function useUserLocation() {
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState<UserLocationState | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastHeadingRef = useRef<number | null>(null);

  // Smooth heading updates to avoid micro-jitter
  const updateHeading = useCallback((newHeading: number) => {
    const prev = lastHeadingRef.current;
    if (prev == null) {
      lastHeadingRef.current = newHeading;
      setHeading(Math.round(newHeading));
      return;
    }

    // Handle 360 wrap-around
    let diff = (newHeading - prev) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    // Smooth by 30% lerp
    const smoothed = (prev + diff * 0.35 + 360) % 360;
    lastHeadingRef.current = smoothed;
    setHeading(Math.round(smoothed));
  }, []);

  const handleDeviceOrientation = useCallback(
    (event: DeviceOrientationEvent) => {
      // 1. iOS Safari compass heading (0-360 degrees clockwise from magnetic North)
      const iosHeading = (event as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof iosHeading === 'number' && !Number.isNaN(iosHeading)) {
        updateHeading(iosHeading);
        return;
      }

      // 2. Android / standard absolute orientation
      if (event.absolute && typeof event.alpha === 'number' && !Number.isNaN(event.alpha)) {
        // alpha is 0 when pointing North, increasing counter-clockwise
        const compassHeading = (360 - event.alpha) % 360;
        updateHeading(compassHeading);
        return;
      }

      // 3. Relative orientation fallback
      if (typeof event.alpha === 'number' && !Number.isNaN(event.alpha)) {
        const compassHeading = (360 - event.alpha) % 360;
        updateHeading(compassHeading);
      }
    },
    [updateHeading]
  );

  const startTracking = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      const msg = 'Geolocation is not supported by your browser.';
      setError(msg);
      toast.error(msg);
      return;
    }

    // 1. Request iOS 13+ device orientation permission if required
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
        .requestPermission === 'function'
    ) {
      try {
        const permissionState = await (
          DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }
        ).requestPermission();
        if (permissionState !== 'granted') {
          console.warn('Compass orientation permission denied on iOS.');
        }
      } catch (e) {
        console.warn('Error requesting orientation permission:', e);
      }
    }

    // 2. Listen for compass / orientation events
    window.addEventListener('deviceorientationabsolute', handleDeviceOrientation as EventListener, true);
    window.addEventListener('deviceorientation', handleDeviceOrientation, true);

    // 3. Start Geolocation Watcher
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading: gpsHeading } = position.coords;
        setLocation({
          lat: latitude,
          lng: longitude,
          accuracy,
          heading: gpsHeading ?? lastHeadingRef.current,
        });
        if (gpsHeading != null && !Number.isNaN(gpsHeading)) {
          updateHeading(gpsHeading);
        }
        setError(null);
        setIsTracking(true);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setError(err.message);
        toast.error(`Location tracking error: ${err.message}`);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 15000,
      }
    );

    watchIdRef.current = id;
    setIsTracking(true);
    toast.success('Live location & compass tracking active');
  }, [handleDeviceOrientation, updateHeading]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('deviceorientationabsolute', handleDeviceOrientation as EventListener, true);
      window.removeEventListener('deviceorientation', handleDeviceOrientation, true);
    }
    setIsTracking(false);
    setLocation(null);
    setHeading(null);
    lastHeadingRef.current = null;
  }, [handleDeviceOrientation]);

  const toggleTracking = useCallback(() => {
    if (isTracking) {
      stopTracking();
      toast.info('Location tracking stopped');
    } else {
      startTracking();
    }
  }, [isTracking, startTracking, stopTracking]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientationabsolute', handleDeviceOrientation as EventListener, true);
        window.removeEventListener('deviceorientation', handleDeviceOrientation, true);
      }
    };
  }, [handleDeviceOrientation]);

  return {
    isTracking,
    location,
    heading,
    error,
    startTracking,
    stopTracking,
    toggleTracking,
  };
}
