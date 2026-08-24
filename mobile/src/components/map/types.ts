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

export interface ClusterProperties {
  cluster: boolean;
  cluster_id: number;
  point_count: number;
  point_count_abbreviated: string | number;
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
  onRegionChangeComplete?: (region: MapRegion) => void;
  children?: React.ReactNode;

  /**
   * Clustering configurations
   */
  enableClustering?: boolean;
  clusterRadius?: number;
  clusterMaxZoom?: number;
  clusterMinPoints?: number;
  clusterColor?: string;
  clusterTextColor?: string;
  onClusterPress?: (clusterId: number, coordinate: MapCoordinate, expansionZoom: number) => void;
}

export interface TerritoryMapViewRef {
  fitToCoordinates: (coordinates: MapCoordinate[], options?: FitOptions) => void;
  animateToRegion: (region: MapRegion, duration?: number) => void;
}

