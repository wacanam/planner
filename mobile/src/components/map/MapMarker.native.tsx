import { memo, useCallback } from 'react';

import { Marker } from 'react-native-maps';
import { useTheme } from '@/context/ThemeContext';
import { triggerHaptic } from '@/lib/sound';
import type { MapMarkerItem } from './types';

export interface MapMarkerProps {
  marker: MapMarkerItem;
}

export const MapMarker = memo(
  ({ marker }: MapMarkerProps) => {
    const { colors } = useTheme();

    const handlePress = useCallback(() => {
      triggerHaptic('light');
      marker.onPress?.();
    }, [marker]);

    const lat = Number(marker.coordinate?.latitude);
    const lng = Number(marker.coordinate?.longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng) || (lat === 0 && lng === 0)) {
      return null;
    }

    return (
      <Marker
        key={marker.id}
        coordinate={{ latitude: lat, longitude: lng }}
        title={marker.title}
        description={marker.description}
        pinColor={marker.color || colors.primary}
        tracksViewChanges={false}
        onPress={handlePress}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.marker.id === nextProps.marker.id &&
      prevProps.marker.coordinate.latitude === nextProps.marker.coordinate.latitude &&
      prevProps.marker.coordinate.longitude === nextProps.marker.coordinate.longitude &&
      prevProps.marker.color === nextProps.marker.color &&
      prevProps.marker.title === nextProps.marker.title &&
      prevProps.marker.description === nextProps.marker.description
    );
  }
);

MapMarker.displayName = 'MapMarker';
