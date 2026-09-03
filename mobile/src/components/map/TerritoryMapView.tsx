// mobile/src/components/map/TerritoryMapView.tsx
import { Platform } from 'react-native';
import { TerritoryMapView as NativeMapView } from './TerritoryMapView.native';
import { TerritoryMapView as WebMapView } from './TerritoryMapView.web';

export const TerritoryMapView = Platform.OS === 'web' ? WebMapView : NativeMapView;
export * from './types';

