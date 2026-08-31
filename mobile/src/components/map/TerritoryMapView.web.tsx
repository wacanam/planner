// mobile/src/components/map/TerritoryMapView.web.tsx
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
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

declare global {
  interface Window {
    google?: any;
    __google_maps_loading?: boolean;
  }
}

export const TerritoryMapView = forwardRef<TerritoryMapViewRef, TerritoryMapViewProps>(
  (
    {
      boundaryCoordinates = [],
      markers = [],
      initialRegion = defaultRegion,
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
    const { colors, isDark } = useTheme();
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const googleMapRef = useRef<any>(null);
    const polygonRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);

    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    const strokeColor = polygonStrokeColor || colors.primary;
    const fillColor = polygonFillColor || `${colors.primary}33`;

    useImperativeHandle(ref, () => ({
      fitToCoordinates: (coordinates: MapCoordinate[], _options?: FitOptions) => {
        if (!googleMapRef.current || coordinates.length === 0 || !window.google?.maps) return;
        const bounds = new window.google.maps.LatLngBounds();
        coordinates.forEach((pt) => {
          bounds.extend(new window.google.maps.LatLng(pt.latitude, pt.longitude));
        });
        googleMapRef.current.fitBounds(bounds);
      },
      animateToRegion: (region: MapRegion, _duration?: number) => {
        if (!googleMapRef.current || !window.google?.maps) return;
        googleMapRef.current.panTo({ lat: region.latitude, lng: region.longitude });
      },
    }));

    // Initialize Google Map on web container
    useEffect(() => {
      let isMounted = true;

      const initMap = () => {
        if (!mapContainerRef.current || !window.google?.maps || !isMounted) return;

        const centerLat = initialRegion?.latitude || defaultRegion.latitude;
        const centerLng = initialRegion?.longitude || defaultRegion.longitude;

        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: { lat: centerLat, lng: centerLng },
          zoom: 15,
          disableDefaultUI: !scrollEnabled,
          gestureHandling: scrollEnabled ? 'auto' : 'none',
          zoomControl: zoomEnabled,
          mapTypeControl: false,
          streetViewControl: false,
        });

        googleMapRef.current = map;
        onMapReady?.();

        // Draw boundary polygon
        if (boundaryCoordinates.length >= 3) {
          const path = boundaryCoordinates.map((c) => ({ lat: c.latitude, lng: c.longitude }));
          const polygon = new window.google.maps.Polygon({
            paths: path,
            strokeColor: strokeColor,
            strokeOpacity: 0.8,
            strokeWeight: 2.5,
            fillColor: fillColor,
            fillOpacity: 0.25,
            map: map,
          });
          polygonRef.current = polygon;

          const bounds = new window.google.maps.LatLngBounds();
          boundaryCoordinates.forEach((pt) => {
            bounds.extend(new window.google.maps.LatLng(pt.latitude, pt.longitude));
          });
          map.fitBounds(bounds);
        }

        // Draw markers
        markersRef.current.forEach((m) => {
          m.setMap(null);
        });
        markersRef.current = [];
        markers.forEach((m) => {
          const lat = Number(m.coordinate?.latitude);
          const lng = Number(m.coordinate?.longitude);
          if (Number.isNaN(lat) || Number.isNaN(lng) || (lat === 0 && lng === 0)) return;

          const marker = new window.google.maps.Marker({
            position: { lat, lng },
            map: map,
            title: m.title || '',
          });
          if (m.onPress) {
            marker.addListener('click', () => m.onPress?.());
          }
          markersRef.current.push(marker);
        });
      };

      if (window.google?.maps) {
        initMap();
      } else if (apiKey) {
        const existingScript = document.getElementById('google-maps-script');
        if (!existingScript) {
          const script = document.createElement('script');
          script.id = 'google-maps-script';
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
          script.async = true;
          script.defer = true;
          script.onload = () => {
            if (isMounted) initMap();
          };
          document.head.appendChild(script);
        } else {
          existingScript.addEventListener('load', () => {
            if (isMounted) initMap();
          });
        }
      }

      return () => {
        isMounted = false;
        if (polygonRef.current) polygonRef.current.setMap(null);
        markersRef.current.forEach((m) => {
          m.setMap(null);
        });
        markersRef.current = [];
      };
    }, [apiKey, markers, boundaryCoordinates]);

    return (
      <View style={[styles.container, style]}>
        {/* @ts-ignore */}
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
        {children}
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
});
