'use client';

import {
  ExternalLink,
  Flag,
  FolderOpen,
  Hexagon,
  Home,
  MapPin,
  Milestone,
  Navigation,
  Radio,
  Search,
  User,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { KeyboardShortcutsDialog } from '@/components/shared/keyboard-shortcuts-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useCongregationGroups,
  useCurrentUser,
  useKeyboardShortcuts,
  useLocationSharing,
  useMemberLocations,
  useUserLocation,
} from '@/hooks';
import { getHouseholdMapLabel } from '@/lib/household-contacts';
import { useBasemapPreference } from '@/lib/map-preferences';
import { canViewMemberLocations } from '@/lib/permissions';
import { timeAgo } from '@/lib/time-ago';
import type {
  Congregation,
  Household,
  MapLandmark,
  MapRoad,
  SharedMemberLocation,
  Territory,
} from '@/types/api';
import { CongregationGoogleMap } from './CongregationGoogleMap';
import { CongregationTopBar } from './CongregationTopBar';
import type { BasemapMode } from './StudioBasemapPopup';
import {
  type BoundaryDisplaySettings,
  DEFAULT_BOUNDARY_DISPLAY,
  DEFAULT_STUDIO_LAYERS,
  type StudioLayerSettings,
  StudioMapToolbar,
} from './StudioMapToolbar';

export interface CongregationStudioLayoutProps {
  congregationId: string;
  congregation?: Congregation | null;
  territories: Territory[];
  households: Household[];
}

export function CongregationStudioLayout({
  congregationId,
  congregation,
  territories,
  households,
}: CongregationStudioLayoutProps) {
  const _router = useRouter();
  const { user } = useCurrentUser();

  // Sidebar & Map States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [basemapMode, setBasemapMode] = useBasemapPreference();
  const [layers, setLayers] = useState<StudioLayerSettings>(DEFAULT_STUDIO_LAYERS);
  const [boundaryDisplay, setBoundaryDisplay] =
    useState<BoundaryDisplaySettings>(DEFAULT_BOUNDARY_DISPLAY);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groupFilterId, setGroupFilterId] = useState<string>('all');

  // Selection states
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<{
    landmark: MapLandmark;
    territory: Territory;
  } | null>(null);
  const [selectedRoad, setSelectedRoad] = useState<{
    road: MapRoad;
    territory: Territory;
  } | null>(null);
  const [selectedStartFlagTerritory, setSelectedStartFlagTerritory] = useState<Territory | null>(
    null
  );
  const [selectedMemberLocation, setSelectedMemberLocation] = useState<SharedMemberLocation | null>(
    null
  );

  // Camera & GPS navigation states
  const [camera, setCamera] = useState<{ heading: number; tilt: number }>({ heading: 0, tilt: 0 });
  const [targetCamera, setTargetCamera] = useState<{
    heading?: number;
    tilt?: number;
    immediate?: boolean;
    timestamp: number;
  } | null>(null);

  const [searchedLocation, setSearchedLocation] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    timestamp: number;
  } | null>(null);

  // Service groups & Location Sharing
  const { groups = [] } = useCongregationGroups(congregationId);
  const { memberLocations } = useMemberLocations(congregationId, user, groups);
  const {
    isSharing: isSharingLocation,
    isLocating: isSharingLocating,
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
    // Disabled for strict Data Privacy Compliance (no central live tracking)
    return false;
  }, []);

  const {
    isTracking: isTrackingLocation,
    location: userLocation,
    heading: userHeading,
    toggleTracking: toggleUserLocation,
  } = useUserLocation();

  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);

  const dismissAllFloatingCards = () => {
    setSelectedTerritory(null);
    setSelectedHousehold(null);
    setSelectedLandmark(null);
    setSelectedRoad(null);
    setSelectedStartFlagTerritory(null);
    setSelectedMemberLocation(null);
  };

  const cycleBasemap = () => {
    const nextMode: BasemapMode = basemapMode === 'satellite' ? 'street' : 'satellite';
    setBasemapMode(nextMode);
    toast.info(`Basemap: ${nextMode === 'satellite' ? 'Satellite' : 'Street'}`);
  };

  useKeyboardShortcuts([
    { key: ['Escape'], handler: () => dismissAllFloatingCards() },
    { key: ['m', 'M'], handler: () => cycleBasemap() },
    { key: ['['], handler: () => setSidebarOpen((prev) => !prev) },
    { key: ['?', 'Shift+?'], handler: () => setShortcutsDialogOpen(true) },
  ]);

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

  const handleSearchLocation = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return;

    // 1. Check territory number or name
    const matchedTerritory = territories.find(
      (t) => (t.number || '').toLowerCase() === q || (t.name || '').toLowerCase().includes(q)
    );
    if (matchedTerritory?.boundaryCoordinates) {
      dismissAllFloatingCards();
      setSelectedTerritory(matchedTerritory);

      const boundaries = matchedTerritory.boundaryCoordinates;
      let centerLat = 0;
      let centerLng = 0;
      let count = 0;
      if (Array.isArray(boundaries)) {
        boundaries.forEach((b: any) => {
          if (b.lat && b.lng) {
            centerLat += b.lat;
            centerLng += b.lng;
            count++;
          }
        });
      }
      if (count > 0) {
        setSearchedLocation({
          lat: centerLat / count,
          lng: centerLng / count,
          zoom: 17,
          timestamp: Date.now(),
        });
      }
      toast.success(`Focused on Territory #${matchedTerritory.number}: ${matchedTerritory.name}`);
      return;
    }

    // 2. Geocode with Google Maps Geocoder API
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
            zoom: 17,
            timestamp: Date.now(),
          });
          toast.success(`Navigated to: ${results[0].formatted_address}`);
        } else {
          toast.error(`Could not find location "${query}".`);
        }
      });
    } else {
      toast.error(`Could not find location "${query}".`);
    }
  };

  // Find parent territory helper for households
  const findParentTerritory = (tId?: string | null) => {
    if (!tId) return null;
    return territories.find((t) => t.id === tId) || null;
  };

  // Filtered territories for sidebar drawer
  const sidebarFilteredTerritories = useMemo(() => {
    return territories.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (groupFilterId !== 'all' && t.groupId !== groupFilterId) return false;
      if (sidebarSearch.trim()) {
        const q = sidebarSearch.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.number.toLowerCase().includes(q) ||
          (t.city || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [territories, statusFilter, groupFilterId, sidebarSearch]);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-muted/20 select-none">
      {/* Congregation Overview Top Navigation Bar */}
      <CongregationTopBar
        congregationId={congregationId}
        congregation={congregation}
        territories={territories}
        groups={groups}
        households={households}
        statusFilter={statusFilter}
        onChangeStatusFilter={setStatusFilter}
        groupFilterId={groupFilterId}
        onChangeGroupFilterId={setGroupFilterId}
        onSearchLocation={handleSearchLocation}
        onSelectTerritory={(t) => {
          dismissAllFloatingCards();
          setSelectedTerritory(t);
          if (
            t.boundaryCoordinates &&
            Array.isArray(t.boundaryCoordinates) &&
            t.boundaryCoordinates.length > 0
          ) {
            const first = t.boundaryCoordinates[0] as any;
            if (first.lat && first.lng) {
              setSearchedLocation({
                lat: first.lat,
                lng: first.lng,
                zoom: 17,
                timestamp: Date.now(),
              });
            }
          }
        }}
        onSelectHousehold={(h) => {
          dismissAllFloatingCards();
          setSelectedHousehold(h);
          if (h.latitude && h.longitude) {
            setSearchedLocation({
              lat: Number(h.latitude),
              lng: Number(h.longitude),
              zoom: 19,
              timestamp: Date.now(),
            });
          }
        }}
        onSelectLandmark={(lm, t) => {
          dismissAllFloatingCards();
          setSelectedLandmark({ landmark: lm, territory: t });
          setSearchedLocation({ lat: lm.lat, lng: lm.lng, zoom: 19, timestamp: Date.now() });
        }}
        onSelectRoad={(r, t) => {
          dismissAllFloatingCards();
          setSelectedRoad({ road: r, territory: t });
          if (r.points && r.points.length > 0) {
            setSearchedLocation({
              lat: r.points[0].lat,
              lng: r.points[0].lng,
              zoom: 18,
              timestamp: Date.now(),
            });
          }
        }}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        sidebarOpen={sidebarOpen}
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
        }}
        canViewMembers={canViewMembers}
      />

      {/* Google Maps Base Canvas */}
      <div className="w-full h-full relative">
        <CongregationGoogleMap
          territories={territories}
          congregation={congregation}
          households={households}
          memberLocations={memberLocations}
          selectedTerritoryId={selectedTerritory?.id}
          selectedHouseholdId={selectedHousehold?.id}
          selectedLandmarkId={selectedLandmark?.landmark.id}
          selectedRoadId={selectedRoad?.road.id}
          selectedStartFlagTerritoryId={selectedStartFlagTerritory?.id}
          selectedMemberLocationId={selectedMemberLocation?.id}
          onSelectTerritory={(t) => {
            dismissAllFloatingCards();
            setSelectedTerritory(t);
          }}
          onSelectHousehold={(h) => {
            dismissAllFloatingCards();
            setSelectedHousehold(h);
          }}
          onSelectLandmark={(lm, t) => {
            dismissAllFloatingCards();
            setSelectedLandmark({ landmark: lm, territory: t });
          }}
          onSelectRoad={(r, t) => {
            dismissAllFloatingCards();
            setSelectedRoad({ road: r, territory: t });
          }}
          onSelectStartFlag={(t) => {
            dismissAllFloatingCards();
            setSelectedStartFlagTerritory(t);
          }}
          onSelectMemberLocation={(loc) => {
            dismissAllFloatingCards();
            setSelectedMemberLocation(loc);
          }}
          onDeselectAll={dismissAllFloatingCards}
          basemapMode={basemapMode}
          layerSettings={layers}
          boundaryDisplay={boundaryDisplay}
          searchedLocation={searchedLocation}
          targetCamera={targetCamera}
          onCameraChange={setCamera}
          userLocation={userLocation}
          userHeading={userHeading}
          currentUserId={user.id}
          statusFilter={statusFilter}
          groupFilterId={groupFilterId}
        />
      </div>

      {/* Unified Floating Map Toolbar (Camera, Compass, GPS, Layers & Filters) */}
      <StudioMapToolbar
        mode={basemapMode}
        onSelectMode={setBasemapMode}
        layers={layers}
        onChangeLayers={setLayers}
        boundaryDisplay={boundaryDisplay}
        onChangeBoundaryDisplay={setBoundaryDisplay}
        heading={camera.heading}
        tilt={camera.tilt}
        onSetHeading={handleSetHeading}
        onSetTilt={handleSetTilt}
        isTrackingLocation={isTrackingLocation}
        onToggleLocation={toggleUserLocation}
      />

      {/* Territory Directory Drawer / Slide-Over Sidebar */}
      {sidebarOpen && (
        <div className="absolute top-16 left-4 bottom-20 sm:bottom-6 w-84 z-30 pointer-events-auto animate-in slide-in-from-left-4 duration-200">
          <div className="h-full flex flex-col bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hexagon size={16} className="text-primary" />
                <span className="font-bold text-sm text-foreground">Territory Navigator</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={14} />
              </Button>
            </div>

            {/* Search within drawer */}
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Filter territory # or name…"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                className="pl-8 h-8 rounded-xl text-xs bg-background"
              />
            </div>

            {/* Territories List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {sidebarFilteredTerritories.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No territories matched your filter.
                </div>
              ) : (
                sidebarFilteredTerritories.map((t) => {
                  const isSelected = selectedTerritory?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        dismissAllFloatingCards();
                        setSelectedTerritory(t);
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                        isSelected
                          ? 'bg-primary/10 border-primary shadow-xs'
                          : 'bg-card border-border/70 hover:bg-muted/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs text-primary">#{t.number}</span>
                            <span className="font-bold text-xs text-foreground truncate max-w-[130px]">
                              {t.name}
                            </span>
                          </div>
                          {t.city && (
                            <p className="text-[10px] text-muted-foreground truncate">{t.city}</p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase font-bold px-1.5 py-0"
                        >
                          {t.status}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                        <span>{t.householdsCount || 0} households</span>
                        <span>{Math.round(parseFloat(t.coveragePercent || '0'))}% coverage</span>
                      </div>

                      {/* Action buttons inside drawer item */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 rounded-xl text-[11px] font-semibold"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissAllFloatingCards();
                            setSelectedTerritory(t);
                          }}
                        >
                          Focus
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          className="flex-1 h-7 rounded-xl text-[11px] font-semibold gap-1"
                        >
                          <Link href={`/congregation/${congregationId}/territories/${t.id}`}>
                            <span>Studio</span>
                            <ExternalLink size={11} />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Card: Selected Territory Info */}
      {selectedTerritory && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-sm sm:w-full z-40 pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="p-4 pb-7 sm:pb-4 rounded-t-3xl rounded-b-none sm:rounded-3xl bg-card/95 backdrop-blur-md border-t sm:border border-border shadow-[0_-8px_30px_rgba(0,0,0,0.18)] sm:shadow-2xl space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto -mt-1 mb-1 sm:hidden" />
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                  <Hexagon size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-primary">
                      #{selectedTerritory.number}
                    </span>
                    <p className="font-bold text-sm text-foreground leading-snug">
                      {selectedTerritory.name}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedTerritory.city || 'Congregation Territory Zone'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedTerritory(null)}
              >
                <X size={14} />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-muted/40 border border-border text-center text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase">Status</p>
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase font-bold mt-0.5 capitalize"
                >
                  {selectedTerritory.status}
                </Badge>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase">Households</p>
                <p className="font-bold text-foreground mt-0.5">
                  {selectedTerritory.householdsCount || 0}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase">Coverage</p>
                <p className="font-bold text-foreground mt-0.5">
                  {Math.round(parseFloat(selectedTerritory.coveragePercent || '0'))}%
                </p>
              </div>
            </div>

            {(selectedTerritory.publisherName || selectedTerritory.groupName) && (
              <div className="text-xs text-muted-foreground p-2 rounded-xl bg-background border border-border flex items-center gap-2">
                {selectedTerritory.groupName ? (
                  <>
                    <Users size={14} className="text-primary shrink-0" />
                    <span>
                      Service Group:{' '}
                      <strong className="text-foreground">{selectedTerritory.groupName}</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <FolderOpen size={14} className="text-primary shrink-0" />
                    <span>
                      Publisher:{' '}
                      <strong className="text-foreground">{selectedTerritory.publisherName}</strong>
                    </span>
                  </>
                )}
              </div>
            )}

            {selectedTerritory.notes && (
              <p className="text-xs bg-muted/40 p-2.5 rounded-xl text-muted-foreground border border-border leading-relaxed">
                {selectedTerritory.notes}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <Button asChild className="w-full rounded-2xl text-xs font-bold gap-2 shadow-sm h-9">
                <Link href={`/congregation/${congregationId}/territories/${selectedTerritory.id}`}>
                  <span>Open in Territory Studio</span>
                  <ExternalLink size={13} />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Card: Selected Household Quick Info */}
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
              {selectedHousehold.territoryId && (
                <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                  Territory #{findParentTerritory(selectedHousehold.territoryId)?.number || 'Zone'}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
              <User size={12} className="text-muted-foreground/70 shrink-0" />
              <span>
                Added by{' '}
                <strong className="font-semibold text-foreground">
                  {selectedHousehold.creatorName ||
                    findParentTerritory(selectedHousehold.territoryId || '')?.publisherName ||
                    'Territory Contributor'}
                </strong>
              </span>
            </div>

            {selectedHousehold.notes && (
              <p className="text-xs bg-muted/40 p-2.5 rounded-xl text-muted-foreground border border-border leading-relaxed">
                {selectedHousehold.notes}
              </p>
            )}

            {selectedHousehold.territoryId && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full rounded-xl text-xs font-semibold gap-1.5"
              >
                <Link
                  href={`/congregation/${congregationId}/territories/${selectedHousehold.territoryId}`}
                >
                  <span>
                    Open Territory #{findParentTerritory(selectedHousehold.territoryId)?.number}
                  </span>
                  <ExternalLink size={12} />
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Floating Card: Selected Landmark Quick Info */}
      {selectedLandmark && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-sm sm:w-full z-40 pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="p-4 pb-7 sm:pb-4 rounded-t-3xl rounded-b-none sm:rounded-3xl bg-card/95 backdrop-blur-md border-t sm:border border-border shadow-[0_-8px_30px_rgba(0,0,0,0.18)] sm:shadow-2xl space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto -mt-1 mb-1 sm:hidden" />
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0 mt-0.5">
                  <MapPin size={16} />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground leading-snug">
                    {selectedLandmark.landmark.label || 'Landmark'}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {selectedLandmark.landmark.type} • Territory #
                    {selectedLandmark.territory.number}
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-0.5">
                    <User size={11} className="text-muted-foreground/70 shrink-0" />
                    <span>
                      Added by{' '}
                      <strong className="font-semibold text-foreground">
                        {selectedLandmark.landmark.creatorName ||
                          (selectedLandmark.landmark as any).createdByName ||
                          selectedLandmark.territory?.publisherName ||
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

            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs font-semibold gap-1.5"
            >
              <Link
                href={`/congregation/${congregationId}/territories/${selectedLandmark.territory.id}`}
              >
                <span>View in Territory #{selectedLandmark.territory.number} Studio</span>
                <ExternalLink size={12} />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Floating Card: Selected Road Quick Info */}
      {selectedRoad && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-sm sm:w-full z-40 pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="p-4 pb-7 sm:pb-4 rounded-t-3xl rounded-b-none sm:rounded-3xl bg-card/95 backdrop-blur-md border-t sm:border border-border shadow-[0_-8px_30px_rgba(0,0,0,0.18)] sm:shadow-2xl space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto -mt-1 mb-1 sm:hidden" />
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 shrink-0 mt-0.5">
                  <Milestone size={16} />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground leading-snug">
                    {selectedRoad.road.name || 'Road Corridor'}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {selectedRoad.road.color || 'street'} • Territory #
                    {selectedRoad.territory.number}
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-0.5">
                    <User size={11} className="text-muted-foreground/70 shrink-0" />
                    <span>
                      Drawn by{' '}
                      <strong className="font-semibold text-foreground">
                        {selectedRoad.road.creatorName ||
                          (selectedRoad.road as any).createdByName ||
                          selectedRoad.territory?.publisherName ||
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

            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs font-semibold gap-1.5"
            >
              <Link
                href={`/congregation/${congregationId}/territories/${selectedRoad.territory.id}`}
              >
                <span>View in Territory #{selectedRoad.territory.number} Studio</span>
                <ExternalLink size={12} />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Floating Card: Selected Start Meeting Flag Quick Info */}
      {selectedStartFlagTerritory && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-sm sm:w-full z-40 pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="p-4 pb-7 sm:pb-4 rounded-t-3xl rounded-b-none sm:rounded-3xl bg-card/95 backdrop-blur-md border-t sm:border border-border shadow-[0_-8px_30px_rgba(0,0,0,0.18)] sm:shadow-2xl space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto -mt-1 mb-1 sm:hidden" />
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 shrink-0 mt-0.5">
                  <Flag size={16} />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground leading-snug">
                    {selectedStartFlagTerritory.annotations?.startFlag?.label || 'Meeting Point'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Territory #{selectedStartFlagTerritory.number}:{' '}
                    {selectedStartFlagTerritory.name}
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-0.5">
                    <User size={11} className="text-muted-foreground/70 shrink-0" />
                    <span>
                      Set by{' '}
                      <strong className="font-semibold text-foreground">
                        {selectedStartFlagTerritory.annotations?.startFlag?.creatorName ||
                          (selectedStartFlagTerritory.annotations?.startFlag as any)
                            ?.createdByName ||
                          selectedStartFlagTerritory.publisherName ||
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
                onClick={() => setSelectedStartFlagTerritory(null)}
              >
                <X size={14} />
              </Button>
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs font-semibold gap-1.5"
            >
              <Link
                href={`/congregation/${congregationId}/territories/${selectedStartFlagTerritory.id}`}
              >
                <span>Open Territory #{selectedStartFlagTerritory.number} Studio</span>
                <ExternalLink size={12} />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Floating Card: Selected Member Location Quick Info */}
      {selectedMemberLocation && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-sm sm:w-full z-40 pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="p-4 pb-7 sm:pb-4 rounded-t-3xl rounded-b-none sm:rounded-3xl bg-card/95 backdrop-blur-md border-t sm:border border-border shadow-[0_-8px_30px_rgba(0,0,0,0.18)] sm:shadow-2xl space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto -mt-1 mb-1 sm:hidden" />
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <Avatar className="h-10 w-10 rounded-2xl border border-border shrink-0">
                  {selectedMemberLocation.avatarUrl && (
                    <AvatarImage
                      src={selectedMemberLocation.avatarUrl}
                      alt={selectedMemberLocation.userName}
                    />
                  )}
                  <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                    {(selectedMemberLocation.userName || 'P').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-foreground leading-snug truncate">
                    {selectedMemberLocation.userName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedMemberLocation.groupName || 'Service Group'}
                  </p>
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

            <div className="flex items-center justify-between pt-1 border-t border-border text-xs">
              <div className="flex items-center gap-1.5">
                {selectedMemberLocation.isSharing ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600">
                    <Radio size={11} className="animate-pulse" />
                    <span>Live in Field Service</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    Last seen{' '}
                    {timeAgo(selectedMemberLocation.lastSeenAt || selectedMemberLocation.updatedAt)}
                  </span>
                )}
              </div>
              {selectedMemberLocation.accuracy && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  ±{Math.round(selectedMemberLocation.accuracy)}m GPS
                </span>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs font-semibold gap-1.5 rounded-2xl h-8"
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
      )}

      {/* Global Keyboard Shortcuts Cheat Sheet Dialog */}
      <KeyboardShortcutsDialog
        open={shortcutsDialogOpen}
        onOpenChange={setShortcutsDialogOpen}
        defaultTab="studio"
      />
    </div>
  );
}
