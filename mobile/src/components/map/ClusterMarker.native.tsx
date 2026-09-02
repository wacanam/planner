import { memo, useCallback, useEffect, useState } from 'react';

import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { useTheme } from '@/context/ThemeContext';
import { triggerHaptic } from '@/lib/sound';
import type { MapCoordinate } from './types';

export interface ClusterMarkerProps {
  clusterId: number;
  coordinate: MapCoordinate;
  pointCount: number;
  clusterColor?: string;
  clusterTextColor?: string;
  onPress?: (clusterId: number, coordinate: MapCoordinate) => void;
}

export const ClusterMarker = memo(
  ({
    clusterId,
    coordinate,
    pointCount,
    clusterColor,
    clusterTextColor,
    onPress,
  }: ClusterMarkerProps) => {
    const { colors } = useTheme();
    // Allow 1 render pass to rasterize custom view, then freeze to prevent GPU snapshot thrashing
    const [tracksViewChanges, setTracksViewChanges] = useState(true);

    useEffect(() => {
      setTracksViewChanges(true);
      const timer = setTimeout(() => {
        setTracksViewChanges(false);
      }, 150);
      return () => clearTimeout(timer);
    }, [pointCount]);

    const handlePress = useCallback(() => {
      triggerHaptic('medium');
      onPress?.(clusterId, coordinate);
    }, [clusterId, coordinate, onPress]);

    const bgColor = clusterColor || colors.primary;
    const textColor = clusterTextColor || '#ffffff';

    // Dynamic sizing based on number of points in cluster
    let size = 20;
    let fontSize = 10;
    if (pointCount >= 100) {
      size = 26;
      fontSize = 11.5;
    } else if (pointCount >= 10) {
      size = 23;
      fontSize = 10.5;
    }

    const displayCount = pointCount > 999 ? `${(pointCount / 1000).toFixed(1)}k` : `${pointCount}`;

    return (
      <Marker
        coordinate={coordinate}
        tracksViewChanges={tracksViewChanges}
        onPress={handlePress}
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View
          style={[
            styles.clusterContainer,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: bgColor,
              borderColor: '#ffffff',
            },
          ]}
        >
          <Text
            style={[
              styles.countText,
              {
                color: textColor,
                fontSize,
              },
            ]}
          >
            {displayCount}
          </Text>
        </View>
      </Marker>
    );
  },
  (prev, next) => {
    return (
      prev.clusterId === next.clusterId &&
      prev.pointCount === next.pointCount &&
      prev.coordinate.latitude === next.coordinate.latitude &&
      prev.coordinate.longitude === next.coordinate.longitude &&
      prev.clusterColor === next.clusterColor &&
      prev.clusterTextColor === next.clusterTextColor
    );
  }
);

ClusterMarker.displayName = 'ClusterMarker';

const styles = StyleSheet.create({
  clusterContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  countText: {
    fontWeight: '700',
    textAlign: 'center',
  },
});
