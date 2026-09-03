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
      onRegionChangeComplete,
      children,
    },
    ref
  ) => {
    const { colors, isDark } = useTheme();
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const googleMapRef = useRef<any>(null);
    const polygonRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const onRegionChangeRef = useRef(onRegionChangeComplete);
    onRegionChangeRef.current = onRegionChangeComplete;

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

    // Initialize Google Map on web container (only once when Google Maps is ready)
    useEffect(() => {
      let isMounted = true;
      let idleListener: any = null;

      const initMap = () => {
        if (!mapContainerRef.current || !window.google?.maps || !isMounted || googleMapRef.current) return;

        const centerLat = initialRegion?.latitude || defaultRegion.latitude;
        const centerLng = initialRegion?.longitude || defaultRegion.longitude;

        // Calculate initial zoom if longitudeDelta is available
        let initialZoom = 15;
        if (initialRegion?.longitudeDelta && initialRegion.longitudeDelta > 0) {
          initialZoom = Math.max(
            1,
            Math.min(20, Math.round(Math.log2(360 / initialRegion.longitudeDelta)))
          );
        }

        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: { lat: centerLat, lng: centerLng },
          zoom: initialZoom,
          disableDefaultUI: !scrollEnabled,
          gestureHandling: scrollEnabled ? 'auto' : 'none',
          zoomControl: zoomEnabled,
          mapTypeControl: false,
          streetViewControl: false,
        });

        googleMapRef.current = map;
        onMapReady?.();

        // Listen to camera pan/zoom changes via Google Maps 'idle', 'dragend', and 'zoom_changed'
        const notifyRegionChange = () => {
          if (!onRegionChangeRef.current) return;
          const center = map.getCenter();
          const bounds = map.getBounds();
          const zoom = map.getZoom();
          if (center) {
            let latDelta = 0.01;
            let lngDelta = 0.01;
            if (bounds) {
              const ne = bounds.getNorthEast();
              const sw = bounds.getSouthWest();
              latDelta = Math.abs(ne.lat() - sw.lat());
              lngDelta = Math.abs(ne.lng() - sw.lng());
            } else if (typeof zoom === 'number') {
              lngDelta = 360 / 2 ** zoom;
              latDelta = lngDelta;
            }
            onRegionChangeRef.current({
              latitude: center.lat(),
              longitude: center.lng(),
              latitudeDelta: latDelta || 0.01,
              longitudeDelta: lngDelta || 0.01,
            });
          }
        };

        idleListener = map.addListener('idle', notifyRegionChange);
        map.addListener('dragend', notifyRegionChange);
        map.addListener('zoom_changed', notifyRegionChange);
      };

      if (window.google?.maps) {
        initMap();
      } else {
        const existingScript = document.getElementById('google-maps-script');
        if (!existingScript) {
          const script = document.createElement('script');
          script.id = 'google-maps-script';
          script.src = apiKey
            ? `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`
            : 'https://maps.googleapis.com/maps/api/js?libraries=places,geometry';
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
        if (idleListener && window.google?.maps?.event) {
          window.google.maps.event.removeListener(idleListener);
        }
      };
    }, [apiKey]);

    // Pan to initialRegion if updated from async storage after initial load
    const initialRegionSyncedRef = useRef(false);
    useEffect(() => {
      if (googleMapRef.current && initialRegion && !initialRegionSyncedRef.current) {
        initialRegionSyncedRef.current = true;
        googleMapRef.current.setCenter({
          lat: initialRegion.latitude,
          lng: initialRegion.longitude,
        });
        if (initialRegion.longitudeDelta && initialRegion.longitudeDelta > 0) {
          const z = Math.max(
            1,
            Math.min(20, Math.round(Math.log2(360 / initialRegion.longitudeDelta)))
          );
          googleMapRef.current.setZoom(z);
        }
      }
    }, [initialRegion]);

    // Update boundary polygon when coordinates or colors change without recreating map
    useEffect(() => {
      const map = googleMapRef.current;
      if (!map || !window.google?.maps) return;

      if (boundaryCoordinates.length >= 3) {
        const path = boundaryCoordinates.map((c) => ({ lat: c.latitude, lng: c.longitude }));
        if (polygonRef.current) {
          polygonRef.current.setPaths(path);
          polygonRef.current.setOptions({
            strokeColor: strokeColor,
            fillColor: fillColor,
          });
        } else {
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
        }
      } else if (polygonRef.current) {
        polygonRef.current.setMap(null);
        polygonRef.current = null;
      }
    }, [boundaryCoordinates, strokeColor, fillColor]);

    // Update markers when list changes without recreating map
    useEffect(() => {
      const map = googleMapRef.current;
      if (!map || !window.google?.maps) return;

      // Clear existing markers
      markersRef.current.forEach((m) => {
        m.setMap(null);
      });
      markersRef.current = [];

      // Add updated markers
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
    }, [markers]);

    // Cleanup on component unmount
    useEffect(() => {
      return () => {
        if (polygonRef.current) {
          polygonRef.current.setMap(null);
          polygonRef.current = null;
        }
        markersRef.current.forEach((m) => {
          m.setMap(null);
        });
        markersRef.current = [];
        googleMapRef.current = null;
      };
    }, []);

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
