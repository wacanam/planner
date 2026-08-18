// mobile/src/components/map/types.ts
import type React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapMarkerItem {
  id: string;
  coordinate: MapCoordinate;
  title?: string;
  description?: string;
  color?: string;
  onPress?: () => void;
}

export interface FitOptions {
  edgePadding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  animated?: boolean;
}

export interface TerritoryMapViewProps {
  boundaryCoordinates?: MapCoordinate[];
  markers?: MapMarkerItem[];
  initialRegion?: MapRegion;
  showsUserLocation?: boolean;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  style?: StyleProp<ViewStyle>;
  polygonStrokeColor?: string;
  polygonFillColor?: string;
  onMapReady?: () => void;
  children?: React.ReactNode;
}

export interface TerritoryMapViewRef {
  fitToCoordinates: (coordinates: MapCoordinate[], options?: FitOptions) => void;
  animateToRegion: (region: MapRegion, duration?: number) => void;
}
