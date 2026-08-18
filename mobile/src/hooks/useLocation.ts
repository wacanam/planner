// mobile/src/hooks/useLocation.ts
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export interface UserCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
}

export function useLocation(autoRequest = true) {
  const [location, setLocation] = useState<UserCoordinates | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(autoRequest);

  const requestLocation = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setIsLoading(false);
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords: UserCoordinates = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        heading: loc.coords.heading,
      };

      setLocation(coords);
      setIsLoading(false);
      return coords;
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to get location');
      setIsLoading(false);
      return null;
    }
  };

  useEffect(() => {
    if (autoRequest) {
      requestLocation();
    }
  }, [autoRequest]);

  return { location, errorMsg, isLoading, refreshLocation: requestLocation };
}
