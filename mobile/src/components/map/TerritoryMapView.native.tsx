// mobile/src/components/map/TerritoryMapView.native.tsx
import Constants, { ExecutionEnvironment } from 'expo-constants';
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polygon, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';
import { useTheme } from '@/context/ThemeContext';
import { triggerHaptic } from '@/lib/sound';
import type { FitOptions, MapCoordinate, MapRegion, TerritoryMapViewProps, TerritoryMapViewRef } from './types';

const defaultRegion: MapRegion = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

// Check if running inside Expo Go on Android (where native Google Maps API keys are deprecated/unbundled by Expo)
const isExpoGoOnAndroid =
  Platform.OS === 'android' &&
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

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
      children,
    },
    ref
  ) => {
    const { colors } = useTheme();
    const mapRef = useRef<MapView>(null);

    const strokeColor = polygonStrokeColor || colors.primary;
    const fillColor = polygonFillColor || colors.primary + '25';

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
          mapRef.current.animateToRegion(region, duration || 500);
        }
      },
    }));

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
          onMapReady={onMapReady}
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

          {/* Markers */}
          {markers.map((marker) => {
            const lat = Number(marker.coordinate?.latitude);
            const lng = Number(marker.coordinate?.longitude);
            if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;

            return (
              <Marker
                key={marker.id}
                coordinate={{ latitude: lat, longitude: lng }}
                title={marker.title}
                description={marker.description}
                pinColor={marker.color || colors.primary}
                onPress={() => {
                  triggerHaptic('light');
                  marker.onPress?.();
                }}
              />
            );
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
