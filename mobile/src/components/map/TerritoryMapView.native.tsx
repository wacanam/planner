import Constants, { ExecutionEnvironment } from 'expo-constants';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';

import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Polygon, PROVIDER_DEFAULT, type Region, UrlTile } from 'react-native-maps';
import { useTheme } from '@/context/ThemeContext';
import { ClusterMarker } from './ClusterMarker.native';
import { getLongitudeDeltaFromZoom, useSupercluster } from './hooks/useSupercluster';
import { MapMarker } from './MapMarker.native';
import type {
  FitOptions,
  MapCoordinate,
  MapRegion,
  TerritoryMapViewProps,
  TerritoryMapViewRef,
} from './types';

const defaultRegion: MapRegion = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

// Check if running inside Expo Go on Android (where native Google Maps API keys are deprecated/unbundled by Expo)
const isExpoGoOnAndroid =
  Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const TerritoryMapView = forwardRef<TerritoryMapViewRef, TerritoryMapViewProps>(
  (
    {
      boundaryCoordinates = [],
      markers = [],
      initialRegion,
      showsUserLocation = true,
      scrollEnabled = true,
      zoomEnabled = true,
      style,
      polygonStrokeColor,
      polygonFillColor,
      onMapReady,
      onRegionChangeComplete,
      enableClustering = true,
      clusterRadius = 45,
      clusterMaxZoom = 16,
      clusterMinPoints = 2,
      clusterColor,
      clusterTextColor,
      onClusterPress,
      children,
    },
    ref
  ) => {
    const { colors } = useTheme();
    const mapRef = useRef<MapView>(null);
    const [currentRegion, setCurrentRegion] = useState<MapRegion>(
      () => initialRegion || defaultRegion
    );

    const strokeColor = polygonStrokeColor || colors.primary;
    const fillColor = polygonFillColor || `${colors.primary}25`;

    // High performance spatial clustering and viewport culling
    const { clusters, getClusterExpansionZoom } = useSupercluster(markers, currentRegion, {
      enabled: enableClustering,
      radius: clusterRadius,
      maxZoom: clusterMaxZoom,
      minPoints: clusterMinPoints,
      marginRatio: 0.15,
    });

    useImperativeHandle(ref, () => ({
      fitToCoordinates: (coordinates: MapCoordinate[], options?: FitOptions) => {
        if (coordinates.length > 0 && mapRef.current) {
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: options?.edgePadding || { top: 60, right: 60, bottom: 60, left: 60 },
            animated: options?.animated !== false,
          });
        }
      },
      animateToRegion: (region: MapRegion, duration?: number) => {
        if (mapRef.current) {
          setCurrentRegion(region);
          mapRef.current.animateToRegion(region, duration || 500);
        }
      },
    }));

    const handleRegionChangeComplete = useCallback(
      (region: Region) => {
        const nextRegion: MapRegion = {
          latitude: region.latitude,
          longitude: region.longitude,
          latitudeDelta: region.latitudeDelta,
          longitudeDelta: region.longitudeDelta,
        };
        setCurrentRegion(nextRegion);
        onRegionChangeComplete?.(nextRegion);
      },
      [onRegionChangeComplete]
    );

    const handleClusterPress = useCallback(
      (clusterId: number, coordinate: MapCoordinate) => {
        const expansionZoom = getClusterExpansionZoom(clusterId);

        if (mapRef.current) {
          const nextLngDelta = getLongitudeDeltaFromZoom(expansionZoom);
          const ratio = currentRegion.latitudeDelta / (currentRegion.longitudeDelta || 0.02);
          const nextLatDelta = nextLngDelta * (Number.isFinite(ratio) && ratio > 0 ? ratio : 1);

          mapRef.current.animateToRegion(
            {
              latitude: coordinate.latitude,
              longitude: coordinate.longitude,
              latitudeDelta: Math.max(0.0005, nextLatDelta),
              longitudeDelta: Math.max(0.0005, nextLngDelta),
            },
            400
          );
        }

        onClusterPress?.(clusterId, coordinate, expansionZoom);
      },
      [getClusterExpansionZoom, currentRegion, onClusterPress]
    );

    return (
      <View style={[styles.container, style]}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={initialRegion || defaultRegion}
          showsUserLocation={showsUserLocation}
          showsMyLocationButton={false}
          scrollEnabled={scrollEnabled}
          zoomEnabled={zoomEnabled}
          minZoomLevel={5}
          onMapReady={onMapReady}
          onRegionChangeComplete={handleRegionChangeComplete}
        >
          {/* Fallback tile provider for Expo Go on Android where Google Maps native SDK has no API key */}
          {isExpoGoOnAndroid && (
            <UrlTile
              urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maximumZ={19}
              flipY={false}
              zIndex={-1}
            />
          )}

          {/* Boundary Polygon */}
          {boundaryCoordinates.length >= 3 && (
            <Polygon
              coordinates={boundaryCoordinates}
              strokeColor={strokeColor}
              fillColor={fillColor}
              strokeWidth={2.5}
            />
          )}

          {/* Render Spatial Clusters and Memoized Markers */}
          {clusters.map((item) => {
            const [longitude, latitude] = item.geometry.coordinates;

            if (item.properties.cluster) {
              const clusterId = item.properties.cluster_id;
              const pointCount = item.properties.point_count;

              return (
                <ClusterMarker
                  key={`cluster-${clusterId}`}
                  clusterId={clusterId}
                  coordinate={{ latitude, longitude }}
                  pointCount={pointCount}
                  clusterColor={clusterColor}
                  clusterTextColor={clusterTextColor}
                  onPress={handleClusterPress}
                />
              );
            }

            const marker = item.properties.marker;
            return <MapMarker key={`point-${marker.id}`} marker={marker} />;
          })}

          {children}
        </MapView>
      </View>
    );
  }
);

TerritoryMapView.displayName = 'TerritoryMapView';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
