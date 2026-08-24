'use client';

import {
  AlertCircle,
  Clock,
  Edit,
  Flag,
  Hexagon,
  Home,
  MapPin,
  Milestone,
  Navigation,
  Radio,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  HouseholdEncounterSheet,
  HouseholdLogVisitSheet,
} from '@/components/households/household-action-sheets';
import { HouseholdForm, type HouseholdFormValues } from '@/components/households/household-form';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCongregationGroups,
  useCurrentUser,
  useLocationSharing,
  useMemberLocations,
  useSaveAnnotations,
  useSaveBoundary,
  useUpdateTerritory,
  useUserLocation,
} from '@/hooks';
import { createClientId } from '@/lib/firebase/schema';
import { getHouseholdMapLabel } from '@/lib/household-contacts';
import {
  canDeleteHousehold,
  canEditHousehold,
  canLogVisitOrEncounter,
  canModifyMapAnnotation,
  canViewMemberLocations,
} from '@/lib/permissions';
import { insertJunctionVertexIntoRoad } from '@/lib/map-geometry';
import {
  deleteHouseholdRecord,
  saveHouseholdRecord,
  updateHouseholdRecord,
} from '@/lib/record-writes';
import { findDuplicateHouseholdByNumber } from '@/lib/households';
import { findDuplicateTerritory } from '@/lib/territories';
import { timeAgo } from '@/lib/time-ago';
import type {
  Congregation,
  Household,
  MapBoundaryPolygon,
  MapLandmark,
  MapPoint,
  MapRoad,
  MapStartFlag,
  SharedMemberLocation,
  Territory,
  TerritoryAnnotations,
} from '@/types/api';
import { StudioBoundaryDialog } from './StudioBoundaryDialog';
import { StudioContextActionCard } from './StudioContextActionCard';
import { getTerritoryBoundaries, StudioGoogleMap } from './StudioGoogleMap';
import { StudioLandmarkDialog } from './StudioLandmarkDialog';
import {
  type BoundaryDisplaySettings,
  DEFAULT_STUDIO_LAYERS,
  resolveBoundaryDisplay,
  type StudioLayerSettings,
  StudioMapToolbar,
} from './StudioMapToolbar';
import { useBasemapPreference } from '@/lib/map-preferences';
import { StudioPrintViewport } from './StudioPrintViewport';
import { StudioRoadDialog } from './StudioRoadDialog';
import { type CardDimensionSettings, StudioSidebar } from './StudioSidebar';
import { type StudioTool, StudioTopBar } from './StudioTopBar';

interface StudioLayoutProps {
  territory: Territory | null;
  congregation?: Congregation | null;
  allTerritories?: Territory[];
  onSelectTerritory?: (id: string) => void;
  congregationId: string;
  households: Household[];
  allCongregationHouseholds?: Household[];
  activeAssignmentId?: string | null;
  isReadOnly?: boolean;
  onAddHousehold?: () => void;
  onEditHousehold?: (household: Household) => void;
  onDeleteHousehold?: (householdId: string) => void;
  onSaveTerritoryBoundary?: (coordinates: MapPoint[], boundaries?: MapBoundaryPolygon[]) => void;
  onSaveAnnotations?: (annotations: TerritoryAnnotations) => void;
  onPinHousehold?: (coords: { lat: number; lng: number }) => void;
  pinHouseholdId?: string | null;
  onClearPinHouseholdId?: () => void;
  onHouseholdSaved?: () => void;
}

export function StudioLayout({
  territory,
  congregation,
  allTerritories = [],
  onSelectTerritory,
  congregationId,
  households,
  allCongregationHouseholds,
  activeAssignmentId,
  isReadOnly = false,
  onAddHousehold,
  onEditHousehold,
  onDeleteHousehold,
  onSaveTerritoryBoundary,
  onSaveAnnotations,
  onPinHousehold,
  pinHouseholdId,
  onClearPinHouseholdId,
  onHouseholdSaved,
}: StudioLayoutProps) {
  const _router = useRouter();
  const { user } = useCurrentUser();
  const [activeTool, setActiveTool] = useState<StudioTool>(
    !isReadOnly && pinHouseholdId ? 'pin' : 'pointer'
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [basemapMode, setBasemapMode] = useBasemapPreference();
  const [layers, setLayers] = useState<StudioLayerSettings>(DEFAULT_STUDIO_LAYERS);

  // Print Viewport & Card Download Framing States
  const [isPrintViewportActive, setIsPrintViewportActive] = useState(false);
  const [fitPrintViewportPadding, setFitPrintViewportPadding] = useState<{
    top: number;
    right: number;
    bottom: number;
    left: number;
    timestamp: number;
  } | null>(null);

  const [cardSettings, setCardSettings] = useState<CardDimensionSettings>({
    preset: '4x6',
    widthInches: 4,
    heightInches: 6,
    orientation: 'portrait',
    side: 'front',
    showQrCode: true,
    showNotesArea: true,
    showStreetsList: true,
    showHouseholdsList: true,
  });

  // Drawing state (Boundary, Roads)
  const [drawnPoints, setDrawnPoints] = useState<Array<{ lat: number; lng: number }>>([]);
  const [_history, setHistory] = useState<Array<Array<{ lat: number; lng: number }>>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Snapped road junction connections during road drawing (T, Y, X intersections)
  const snappedJunctionsRef = useRef<
    Array<{
      roadId: string;
      segmentIndex: number;
      point: { lat: number; lng: number };
      isVertex?: boolean;
    }>
  >([]);

  const handleDeleteDrawnPoint = (index: number) => {
    if (index < 0 || index >= drawnPoints.length) return;
    const nextPoints = drawnPoints.filter((_, i) => i !== index);
    setDrawnPoints(nextPoints);
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), nextPoints]);
    setHistoryIndex((prev) => prev + 1);
    toast.info(`Deleted vertex #${index + 1}`);
  };

  // Sheets & Dialogs
  const [addHouseholdOpen, setAddHouseholdOpen] = useState(false);
  const [editingHousehold, setEditingHousehold] = useState<Household | null>(null);
  const [tempPinCoordinates, setTempPinCoordinates] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [logVisitHousehold, setLogVisitHousehold] = useState<Household | null>(null);
  const [encounterHousehold, setEncounterHousehold] = useState<Household | null>(null);

  // Landmark state
  const [landmarkDialogOpen, setLandmarkDialogOpen] = useState(false);
  const [selectedLandmark, setSelectedLandmark] = useState<MapLandmark | null>(null);
  const [tempLandmarkCoordinates, setTempLandmarkCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Road state
  const [roadDialogOpen, setRoadDialogOpen] = useState(false);
  const [selectedRoad, setSelectedRoad] = useState<MapRoad | null>(null);

  // Boundary state
  const [boundaryDialogOpen, setBoundaryDialogOpen] = useState(false);
  const [selectedBoundary, setSelectedBoundary] = useState<MapBoundaryPolygon | null>(null);
  const [boundaryDisplay, setBoundaryDisplay] = useState<BoundaryDisplaySettings>(() =>
    resolveBoundaryDisplay(territory?.annotations?.boundaryDisplay)
  );

  // Synchronize boundaryDisplay when territory changes
  useEffect(() => {
    if (territory?.annotations?.boundaryDisplay) {
      setBoundaryDisplay(resolveBoundaryDisplay(territory.annotations.boundaryDisplay));
    }
  }, [territory?.annotations?.boundaryDisplay]);

  // Start flag dialog & selection
  const [selectedStartFlag, setSelectedStartFlag] = useState<MapStartFlag | null>(null);
  const [startFlagDialogOpen, setStartFlagDialogOpen] = useState(false);
  const [startFlagLabel, setStartFlagLabel] = useState('');

  // Edit Territory Details Dialog
  const [editTerritoryOpen, setEditTerritoryOpen] = useState(false);
  const [editNumber, setEditNumber] = useState('');
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const { update: updateTerritory, isPending: updatingTerritory } = useUpdateTerritory();

  useEffect(() => {
    if (territory) {
      setEditNumber(territory.number || '');
      setEditName(territory.name || '');
      setEditCity(territory.city || '');
      setEditNotes(territory.notes || '');
    }
  }, [territory]);

  const { saveBoundary: _saveBoundary, isPending: isSavingBoundary } = useSaveBoundary(
    territory?.id ?? ''
  );
  const { saveAnnotations, isSaving: isSavingAnnotations } = useSaveAnnotations(
    territory?.id ?? ''
  );
  const boundaryDisplaySaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Service Groups for permission scoping & location tracking
  const { groups = [] } = useCongregationGroups(congregationId);

  // Member Locations & Real-Time Sharing
  const { memberLocations } = useMemberLocations(congregationId, user, groups);
  const {
    isSharing: isSharingLocation,
    isLocating: isSharingLocating,
    currentCoords: sharedLocationCoords,
    durationMinutes: sharingDurationMinutes,
    expiresAt: sharingExpiresAt,
    startSharing: startLocationSharing,
    stopSharing: stopLocationSharing,
    extendDuration: extendLocationDuration,
    toggleShareLocation,
  } = useLocationSharing({
    congregationId,
    user,
    groups,
  });

  const canViewMembers = useMemo(() => {
    return canViewMemberLocations(user, groups);
  }, [user, groups]);

  const [selectedMemberLocation, setSelectedMemberLocation] = useState<SharedMemberLocation | null>(
    null
  );

  // User GPS Location & Live Compass Heading Flashlight Beam
  const {
    isTracking: isTrackingLocation,
    location: userLocation,
    heading: userHeading,
    toggleTracking: toggleUserLocation,
  } = useUserLocation();

  const hasInitiallyCenteredUserRef = useRef(false);

  // Search navigation state
  const [searchedLocation, setSearchedLocation] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    timestamp: number;
  } | null>(null);

  // Pan to user location when My Location tracking activates
  useEffect(() => {
    if (userLocation && isTrackingLocation && !hasInitiallyCenteredUserRef.current) {
      hasInitiallyCenteredUserRef.current = true;
      setSearchedLocation({
        lat: userLocation.lat,
        lng: userLocation.lng,
        zoom: 18,
        timestamp: Date.now(),
      });
    }
    if (!isTrackingLocation) {
      hasInitiallyCenteredUserRef.current = false;
    }
  }, [userLocation, isTrackingLocation]);

  const handleLocationButtonClick = () => {
    toggleUserLocation();
  };

  const dismissAllFloatingCards = () => {
    setSelectedHousehold(null);
    setSelectedBoundary(null);
    setSelectedLandmark(null);
    setSelectedRoad(null);
    setSelectedStartFlag(null);
    setSelectedMemberLocation(null);
    setBoundaryDialogOpen(false);
    setLandmarkDialogOpen(false);
    setRoadDialogOpen(false);
    setStartFlagDialogOpen(false);
  };

  const handleSearchLocation = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return;

    // 1. Check if matches any household (address, street name, house number)
    const matchedHousehold = households.find((h) => {
      const addr = (h.address || '').toLowerCase();
      const street = (h.streetName || '').toLowerCase();
      const num = (h.houseNumber || '').toLowerCase();
      return addr.includes(q) || street.includes(q) || (num && num === q);
    });

    if (
      matchedHousehold &&
      typeof matchedHousehold.latitude === 'number' &&
      typeof matchedHousehold.longitude === 'number' &&
      matchedHousehold.latitude !== 0 &&
      matchedHousehold.longitude !== 0
    ) {
      dismissAllFloatingCards();
      setSelectedHousehold(matchedHousehold);
      setSearchedLocation({
        lat: matchedHousehold.latitude,
        lng: matchedHousehold.longitude,
        zoom: 19,
        timestamp: Date.now(),
      });
      toast.success(`Found household: ${matchedHousehold.address}`);
      return;
    }

    // 2. Check if matches any landmark
    const landmarks = territory?.annotations?.landmarks || [];
    const matchedLandmark = landmarks.find((lm) => {
      const lbl = (lm.label || '').toLowerCase();
      const type = (lm.type || '').toLowerCase();
      return lbl.includes(q) || type.includes(q);
    });

    if (
      matchedLandmark &&
      typeof matchedLandmark.lat === 'number' &&
      typeof matchedLandmark.lng === 'number'
    ) {
      dismissAllFloatingCards();
      setSelectedLandmark(matchedLandmark);
      setSearchedLocation({
        lat: matchedLandmark.lat,
        lng: matchedLandmark.lng,
        zoom: 19,
        timestamp: Date.now(),
      });
      toast.success(`Found landmark: ${matchedLandmark.label || matchedLandmark.type}`);
      return;
    }

    // 3. Geocode with Google Maps Geocoder API
    if (typeof google !== 'undefined' && google.maps?.Geocoder) {
      const geocoder = new google.maps.Geocoder();
      const searchTarget = congregation?.city ? `${query}, ${congregation.city}` : query;

      geocoder.geocode({ address: searchTarget }, (results, status) => {
        if (status === 'OK' && results?.[0]?.geometry?.location) {
          dismissAllFloatingCards();
          const loc = results[0].geometry.location;
          setSearchedLocation({
            lat: loc.lat(),
            lng: loc.lng(),
            zoom: 18,
            timestamp: Date.now(),
          });
          toast.success(`Navigated to: ${results[0].formatted_address}`);
        } else {
          geocoder.geocode({ address: query }, (resRaw, statRaw) => {
            if (statRaw === 'OK' && resRaw?.[0]?.geometry?.location) {
              dismissAllFloatingCards();
              const locRaw = resRaw[0].geometry.location;
              setSearchedLocation({
                lat: locRaw.lat(),
                lng: locRaw.lng(),
                zoom: 18,
                timestamp: Date.now(),
              });
              toast.success(`Navigated to: ${resRaw[0].formatted_address}`);
            } else {
              toast.error(`Could not find location "${query}".`);
            }
          });
        }
      });
    } else {
      toast.error(`Could not find location "${query}".`);
    }
  };

  const handleUpdateBoundaryDisplay = (nextSettings: BoundaryDisplaySettings) => {
    setBoundaryDisplay(nextSettings);
    if (!territory?.id) return;

    if (boundaryDisplaySaveTimerRef.current) {
      clearTimeout(boundaryDisplaySaveTimerRef.current);
    }
    boundaryDisplaySaveTimerRef.current = setTimeout(async () => {
      try {
        await saveAnnotations({
          ...territory.annotations,
          boundaryDisplay: nextSettings,
        });
      } catch (err) {
        console.error('Failed to save boundary display settings:', err);
      }
    }, 400);
  };

  // Camera Heading and Tilt (Pitch) state
  const [camera, setCamera] = useState<{ heading: number; tilt: number }>({
    heading: 0,
    tilt: 0,
  });
  const [targetCamera, setTargetCamera] = useState<{
    heading?: number;
    tilt?: number;
    immediate?: boolean;
    timestamp: number;
  } | null>(null);

  const handleSetHeading = (heading: number, immediate = false) => {
    const h = ((heading % 360) + 360) % 360;
    setCamera((prev) => ({ ...prev, heading: h }));
    setTargetCamera({ heading: h, immediate, timestamp: Date.now() });
  };

  const handleSetTilt = (tilt: number, immediate = false) => {
    const t = Math.max(0, Math.min(67.5, tilt));
    setCamera((prev) => ({ ...prev, tilt: t }));
    setTargetCamera({ tilt: t, immediate, timestamp: Date.now() });
  };

  const _handleRotateBy = (delta: number) => {
    setCamera((prev) => {
      const nextHeading = (((prev.heading + delta) % 360) + 360) % 360;
      setTargetCamera({ heading: nextHeading, immediate: true, timestamp: Date.now() });
      return { ...prev, heading: nextHeading };
    });
  };

  const effectiveActiveTool: StudioTool = isReadOnly ? 'pointer' : activeTool;

  // If pinHouseholdId is provided and not in read-only mode, track the household to be placed
  const householdToPin =
    !isReadOnly && pinHouseholdId ? households.find((h) => h.id === pinHouseholdId) : null;

  useEffect(() => {
    if (pinHouseholdId && !isReadOnly) {
      setActiveTool('pin');
    }
  }, [pinHouseholdId, isReadOnly]);

  const handleUndoPoint = () => {
    if (drawnPoints.length > 0) {
      const nextPoints = drawnPoints.slice(0, -1);
      setDrawnPoints(nextPoints);
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), nextPoints]);
      setHistoryIndex((prev) => prev + 1);
    }
  };

  const handleDoneTool = async () => {
    if (!territory?.id) return;

    if (activeTool === 'boundary') {
      if (drawnPoints.length < 3) {
        toast.error('Boundary requires at least 3 points.');
        return;
      }
      try {
        const existingBoundaries = getTerritoryBoundaries(territory);
        const newBoundary: MapBoundaryPolygon = {
          id: createClientId(),
          name:
            existingBoundaries.length > 0 ? `Zone ${existingBoundaries.length + 1}` : 'Boundary',
          points: drawnPoints,
          createdById: user?.id || null,
          creatorName: user?.name || null,
          createdAt: new Date().toISOString(),
        };
        const nextBoundaries = [...existingBoundaries, newBoundary];
        await saveAnnotations({
          ...territory.annotations,
          boundaries: nextBoundaries,
        });
        toast.success(
          nextBoundaries.length > 1
            ? `Independent boundary polygon #${nextBoundaries.length} added!`
            : 'Territory boundary saved!'
        );
        setDrawnPoints([]);
        setActiveTool('pointer');
      } catch (err) {
        console.error('Failed to save boundary:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to save boundary.');
      }
    } else if (activeTool === 'road') {
      if (drawnPoints.length < 2) {
        toast.error('Road path requires at least 2 points.');
        return;
      }
      setSelectedRoad(null);
      setRoadDialogOpen(true);
    } else {
      setDrawnPoints([]);
      setActiveTool('pointer');
    }
  };

  const handleUpdateRoadPoints = async (
    roadId: string,
    points: Array<{ lat: number; lng: number }>
  ) => {
    if (!territory?.id || isReadOnly) return;
    const existingRoads = territory.annotations?.roads || [];
    const target = existingRoads.find((r) => r.id === roadId);
    if (!target || !canModifyMapAnnotation(user, target, groups)) {
      toast.error('You do not have permission to modify this road.');
      return;
    }
    try {
      const updated = existingRoads.map((r) => (r.id === roadId ? { ...r, points } : r));
      setSelectedRoad((prev) => (prev?.id === roadId ? { ...prev, points } : prev));
      await saveAnnotations({
        ...territory.annotations,
        roads: updated,
      });
      toast.success('Road route updated');
    } catch (_err) {
      toast.error('Failed to update road');
    }
  };

  const handleUpdateBoundaryPolygon = async (
    boundaryId: string,
    points: Array<{ lat: number; lng: number }>
  ) => {
    if (!territory?.id || isReadOnly) return;
    const existingBoundaries = getTerritoryBoundaries(territory);
    const target = existingBoundaries.find((b) => b.id === boundaryId);
    if (!target || !canModifyMapAnnotation(user, target, groups)) {
      toast.error('You do not have permission to modify this boundary.');
      return;
    }
    try {
      const updated = existingBoundaries.map((b) => (b.id === boundaryId ? { ...b, points } : b));
      setSelectedBoundary((prev) => (prev?.id === boundaryId ? { ...prev, points } : prev));
      await saveAnnotations({
        ...territory.annotations,
        boundaries: updated,
      });
      toast.success('Boundary polygon updated');
    } catch (_err) {
      toast.error('Failed to update boundary');
    }
  };

  const handleCreateHousehold = async (values: HouseholdFormValues) => {
    const allList = allCongregationHouseholds ?? households;
    const duplicate = findDuplicateHouseholdByNumber(values.houseNumber, allList);
    if (duplicate) {
      toast.error(`House #${values.houseNumber} already exists in this congregation.`);
      return;
    }

    try {
      await saveHouseholdRecord({
        congregationId,
        territoryId: territory?.id ?? values.territoryId ?? undefined,
        address: values.address,
        houseNumber: values.houseNumber || undefined,
        streetName: values.streetName,
        unit: values.unit || undefined,
        city: values.city,
        postalCode: values.postalCode || undefined,
        type: values.type,
        status: values.status,
        occupantsCount: values.occupantsCount,
        notes: values.notes || undefined,
        language: values.language || undefined,
        latitude: tempPinCoordinates?.lat ?? null,
        longitude: tempPinCoordinates?.lng ?? null,
        createdById: user?.id || null,
        creatorName: user?.name || null,
        updatedById: user?.id || null,
      });

      toast.success('Household record saved');
      setAddHouseholdOpen(false);
      setTempPinCoordinates(null);
      setActiveTool('pointer');
      onHouseholdSaved?.();
    } catch (_err) {
      toast.error('Failed to save household record');
    }
  };

  const handleUpdateHousehold = async (values: HouseholdFormValues) => {
    if (!editingHousehold) return;
    const allList = allCongregationHouseholds ?? households;
    const duplicate = findDuplicateHouseholdByNumber(
      values.houseNumber,
      allList,
      editingHousehold.id
    );
    if (duplicate) {
      toast.error(`House #${values.houseNumber} already exists in this congregation.`);
      return;
    }

    try {
      await updateHouseholdRecord(editingHousehold.id, {
        address: values.address,
        houseNumber: values.houseNumber || undefined,
        streetName: values.streetName,
        unitNumber: values.unit || undefined,
        city: values.city,
        postalCode: values.postalCode || undefined,
        type: values.type,
        status: values.status,
        occupantsCount: values.occupantsCount,
        notes: values.notes || undefined,
        languages: values.language || undefined,
      });

      toast.success('Household record updated');
      setEditingHousehold(null);
      setSelectedHousehold(null);
      onHouseholdSaved?.();
    } catch (_err) {
      toast.error('Failed to update household record');
    }
  };

  const handleDeleteHousehold = async (householdId: string) => {
    try {
      await deleteHouseholdRecord(householdId);
      toast.success('Household record deleted');
      setSelectedHousehold(null);
      onHouseholdSaved?.();
    } catch (_err) {
      toast.error('Failed to delete household record');
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-muted/20 select-none">
      {/* Deferred Pinning Banner */}
      {householdToPin && (
        <div className="absolute top-16 inset-x-0 z-30 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto bg-amber-500 text-amber-950 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold border border-amber-600 animate-in slide-in-from-top-2">
            <AlertCircle size={16} />
            <span>Tap on map to place pin for {householdToPin.address}</span>
            <button
              type="button"
              onClick={onClearPinHouseholdId}
              className="ml-2 hover:bg-amber-600 p-1 rounded-lg"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Studio Top Toolbar (hidden during print viewport mode to make room for viewport tools) */}
      {!isPrintViewportActive && (
        <StudioTopBar
          territoryNumber={territory?.number}
          territoryName={territory?.name}
          activeTool={effectiveActiveTool}
          isReadOnly={isReadOnly}
          onSelectTool={(tool) => {
            if (isReadOnly) {
              setActiveTool('pointer');
              return;
            }
            dismissAllFloatingCards();
            setActiveTool(tool);
            setDrawnPoints([]);
            setHistory([]);
            setHistoryIndex(-1);
            if (tool === 'pin') {
              toast.info('Tap anywhere on the map to place a house pin');
            } else if (tool === 'landmark') {
              toast.info('Tap on the map to place a landmark');
            } else if (tool === 'start') {
              toast.info('Tap on the map to place the start meeting flag');
            }
          }}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          sidebarOpen={sidebarOpen}
          onUndo={handleUndoPoint}
          canUndo={drawnPoints.length > 0}
          canRedo={false}
          onSearchLocation={handleSearchLocation}
          onOpenPrintViewport={() => {
            dismissAllFloatingCards();
            setSidebarOpen(false);
            setIsPrintViewportActive(true);
            toast.info('Adjust map camera framing to fit your territory card');
          }}
          households={households}
          landmarks={territory?.annotations?.landmarks}
          roads={territory?.annotations?.roads}
          isSharingLocation={isSharingLocation}
          onToggleShareLocation={toggleShareLocation}
          onStartShareLocation={startLocationSharing}
          onStopShareLocation={stopLocationSharing}
          onExtendShareLocation={extendLocationDuration}
          isSharingPending={isSharingLocating}
          sharingDurationMinutes={sharingDurationMinutes}
          sharingExpiresAt={sharingExpiresAt}
          visibleMemberLocations={memberLocations}
          onSelectMemberLocation={(loc) => {
            dismissAllFloatingCards();
            setSelectedMemberLocation(loc);
            setSearchedLocation({
              lat: loc.latitude,
              lng: loc.longitude,
              zoom: 19,
              timestamp: Date.now(),
            });
            toast.success(`Found publisher: ${loc.userName}`);
          }}
          canViewMembers={canViewMembers}
          onSelectHousehold={(h) => {
            dismissAllFloatingCards();
            setSelectedHousehold(h);
            const lat =
              typeof h.latitude === 'number' ? h.latitude : parseFloat(String(h.latitude || ''));
            const lng =
              typeof h.longitude === 'number' ? h.longitude : parseFloat(String(h.longitude || ''));
            if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
              setSearchedLocation({ lat, lng, zoom: 19, timestamp: Date.now() });
            }
            toast.success(`Found ${h.address}`);
          }}
          onSelectLandmark={(lm) => {
            dismissAllFloatingCards();
            setSelectedLandmark(lm);
            if (typeof lm.lat === 'number' && typeof lm.lng === 'number') {
              setSearchedLocation({ lat: lm.lat, lng: lm.lng, zoom: 19, timestamp: Date.now() });
            }
            toast.success(`Found landmark: ${lm.label || lm.type}`);
          }}
          onSelectRoad={(road) => {
            dismissAllFloatingCards();
            setSelectedRoad(road);
            if (road.points && road.points.length > 0) {
              setSearchedLocation({
                lat: road.points[0].lat,
                lng: road.points[0].lng,
                zoom: 18,
                timestamp: Date.now(),
              });
            }
            toast.success(`Found road: ${road.name || 'Road Corridor'}`);
          }}
          congregationId={congregationId}
        />
      )}

      {/* Floating Context Action Card (hidden during print viewport mode or read-only mode) */}
      {!isPrintViewportActive && !isReadOnly && (
        <StudioContextActionCard
          activeTool={effectiveActiveTool}
          pointCount={drawnPoints.length}
          onUndoPoint={handleUndoPoint}
          onDone={handleDoneTool}
          onCancel={() => {
            dismissAllFloatingCards();
            setDrawnPoints([]);
            setActiveTool('pointer');
            if (householdToPin) onClearPinHouseholdId?.();
          }}
          isSaving={isSavingBoundary || isSavingAnnotations}
        />
      )}

      {/* Google Maps Base Map Canvas */}
      <div className="w-full h-full relative">
        <StudioGoogleMap
          territory={territory}
          congregation={congregation}
          households={households}
          activeTool={effectiveActiveTool}
          isReadOnly={isReadOnly}
          drawnPoints={drawnPoints}
          onAddPoint={(point) => {
            const nextPoints = [...drawnPoints, point];
            setDrawnPoints(nextPoints);
            setHistory((prev) => [...prev.slice(0, historyIndex + 1), nextPoints]);
            setHistoryIndex((prev) => prev + 1);
          }}
          onDeleteDrawnPoint={handleDeleteDrawnPoint}
          onCloseBoundary={() => {
            void handleDoneTool();
          }}
          onRoadSnapJunction={(junction) => {
            snappedJunctionsRef.current.push(junction);
          }}
          onSelectHousehold={(h) => {
            dismissAllFloatingCards();
            setSelectedHousehold(h);
          }}
          onMoveHousehold={async (id, lat, lng) => {
            const targetH = households.find((h) => h.id === id);
            if (!targetH || !canEditHousehold(user, targetH, groups)) {
              toast.error('You do not have permission to move this household pin.');
              return;
            }
            try {
              await updateHouseholdRecord(id, { latitude: lat, longitude: lng });
              toast.success('Household pin moved');
              onHouseholdSaved?.();
            } catch (_err) {
              toast.error('Failed to move household');
            }
          }}
          onSelectLandmark={(landmark) => {
            dismissAllFloatingCards();
            setSelectedLandmark(landmark);
          }}
          onMoveLandmark={async (id, lat, lng) => {
            if (!territory?.id) return;
            const existing = territory.annotations?.landmarks || [];
            const target = existing.find((lm) => lm.id === id);
            if (!target || !canModifyMapAnnotation(user, target, groups)) {
              toast.error('You do not have permission to move this landmark.');
              return;
            }
            try {
              const updated = existing.map((lm) => (lm.id === id ? { ...lm, lat, lng } : lm));
              await saveAnnotations({
                ...territory.annotations,
                landmarks: updated,
              });
              toast.success('Landmark moved');
            } catch (_err) {
              toast.error('Failed to move landmark');
            }
          }}
          onSelectRoad={(road) => {
            dismissAllFloatingCards();
            setSelectedRoad(road);
          }}
          onUpdateRoadPoints={handleUpdateRoadPoints}
          onSelectBoundary={(boundary) => {
            dismissAllFloatingCards();
            setSelectedBoundary(boundary);
          }}
          onUpdateBoundaryPolygon={handleUpdateBoundaryPolygon}
          onSelectStartFlag={() => {
            dismissAllFloatingCards();
            if (territory?.annotations?.startFlag) {
              setSelectedStartFlag(territory.annotations.startFlag);
            }
          }}
          onMoveStartFlag={async (lat, lng) => {
            if (!territory?.id) return;
            const startFlag = territory.annotations?.startFlag;
            if (!startFlag || !canModifyMapAnnotation(user, startFlag, groups)) {
              toast.error('You do not have permission to move the start meeting flag.');
              return;
            }
            try {
              await saveAnnotations({
                ...territory.annotations,
                startFlag: {
                  ...startFlag,
                  lat,
                  lng,
                },
              });
              toast.success('Start flag moved');
            } catch (_err) {
              toast.error('Failed to move start flag');
            }
          }}
          onDeselectAll={dismissAllFloatingCards}
          onPinAtLocation={({ lat, lng }) => {
            if (householdToPin) {
              void updateHouseholdRecord(householdToPin.id, {
                latitude: lat,
                longitude: lng,
                territoryId: territory?.id ?? householdToPin.territoryId,
              }).then(() => {
                toast.success(`Pinned ${householdToPin.address} on map`);
                onClearPinHouseholdId?.();
                onHouseholdSaved?.();
                setActiveTool('pointer');
              });
            } else {
              setTempPinCoordinates({ lat, lng });
              setAddHouseholdOpen(true);
            }
          }}
          onPlaceLandmark={({ lat, lng }) => {
            dismissAllFloatingCards();
            setTempLandmarkCoordinates({ lat, lng });
            setLandmarkDialogOpen(true);
          }}
          onSetStartFlag={async ({ lat, lng }) => {
            if (!territory?.id) return;
            try {
              await saveAnnotations({
                ...territory.annotations,
                startFlag: {
                  lat,
                  lng,
                  label: 'Start Meeting Point',
                  createdById: user?.id || null,
                  creatorName: user?.name || null,
                  createdAt: new Date().toISOString(),
                },
              });
              toast.success('Territory start meeting flag placed!');
              setActiveTool('pointer');
            } catch (_err) {
              toast.error('Failed to save start flag.');
            }
          }}
          basemapMode={basemapMode}
          layerSettings={layers}
          boundaryDisplay={boundaryDisplay}
          searchedLocation={searchedLocation}
          targetCamera={targetCamera}
          onCameraChange={setCamera}
          currentCamera={camera}
          selectedHouseholdId={selectedHousehold?.id}
          selectedBoundaryId={selectedBoundary?.id}
          selectedLandmarkId={selectedLandmark?.id}
          selectedRoadId={selectedRoad?.id}
          userLocation={userLocation}
          userHeading={userHeading}
          memberLocations={memberLocations}
          selectedMemberLocationId={selectedMemberLocation?.id}
          onSelectMemberLocation={(loc) => {
            dismissAllFloatingCards();
            setSelectedMemberLocation(loc);
          }}
          currentUserId={user.id}
          currentUser={user}
          groups={groups}
          fitPrintViewportPadding={fitPrintViewportPadding}
          isPrintViewportActive={isPrintViewportActive}
        />

        {/* Interactive Print & Download Viewport Framing Overlay */}
        <StudioPrintViewport
          active={isPrintViewportActive}
          onClose={() => setIsPrintViewportActive(false)}
          cardSettings={cardSettings}
          onChangeCardSettings={setCardSettings}
          territory={territory}
          congregation={congregation}
          households={households}
          basemapMode={basemapMode}
          onChangeBasemapMode={setBasemapMode}
          onFitTerritoryToFrame={(padding) => {
            setFitPrintViewportPadding({
              ...padding,
              timestamp: Date.now(),
            });
            toast.success('Fitted territory to card frame');
          }}
        />
      </div>

      {/* Unified Floating Map Toolbar (Camera, Compass, GPS, Layers & Filters) */}
      <StudioMapToolbar
        mode={basemapMode}
        onSelectMode={setBasemapMode}
        layers={layers}
        onChangeLayers={setLayers}
        boundaryDisplay={boundaryDisplay}
        onChangeBoundaryDisplay={handleUpdateBoundaryDisplay}
        heading={camera.heading}
        tilt={camera.tilt}
        onSetHeading={handleSetHeading}
        onSetTilt={handleSetTilt}
        isTrackingLocation={isTrackingLocation}
        onToggleLocation={handleLocationButtonClick}
      />

      {/* Left Workspace Drawer */}
      <StudioSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        territory={territory}
        allTerritories={allTerritories}
        onSelectTerritory={onSelectTerritory}
        households={households}
        selectedHouseholdId={selectedHousehold?.id}
        isReadOnly={isReadOnly}
        onSelectHousehold={(h) => {
          setSelectedHousehold(h);
          if (
            typeof h.latitude === 'number' &&
            typeof h.longitude === 'number' &&
            h.latitude !== 0 &&
            h.longitude !== 0
          ) {
            setSearchedLocation({
              lat: h.latitude,
              lng: h.longitude,
              zoom: 19,
              timestamp: Date.now(),
            });
          }
        }}
        cardSettings={cardSettings}
        onChangeCardSettings={setCardSettings}
        onEditTerritory={() => setEditTerritoryOpen(true)}
        onPrintCard={() => {
          setSidebarOpen(false);
          setIsPrintViewportActive(true);
          toast.info('Adjust map framing for your territory card');
        }}
        onOpenAddHousehold={() => {
          if (isReadOnly) return;
          setActiveTool('pin');
          setSidebarOpen(false);
          toast.info('Tap anywhere on the map to place a new household pin');
        }}
      />

      {/* Dialog: Add Household */}
      <ResponsiveDialog
        open={addHouseholdOpen}
        onOpenChange={(op) => {
          setAddHouseholdOpen(op);
          if (!op) setTempPinCoordinates(null);
        }}
        title="Add Household to Territory"
        description="Record door details, structure, and initial status"
      >
        <HouseholdForm
          initialValues={{
            city: territory?.city || congregation?.city || '',
            territoryId: territory?.id,
          }}
          existingHouseholds={allCongregationHouseholds ?? households}
          onSubmit={handleCreateHousehold}
          onCancel={() => {
            setAddHouseholdOpen(false);
            setTempPinCoordinates(null);
          }}
        />
      </ResponsiveDialog>

      {/* Dialog: Edit Household */}
      <ResponsiveDialog
        open={!!editingHousehold}
        onOpenChange={(op) => !op && setEditingHousehold(null)}
        title="Edit Household Details"
        description="Update door number, address, status, or notes"
      >
        {editingHousehold && (
          <HouseholdForm
            initialValues={editingHousehold}
            existingHouseholds={allCongregationHouseholds ?? households}
            excludeHouseholdId={editingHousehold.id}
            onSubmit={handleUpdateHousehold}
            onCancel={() => setEditingHousehold(null)}
          />
        )}
      </ResponsiveDialog>

      {/* Household Quick Info Modal */}
      {selectedHousehold && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-sm sm:w-full z-40 pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="p-4 pb-7 sm:pb-4 rounded-t-3xl rounded-b-none sm:rounded-3xl bg-card/95 backdrop-blur-md border-t sm:border border-border shadow-[0_-8px_30px_rgba(0,0,0,0.18)] sm:shadow-2xl space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto -mt-1 mb-1 sm:hidden" />
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                  <Home size={16} />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground leading-snug">
                    {getHouseholdMapLabel(selectedHousehold)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedHousehold.address || selectedHousehold.streetName}
                    {selectedHousehold.city &&
                    !(selectedHousehold.address || '').includes(selectedHousehold.city)
                      ? `, ${selectedHousehold.city}`
                      : ''}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedHousehold(null)}
              >
                <X size={14} />
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px] capitalize font-semibold">
                {selectedHousehold.status.replace(/_/g, ' ')}
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] capitalize font-medium text-muted-foreground"
              >
                {selectedHousehold.type}
              </Badge>
              {selectedHousehold.occupantsCount && selectedHousehold.occupantsCount > 1 && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  {selectedHousehold.occupantsCount} occupants
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
              <User size={12} className="text-muted-foreground/70 shrink-0" />
              <span>
                Added by{' '}
                <strong className="font-semibold text-foreground">
                  {selectedHousehold.creatorName ||
                    territory?.publisherName ||
                    'Territory Contributor'}
                </strong>
              </span>
            </div>

            {selectedHousehold.notes && (
              <p className="text-xs bg-muted/40 p-2.5 rounded-xl text-muted-foreground border border-border/50 leading-relaxed">
                {selectedHousehold.notes}
              </p>
            )}

            {(() => {
              const canEditH = canEditHousehold(user, selectedHousehold, groups);
              const canDeleteH = canDeleteHousehold(user, selectedHousehold, groups);
              const canLogH = canLogVisitOrEncounter(user, selectedHousehold);

              if (!canLogH && !canEditH && !canDeleteH) return null;

              return (
                <div className="flex items-center gap-1.5 pt-1">
                  {canLogH && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-xl text-xs font-semibold"
                        onClick={() => {
                          setLogVisitHousehold(selectedHousehold);
                          setSelectedHousehold(null);
                        }}
                      >
                        Log Visit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-xl text-xs font-semibold"
                        onClick={() => {
                          setEncounterHousehold(selectedHousehold);
                          setSelectedHousehold(null);
                        }}
                      >
                        Encounter
                      </Button>
                    </>
                  )}
                  {canEditH && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-foreground shrink-0"
                      title="Edit Household details"
                      onClick={() => {
                        setEditingHousehold(selectedHousehold);
                        setSelectedHousehold(null);
                      }}
                    >
                      <Edit size={14} />
                    </Button>
                  )}
                  {canDeleteH && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 rounded-xl text-destructive hover:bg-destructive/10 shrink-0"
                      title="Delete Household door"
                      onClick={() => {
                        if (window.confirm(`Delete ${selectedHousehold.address} from territory?`)) {
                          void handleDeleteHousehold(selectedHousehold.id);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Selected Boundary Quick Info Card */}
      {selectedBoundary && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-sm sm:w-full z-40 pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="p-4 pb-7 sm:pb-4 rounded-t-3xl rounded-b-none sm:rounded-3xl bg-card/95 backdrop-blur-md border-t sm:border border-border shadow-[0_-8px_30px_rgba(0,0,0,0.18)] sm:shadow-2xl space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto -mt-1 mb-1 sm:hidden" />
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                  <Hexagon size={16} />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground leading-snug">
                    {selectedBoundary.name || 'Territory Boundary Polygon'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedBoundary.points.length} vertices • Independent Polygon Zone
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-0.5">
                    <User size={11} className="text-muted-foreground/70 shrink-0" />
                    <span>
                      Mapped by{' '}
                      <strong className="font-semibold text-foreground">
                        {selectedBoundary.creatorName ||
                          territory?.publisherName ||
                          'Territory Contributor'}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedBoundary(null)}
              >
                <X size={14} />
              </Button>
            </div>

            {canModifyMapAnnotation(user, selectedBoundary, groups) && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-xl text-xs font-semibold gap-1.5"
                    onClick={() => setBoundaryDialogOpen(true)}
                  >
                    <Edit size={13} />
                    <span>Edit Zone Details</span>
                  </Button>
                  {selectedBoundary.points && selectedBoundary.points.length > 3 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs text-muted-foreground hover:text-foreground font-medium"
                      title="Remove last vertex of polygon"
                      onClick={async () => {
                        const nextPts = selectedBoundary.points.slice(0, -1);
                        await handleUpdateBoundaryPolygon(selectedBoundary.id, nextPts);
                        toast.success(`Removed vertex. ${nextPts.length} vertices remaining.`);
                      }}
                    >
                      Delete End Vertex
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 rounded-xl text-destructive hover:bg-destructive/10 shrink-0"
                    title="Delete Boundary Polygon"
                    onClick={async () => {
                      if (!territory?.id) return;
                      if (
                        window.confirm(
                          `Delete ${selectedBoundary.name || 'this boundary polygon'}?`
                        )
                      ) {
                        const existingBoundaries = getTerritoryBoundaries(territory);
                        const updated = existingBoundaries.filter(
                          (b) => b.id !== selectedBoundary.id
                        );
                        await saveAnnotations({
                          ...territory.annotations,
                          boundaries: updated,
                        });
                        toast.success('Boundary polygon deleted');
                        setSelectedBoundary(null);
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  Tip: Tap any vertex handle on the map to delete it.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Landmark Quick Info Card */}
      {selectedLandmark && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-sm sm:w-full z-40 pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="p-4 pb-7 sm:pb-4 rounded-t-3xl rounded-b-none sm:rounded-3xl bg-card/95 backdrop-blur-md border-t sm:border border-border shadow-[0_-8px_30px_rgba(0,0,0,0.18)] sm:shadow-2xl space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto -mt-1 mb-1 sm:hidden" />
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                  <MapPin size={16} />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground leading-snug">
                    {selectedLandmark.label || 'Territory Landmark'}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {selectedLandmark.type} • Landmark Point of Interest
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-0.5">
                    <User size={11} className="text-muted-foreground/70 shrink-0" />
                    <span>
                      Added by{' '}
                      <strong className="font-semibold text-foreground">
                        {selectedLandmark.creatorName ||
                          territory?.publisherName ||
                          'Territory Contributor'}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedLandmark(null)}
              >
                <X size={14} />
              </Button>
            </div>

            {canModifyMapAnnotation(user, selectedLandmark, groups) && (
              <div className="flex items-center gap-1.5 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 rounded-xl text-xs font-semibold gap-1.5"
                  onClick={() => setLandmarkDialogOpen(true)}
                >
                  <Edit size={13} />
                  <span>Edit Landmark</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 rounded-xl text-destructive hover:bg-destructive/10 shrink-0"
                  title="Delete Landmark"
                  onClick={async () => {
                    if (!territory?.id) return;
                    if (
                      window.confirm(
                        `Delete landmark "${selectedLandmark.label || selectedLandmark.type}" from territory?`
                      )
                    ) {
                      const existingLandmarks = territory.annotations?.landmarks || [];
                      const filtered = existingLandmarks.filter(
                        (lm) => lm.id !== selectedLandmark.id
                      );
                      await saveAnnotations({
                        ...territory.annotations,
                        landmarks: filtered,
                      });
                      toast.success('Landmark deleted');
                      setSelectedLandmark(null);
                    }
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Road Quick Info Card */}
      {selectedRoad && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-sm sm:w-full z-40 pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="p-4 pb-7 sm:pb-4 rounded-t-3xl rounded-b-none sm:rounded-3xl bg-card/95 backdrop-blur-md border-t sm:border border-border shadow-[0_-8px_30px_rgba(0,0,0,0.18)] sm:shadow-2xl space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto -mt-1 mb-1 sm:hidden" />
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <Milestone size={16} />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground leading-snug">
                    {selectedRoad.name || 'Road Corridor'}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {selectedRoad.color || 'street'} • {selectedRoad.points?.length || 0} vertices
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-0.5">
                    <User size={11} className="text-muted-foreground/70 shrink-0" />
                    <span>
                      Drawn by{' '}
                      <strong className="font-semibold text-foreground">
                        {selectedRoad.creatorName ||
                          territory?.publisherName ||
                          'Territory Contributor'}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedRoad(null)}
              >
                <X size={14} />
              </Button>
            </div>

            {canModifyMapAnnotation(user, selectedRoad, groups) && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-xl text-xs font-semibold gap-1.5"
                    onClick={() => setRoadDialogOpen(true)}
                  >
                    <Edit size={13} />
                    <span>Edit Road Details</span>
                  </Button>
                  {selectedRoad.points && selectedRoad.points.length > 2 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs text-muted-foreground hover:text-foreground font-medium"
                      title="Remove last vertex of road"
                      onClick={async () => {
                        const nextPts = selectedRoad.points.slice(0, -1);
                        await handleUpdateRoadPoints(selectedRoad.id, nextPts);
                        toast.success(`Removed vertex. ${nextPts.length} vertices remaining.`);
                      }}
                    >
                      Delete End Vertex
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 rounded-xl text-destructive hover:bg-destructive/10 shrink-0"
                    title="Delete Road"
                    onClick={async () => {
                      if (!territory?.id) return;
                      if (
                        window.confirm(
                          `Delete road "${selectedRoad.name || 'this road'}" from territory?`
                        )
                      ) {
                        const existingRoads = territory.annotations?.roads || [];
                        const filtered = existingRoads.filter((r) => r.id !== selectedRoad.id);
                        await saveAnnotations({
                          ...territory.annotations,
                          roads: filtered,
                        });
                        toast.success('Road deleted');
                        setSelectedRoad(null);
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  Tip: Tap any vertex handle on the map to delete it.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Start Flag Quick Info Card / Bottom Sheet */}
      {selectedStartFlag && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-sm sm:w-full z-40 pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="p-4 pb-7 sm:pb-4 rounded-t-3xl rounded-b-none sm:rounded-3xl bg-card/95 backdrop-blur-md border-t sm:border border-border shadow-[0_-8px_30px_rgba(0,0,0,0.18)] sm:shadow-2xl space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto -mt-1 mb-1 sm:hidden" />
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                  <Flag size={16} />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground leading-snug">
                    {territory?.annotations?.startFlag?.label ||
                      selectedStartFlag.label ||
                      'Territory Start Meeting Point'}
                  </p>
                  <p className="text-xs text-muted-foreground">Meeting Point • Start Alignment</p>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-0.5">
                    <User size={11} className="text-muted-foreground/70 shrink-0" />
                    <span>
                      Set by{' '}
                      <strong className="font-semibold text-foreground">
                        {territory?.annotations?.startFlag?.creatorName ||
                          territory?.publisherName ||
                          'Territory Contributor'}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedStartFlag(null)}
              >
                <X size={14} />
              </Button>
            </div>

            {canModifyMapAnnotation(user, selectedStartFlag, groups) && (
              <div className="flex items-center gap-1.5 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 rounded-xl text-xs font-semibold gap-1.5"
                  onClick={() => {
                    setStartFlagLabel(
                      territory?.annotations?.startFlag?.label ||
                        selectedStartFlag.label ||
                        'Start Meeting Point'
                    );
                    setStartFlagDialogOpen(true);
                    setSelectedStartFlag(null);
                  }}
                >
                  <Edit size={13} />
                  <span>Edit Meeting Point</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 rounded-xl text-destructive hover:bg-destructive/10 shrink-0"
                  title="Remove Start Meeting Flag"
                  onClick={async () => {
                    if (!territory?.id) return;
                    if (window.confirm('Remove start meeting flag from territory?')) {
                      const ann = { ...territory.annotations };
                      delete ann.startFlag;
                      await saveAnnotations(ann);
                      toast.success('Start flag removed');
                      setSelectedStartFlag(null);
                    }
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Member Location Quick Info Card / Mobile Popup */}
      {selectedMemberLocation && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-sm sm:w-full z-40 pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="p-4 pb-7 sm:pb-4 rounded-t-3xl rounded-b-none sm:rounded-3xl bg-card/95 backdrop-blur-md border-t sm:border border-border shadow-[0_-8px_30px_rgba(0,0,0,0.18)] sm:shadow-2xl space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto -mt-1 mb-1 sm:hidden" />
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="relative shrink-0 mt-0.5">
                  <Avatar className="h-10 w-10 rounded-xl border border-border">
                    {selectedMemberLocation.avatarUrl && (
                      <AvatarImage
                        src={selectedMemberLocation.avatarUrl}
                        alt={selectedMemberLocation.userName}
                      />
                    )}
                    <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                      {(selectedMemberLocation.userName || 'P')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  {selectedMemberLocation.isSharing && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white dark:border-slate-900" />
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-foreground leading-snug truncate">
                    {selectedMemberLocation.userName}
                    {selectedMemberLocation.userId === user?.id && (
                      <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                        (You)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedMemberLocation.groupName || 'Service Group'}
                  </p>
                  {selectedMemberLocation.userEmail && (
                    <p className="text-[11px] text-muted-foreground/80 truncate">
                      {selectedMemberLocation.userEmail}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => setSelectedMemberLocation(null)}
              >
                <X size={14} />
              </Button>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
              <div className="flex items-center gap-1.5">
                {selectedMemberLocation.isSharing ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Radio size={11} className="animate-pulse" />
                    <span>Live in Field Service</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock size={12} />
                    <span>
                      Last seen{' '}
                      {timeAgo(
                        selectedMemberLocation.lastSeenAt || selectedMemberLocation.updatedAt
                      )}
                    </span>
                  </span>
                )}
              </div>
              {selectedMemberLocation.accuracy && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  ±{Math.round(selectedMemberLocation.accuracy)}m GPS
                </span>
              )}
            </div>

            {/* Quick Actions */}
            <div className="pt-1 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-semibold gap-1.5 rounded-xl h-8"
                onClick={() => {
                  setSearchedLocation({
                    lat: selectedMemberLocation.latitude,
                    lng: selectedMemberLocation.longitude,
                    zoom: 19,
                    timestamp: Date.now(),
                  });
                }}
              >
                <Navigation size={13} className="text-primary" />
                <span>Center on Map</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sheets: Log Visit & Encounter */}
      <HouseholdLogVisitSheet
        open={!!logVisitHousehold}
        onOpenChange={(op) => !op && setLogVisitHousehold(null)}
        household={logVisitHousehold}
        assignmentId={activeAssignmentId}
        onSaved={onHouseholdSaved}
      />

      <HouseholdEncounterSheet
        open={!!encounterHousehold}
        onOpenChange={(op) => !op && setEncounterHousehold(null)}
        household={encounterHousehold}
        onSaved={onHouseholdSaved}
      />

      {/* Dialog: Add or Edit Landmark */}
      <StudioLandmarkDialog
        open={landmarkDialogOpen}
        onOpenChange={(op) => {
          setLandmarkDialogOpen(op);
          if (!op) {
            setSelectedLandmark(null);
            setTempLandmarkCoordinates(null);
          }
        }}
        coordinates={tempLandmarkCoordinates}
        initialData={selectedLandmark}
        onSave={async (data) => {
          if (!territory?.id) return;
          try {
            const existingLandmarks = territory.annotations?.landmarks || [];
            if (data.id) {
              // Update existing
              const updated = existingLandmarks.map((lm) =>
                lm.id === data.id
                  ? {
                      ...lm,
                      label: data.label,
                      type: data.type,
                      lat: data.lat,
                      lng: data.lng,
                      updatedById: user?.id || null,
                      updatedByName: user?.name || null,
                      updatedAt: new Date().toISOString(),
                    }
                  : lm
              );
              await saveAnnotations({
                ...territory.annotations,
                landmarks: updated,
              });
              toast.success(`Landmark "${data.label}" updated!`);
            } else {
              // Create new
              const newLandmark: MapLandmark = {
                id: createClientId(),
                type: data.type,
                lat: data.lat,
                lng: data.lng,
                label: data.label,
                createdById: user?.id || null,
                creatorName: user?.name || null,
                createdAt: new Date().toISOString(),
              };
              await saveAnnotations({
                ...territory.annotations,
                landmarks: [...existingLandmarks, newLandmark],
              });
              toast.success(`Landmark "${data.label}" saved!`);
            }
            setActiveTool('pointer');
          } catch (_err) {
            toast.error('Failed to save landmark.');
          }
        }}
        onDelete={async (landmarkId) => {
          if (!territory?.id) return;
          try {
            const existingLandmarks = territory.annotations?.landmarks || [];
            const filtered = existingLandmarks.filter((lm) => lm.id !== landmarkId);
            await saveAnnotations({
              ...territory.annotations,
              landmarks: filtered,
            });
            toast.success('Landmark deleted');
            setSelectedLandmark(null);
          } catch (_err) {
            toast.error('Failed to delete landmark.');
          }
        }}
      />

      {/* Dialog: Save or Edit Road */}
      <StudioRoadDialog
        open={roadDialogOpen}
        onOpenChange={(op) => {
          setRoadDialogOpen(op);
          if (!op) setSelectedRoad(null);
        }}
        pointCount={drawnPoints.length}
        initialData={selectedRoad}
        onSave={async (data) => {
          if (!territory?.id) return;
          try {
            const existingRoads = territory.annotations?.roads || [];
            if (data.id) {
              // Update existing road
              const updated = existingRoads.map((r) =>
                r.id === data.id
                  ? {
                      ...r,
                      name: data.name,
                      color: data.type,
                      updatedById: user?.id || null,
                      updatedByName: user?.name || null,
                      updatedAt: new Date().toISOString(),
                    }
                  : r
              );
              await saveAnnotations({
                ...territory.annotations,
                roads: updated,
              });
              toast.success(`Road "${data.name}" updated!`);
            } else {
              // Create new road
              const newRoad: MapRoad = {
                id: createClientId(),
                points: drawnPoints,
                name: data.name,
                color: data.type,
                createdById: user?.id || null,
                creatorName: user?.name || null,
                createdAt: new Date().toISOString(),
              };

              // Automatically insert junction vertices into connected existing roads
              let nextExistingRoads = [...existingRoads];
              if (snappedJunctionsRef.current.length > 0) {
                for (const junction of snappedJunctionsRef.current) {
                  if (!junction.isVertex) {
                    nextExistingRoads = nextExistingRoads.map((r) =>
                      r.id === junction.roadId
                        ? insertJunctionVertexIntoRoad(r, junction.point, junction.segmentIndex)
                        : r
                    );
                  }
                }
                snappedJunctionsRef.current = [];
              }

              await saveAnnotations({
                ...territory.annotations,
                roads: [...nextExistingRoads, newRoad],
              });
              toast.success(`Road "${data.name}" saved!`);
              setDrawnPoints([]);
            }
            setActiveTool('pointer');
          } catch (_err) {
            toast.error('Failed to save road.');
          }
        }}
        onDelete={async (roadId) => {
          if (!territory?.id) return;
          try {
            const existingRoads = territory.annotations?.roads || [];
            const filtered = existingRoads.filter((r) => r.id !== roadId);
            await saveAnnotations({
              ...territory.annotations,
              roads: filtered,
            });
            toast.success('Road deleted');
            setSelectedRoad(null);
          } catch (_err) {
            toast.error('Failed to delete road.');
          }
        }}
      />

      {/* Dialog: Edit Start Meeting Flag */}
      <ResponsiveDialog
        open={startFlagDialogOpen}
        onOpenChange={setStartFlagDialogOpen}
        title="Territory Start Meeting Point"
        description="Update the meeting label or remove the start flag from this territory."
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="start-flag-label" className="text-xs font-semibold">
              Meeting Point Label
            </Label>
            <Input
              id="start-flag-label"
              value={startFlagLabel}
              onChange={(e) => setStartFlagLabel(e.target.value)}
              placeholder="e.g. Start Meeting Point, Purok 1 Gate"
              className="text-xs"
            />
          </div>

          {territory?.annotations?.startFlag?.creatorName && (
            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground flex items-center gap-2">
              <User size={13} className="shrink-0 text-muted-foreground/70" />
              <span>
                Contributor:{' '}
                <strong className="font-semibold text-foreground">
                  {territory.annotations.startFlag.creatorName}
                </strong>
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={async () => {
                if (!territory?.id) return;
                try {
                  const ann = { ...territory.annotations };
                  delete ann.startFlag;
                  await saveAnnotations(ann);
                  toast.success('Start flag removed');
                  setStartFlagDialogOpen(false);
                } catch (_err) {
                  toast.error('Failed to remove start flag');
                }
              }}
              className="text-xs rounded-xl gap-1"
            >
              <Trash2 size={13} />
              <span>Remove Flag</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStartFlagDialogOpen(false)}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={async () => {
                  if (!territory?.id || !territory.annotations?.startFlag) return;
                  try {
                    await saveAnnotations({
                      ...territory.annotations,
                      startFlag: {
                        ...territory.annotations.startFlag,
                        label: startFlagLabel.trim() || 'Start Meeting Point',
                        updatedById: user?.id || null,
                        updatedByName: user?.name || null,
                        updatedAt: new Date().toISOString(),
                      },
                    });
                    toast.success('Start flag updated');
                    setStartFlagDialogOpen(false);
                  } catch (_err) {
                    toast.error('Failed to update start flag');
                  }
                }}
                className="text-xs rounded-xl font-semibold"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </ResponsiveDialog>

      {/* Dialog: Edit Independent Boundary Polygon */}
      <StudioBoundaryDialog
        open={boundaryDialogOpen}
        onOpenChange={setBoundaryDialogOpen}
        boundary={selectedBoundary}
        onSave={async (id, name) => {
          if (!territory?.id) return;
          const existingBoundaries = getTerritoryBoundaries(territory);
          const updated = existingBoundaries.map((b) =>
            b.id === id
              ? {
                  ...b,
                  name,
                  updatedById: user?.id || null,
                  updatedByName: user?.name || null,
                  updatedAt: new Date().toISOString(),
                }
              : b
          );
          await saveAnnotations({
            ...territory.annotations,
            boundaries: updated,
          });
          toast.success('Boundary updated');
          setSelectedBoundary((prev) => (prev ? { ...prev, name } : null));
        }}
        onDelete={async (id) => {
          if (!territory?.id) return;
          const existingBoundaries = getTerritoryBoundaries(territory);
          const updated = existingBoundaries.filter((b) => b.id !== id);
          await saveAnnotations({
            ...territory.annotations,
            boundaries: updated,
          });
          toast.success('Boundary polygon deleted');
          setSelectedBoundary(null);
        }}
      />

      {/* Dialog: Edit Territory Details */}
      <ResponsiveDialog
        open={editTerritoryOpen}
        onOpenChange={setEditTerritoryOpen}
        title={territory ? `Edit Territory #${territory.number}` : 'Edit Territory'}
        description="Update territory number, name, district, or notes"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!territory?.id) return;
            if (!editNumber.trim() || !editName.trim()) {
              toast.error('Number and name are required');
              return;
            }
            const duplicate = findDuplicateTerritory(editNumber, allTerritories, territory.id);
            if (duplicate) {
              toast.error(`Territory #${duplicate.number} already exists in this congregation.`);
              return;
            }
            try {
              await updateTerritory(territory.id, {
                number: editNumber.trim(),
                name: editName.trim(),
                city: editCity.trim() || null,
                notes: editNotes.trim() || null,
              });
              toast.success(`Territory #${editNumber.trim()} updated successfully!`);
              setEditTerritoryOpen(false);
            } catch (err: any) {
              toast.error(err?.message || 'Failed to update territory');
            }
          }}
          className="space-y-4 pt-2"
        >
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1 col-span-1">
              <Label htmlFor="studio-edit-number" className="text-xs font-semibold">
                Number *
              </Label>
              <Input
                id="studio-edit-number"
                value={editNumber}
                onChange={(e) => setEditNumber(e.target.value)}
                placeholder="e.g. 101"
                className="h-9 rounded-xl text-xs"
                required
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label htmlFor="studio-edit-name" className="text-xs font-semibold">
                Territory Name *
              </Label>
              <Input
                id="studio-edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Downtown West"
                className="h-9 rounded-xl text-xs"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="studio-edit-city" className="text-xs font-semibold">
              City / District
            </Label>
            <Input
              id="studio-edit-city"
              value={editCity}
              onChange={(e) => setEditCity(e.target.value)}
              placeholder="e.g. Manila"
              className="h-9 rounded-xl text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="studio-edit-notes" className="text-xs font-semibold">
              Notes / Instructions
            </Label>
            <Input
              id="studio-edit-notes"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Optional territory notes..."
              className="h-9 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl text-xs"
              onClick={() => setEditTerritoryOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-xl text-xs font-semibold"
              disabled={updatingTerritory}
            >
              {updatingTerritory ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </ResponsiveDialog>
    </div>
  );
}
