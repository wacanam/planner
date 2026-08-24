'use client';

import {
  ChevronDown,
  Clock,
  Eye,
  Flag,
  Hexagon,
  Home,
  Keyboard,
  Map as MapIcon,
  MapPin,
  Menu,
  Milestone,
  MousePointer,
  Plus,
  Printer,
  Radio,
  Redo2,
  Search,
  Timer,
  Undo2,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCurrentUser } from '@/hooks';
import { canEditTerritory, canModifyBoundary } from '@/lib/permissions';
import { timeAgo } from '@/lib/time-ago';
import type { Household, MapLandmark, MapRoad, SharedMemberLocation } from '@/types/api';

export type StudioTool = 'pointer' | 'boundary' | 'road' | 'pin' | 'landmark' | 'start';

interface StudioTopBarProps {
  activeTool: StudioTool;
  onSelectTool: (tool: StudioTool) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  territoryNumber?: string;
  territoryName?: string;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  onSearchLocation?: (query: string) => void;
  onOpenPrintViewport?: () => void;
  onOpenShortcutsDialog?: () => void;
  households?: Household[];
  landmarks?: MapLandmark[];
  roads?: MapRoad[];
  onSelectHousehold?: (household: Household) => void;
  onSelectLandmark?: (landmark: MapLandmark) => void;
  onSelectRoad?: (road: MapRoad) => void;
  isReadOnly?: boolean;
  isSharingLocation?: boolean;
  onToggleShareLocation?: (durationMinutes?: number) => void;
  onStartShareLocation?: (durationMinutes: number) => void;
  onStopShareLocation?: () => void;
  onExtendShareLocation?: (additionalMinutes: number) => void;
  isSharingPending?: boolean;
  sharingDurationMinutes?: number;
  sharingExpiresAt?: string | null;
  visibleMemberLocations?: SharedMemberLocation[];
  onSelectMemberLocation?: (loc: SharedMemberLocation) => void;
  canViewMembers?: boolean;
  congregationId?: string;
}

const getLandmarkEmoji = (type?: string) => {
  switch (type) {
    case 'tree':
      return '🌳';
    case 'school':
      return '🏫';
    case 'church':
      return '⛪';
    case 'store':
      return '🏪';
    case 'gate':
      return '🚪';
    case 'hazard':
      return '⚠️';
    case 'landmark':
      return '🏛️';
    default:
      return '📍';
  }
};

const getHouseholdStatusBadge = (status?: string) => {
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200';
    case 'not_home':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200';
    case 'busy':
      return 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border-orange-200';
    case 'return_visit':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200';
    case 'foreign_language':
      return 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-200';
    case 'vacant':
      return 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300 border-slate-200';
    case 'inaccessible':
      return 'bg-stone-50 text-stone-700 dark:bg-stone-900 dark:text-stone-300 border-stone-200';
    case 'do_not_visit':
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200';
    default:
      return 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300 border-slate-200';
  }
};

export function StudioTopBar({
  activeTool,
  onSelectTool,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  territoryNumber,
  territoryName,
  onToggleSidebar,
  sidebarOpen,
  onSearchLocation,
  onOpenPrintViewport,
  onOpenShortcutsDialog,
  households = [],
  landmarks = [],
  roads = [],
  onSelectHousehold,
  onSelectLandmark,
  onSelectRoad,
  isReadOnly = false,
  isSharingLocation = false,
  onToggleShareLocation,
  onStartShareLocation,
  onStopShareLocation,
  onExtendShareLocation,
  isSharingPending = false,
  sharingDurationMinutes = 120,
  sharingExpiresAt,
  visibleMemberLocations = [],
  onSelectMemberLocation,
  canViewMembers = false,
  congregationId,
}: StudioTopBarProps) {
  const { user } = useCurrentUser();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [membersMenuOpen, setMembersMenuOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [selectedDurationPreset, setSelectedDurationPreset] = useState<number>(120); // 2 hours default
  const [customHours, setCustomHours] = useState<string>('2');
  const [customMinutes, setCustomMinutes] = useState<string>('0');
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Periodic tick for live expiration countdown
  useEffect(() => {
    if (!isSharingLocation) return;
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isSharingLocation]);

  const remainingTimeStr = useMemo(() => {
    if (!isSharingLocation || !sharingExpiresAt) return '';
    const diffMs = new Date(sharingExpiresAt).getTime() - nowTick;
    if (diffMs <= 0) return 'Expiring…';
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }, [isSharingLocation, sharingExpiresAt, nowTick]);

  const activeSharingMembersCount = useMemo(() => {
    return visibleMemberLocations.filter((m) => m.isSharing && m.userId !== user?.id).length;
  }, [visibleMemberLocations, user?.id]);

  const canDrawBoundary = canModifyBoundary(user);

  const tools: Array<{
    id: StudioTool;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    servantOnly?: boolean;
    shortcut: string;
  }> = [
    { id: 'pointer', label: 'Select', icon: MousePointer, shortcut: '1' },
    { id: 'boundary', label: 'Boundary', icon: Hexagon, servantOnly: true, shortcut: '2' },
    { id: 'road', label: 'Road', icon: Milestone, shortcut: '3' },
    { id: 'pin', label: 'House Pin', icon: Home, shortcut: '4' },
    { id: 'landmark', label: 'Landmark', icon: MapPin, shortcut: '5' },
    { id: 'start', label: 'Start Flag', icon: Flag, shortcut: '6' },
  ];

  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus();
    }
  }, [searchOpen]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (!searchQuery.trim()) {
          setSearchOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchQuery]);

  const query = searchQuery.trim().toLowerCase();

  const matchedHouseholds = useMemo(() => {
    if (!query || !households || households.length === 0) return [];
    return households
      .filter((h) => {
        const addr = (h.address || '').toLowerCase();
        const street = (h.streetName || '').toLowerCase();
        const num = (h.houseNumber || '').toLowerCase();
        const notes = (h.notes || '').toLowerCase();
        const hType = (h.type || '').toLowerCase();
        return (
          addr.includes(query) ||
          street.includes(query) ||
          num.includes(query) ||
          notes.includes(query) ||
          hType.includes(query)
        );
      })
      .slice(0, 5);
  }, [query, households]);

  const matchedLandmarks = useMemo(() => {
    if (!query || !landmarks || landmarks.length === 0) return [];
    return landmarks
      .filter((lm) => {
        const lbl = (lm.label || '').toLowerCase();
        const type = (lm.type || '').toLowerCase();
        return lbl.includes(query) || type.includes(query);
      })
      .slice(0, 5);
  }, [query, landmarks]);

  const matchedRoads = useMemo(() => {
    if (!query || !roads || roads.length === 0) return [];
    return roads
      .filter((r) => {
        const name = (r.name || '').toLowerCase();
        return name.includes(query);
      })
      .slice(0, 3);
  }, [query, roads]);

  const totalResultsCount =
    matchedHouseholds.length + matchedLandmarks.length + matchedRoads.length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (matchedHouseholds.length > 0 && onSelectHousehold) {
      onSelectHousehold(matchedHouseholds[0]);
      setSearchQuery('');
      setSearchOpen(false);
    } else if (matchedLandmarks.length > 0 && onSelectLandmark) {
      onSelectLandmark(matchedLandmarks[0]);
      setSearchQuery('');
      setSearchOpen(false);
    } else if (matchedRoads.length > 0 && onSelectRoad) {
      onSelectRoad(matchedRoads[0]);
      setSearchQuery('');
      setSearchOpen(false);
    } else if (onSearchLocation) {
      onSearchLocation(searchQuery.trim());
      setSearchOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-3 sm:top-4 inset-x-0 z-30 flex flex-col items-center px-3 sm:px-4 pointer-events-none"
    >
      <div className="pointer-events-auto min-w-0 max-w-full overflow-x-auto no-scrollbar scrollbar-none flex items-center gap-1.5 p-1.5 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-2xl transition-[width,max-width,padding,background-color] duration-300 ease-out touch-pan-x overscroll-x-contain">
        {/* Toggle Sidebar Menu Button */}
        {onToggleSidebar && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-9 w-9 rounded-xl transition-colors duration-150 shrink-0 ${
              sidebarOpen
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={onToggleSidebar}
            title="Toggle Workspace Sidebar"
          >
            <Menu size={16} />
          </Button>
        )}

        {/* Territory identifier badge */}
        {(territoryNumber || territoryName) && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-xl text-primary text-xs font-bold transition-all shrink-0">
            <span>#{territoryNumber}</span>
            {territoryName && (
              <span className="font-medium text-foreground truncate max-w-[120px]">
                {territoryName}
              </span>
            )}
          </div>
        )}

        {/* Read-Only Status Indicator */}
        {isReadOnly && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-700 dark:text-amber-300 text-xs font-semibold shrink-0"
            title="Viewing territory in read-only mode (not assigned to you)"
          >
            <Eye size={13} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Read-Only</span>
          </div>
        )}

        {/* Shortcut to Congregation Overview Map */}
        {congregationId && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex h-8 px-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 gap-1.5 shrink-0"
            title="View entire congregation territory overview"
          >
            <Link href={`/congregation/${congregationId}/territories/overview`}>
              <MapIcon size={14} className="text-primary" />
              <span className="hidden lg:inline">Congregation Map</span>
            </Link>
          </Button>
        )}

        <div className="hidden sm:block h-5 w-px bg-border mx-1 shrink-0" />

        {/* Tool selector buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {tools
            .filter((t) => {
              if (isReadOnly) return t.id === 'pointer';
              if (t.servantOnly) return canDrawBoundary;
              return true;
            })
            .map((t) => {
              const Icon = t.icon;
              const isActive = activeTool === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTool(t.id)}
                  title={`${t.label} (Press ${t.shortcut})`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all duration-150 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon size={14} />
                  <span className="hidden lg:inline">{t.label}</span>
                  <kbd
                    className={`hidden xl:inline-flex items-center justify-center min-w-4 h-4 px-1 rounded text-[9px] font-mono font-bold leading-none ${
                      isActive
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {t.shortcut}
                  </kbd>
                </button>
              );
            })}
        </div>

        <div className="h-5 w-px bg-border mx-1 shrink-0" />

        {/* Location Sharing Popover & Button */}
        {(onToggleShareLocation || onStartShareLocation) && (
          <Popover open={shareMenuOpen} onOpenChange={setShareMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={isSharingPending}
                title={
                  isSharingLocation
                    ? `Live location sharing is ON (${remainingTimeStr} left). Click to manage or stop.`
                    : 'Share your live location with Group Overseer & Territory Servants'
                }
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all duration-200 cursor-pointer ${
                  isSharingLocation
                    ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:scale-95'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Radio size={14} className={isSharingLocation ? 'animate-pulse text-white' : ''} />
                <span className="hidden sm:inline">
                  {isSharingLocation ? 'Sharing Live' : 'Share Location'}
                </span>
                {isSharingLocation && remainingTimeStr && (
                  <span className="text-[10px] font-mono bg-emerald-800/80 text-emerald-100 px-1.5 py-0.5 rounded-md">
                    {remainingTimeStr}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="center"
              side="bottom"
              sideOffset={8}
              className="w-80 p-4 rounded-2xl bg-card border border-border shadow-2xl space-y-3.5 pointer-events-auto"
            >
              {isSharingLocation ? (
                /* Active Sharing Management View */
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <Radio size={14} className="animate-pulse" />
                        <span>Live Location Sharing Active</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        Visible to your Group Overseer, Territory Servants, and Service Overseer.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/60 border border-border flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <Timer size={15} className="text-primary" />
                      <span className="text-muted-foreground">Time Remaining:</span>
                    </div>
                    <span className="text-xs font-bold font-mono text-foreground">
                      {remainingTimeStr || 'Calculating…'}
                    </span>
                  </div>

                  {/* Quick Extend Buttons */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Extend Duration
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[15, 30, 60].map((mins) => (
                        <Button
                          key={mins}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs rounded-lg font-semibold gap-1"
                          onClick={() => {
                            if (onExtendShareLocation) {
                              onExtendShareLocation(mins);
                            } else if (onToggleShareLocation) {
                              onToggleShareLocation(mins);
                            }
                          }}
                        >
                          <Plus size={11} />
                          <span>{mins < 60 ? `${mins}m` : '1h'}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Stop Sharing Button */}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="w-full rounded-xl text-xs font-bold gap-1.5"
                    onClick={() => {
                      if (onStopShareLocation) {
                        onStopShareLocation();
                      } else if (onToggleShareLocation) {
                        onToggleShareLocation();
                      }
                      setShareMenuOpen(false);
                    }}
                  >
                    <X size={14} />
                    <span>Stop Sharing Location</span>
                  </Button>
                </div>
              ) : (
                /* Inactive: Setup Sharing Duration & Start View */
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <Radio size={14} className="text-primary" />
                      <span>Share Your Location</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Choose how long to share your position with your Group Overseer & Servants.
                    </p>
                  </div>

                  {/* Presets */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Duration
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: '15 mins', value: 15 },
                        { label: '30 mins', value: 30 },
                        { label: '1 hour', value: 60 },
                        { label: '2 hours', value: 120 },
                        { label: '4 hours', value: 240 },
                        { label: '8 hours', value: 480 },
                      ].map((preset) => {
                        const isSelected =
                          !isCustomDuration && selectedDurationPreset === preset.value;
                        return (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => {
                              setIsCustomDuration(false);
                              setSelectedDurationPreset(preset.value);
                            }}
                            className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                : 'bg-background hover:bg-muted/60 border-border text-foreground'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Duration Toggle & Inputs */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCustomDuration(!isCustomDuration)}
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {isCustomDuration ? '← Back to Presets' : 'Custom Duration (Hours / Mins)…'}
                    </button>

                    {isCustomDuration && (
                      <div className="mt-2 p-2.5 rounded-xl bg-muted/40 border border-border flex items-center gap-2">
                        <div className="flex-1 space-y-1">
                          <label
                            htmlFor="custom-duration-hours"
                            className="text-[10px] font-semibold text-muted-foreground"
                          >
                            Hours
                          </label>
                          <input
                            id="custom-duration-hours"
                            type="number"
                            min="0"
                            max="24"
                            value={customHours}
                            onChange={(e) => setCustomHours(e.target.value)}
                            className="w-full h-7 px-2 text-xs bg-background border border-input rounded-lg"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <label
                            htmlFor="custom-duration-minutes"
                            className="text-[10px] font-semibold text-muted-foreground"
                          >
                            Minutes
                          </label>
                          <input
                            id="custom-duration-minutes"
                            type="number"
                            min="0"
                            max="59"
                            step="5"
                            value={customMinutes}
                            onChange={(e) => setCustomMinutes(e.target.value)}
                            className="w-full h-7 px-2 text-xs bg-background border border-input rounded-lg"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Start Sharing CTA Button */}
                  <Button
                    type="button"
                    size="sm"
                    className="w-full rounded-xl text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      let totalMins = selectedDurationPreset;
                      if (isCustomDuration) {
                        const h = Math.max(0, parseInt(customHours, 10) || 0);
                        const m = Math.max(0, parseInt(customMinutes, 10) || 0);
                        totalMins = Math.max(5, h * 60 + m);
                      }
                      if (onStartShareLocation) {
                        onStartShareLocation(totalMins);
                      } else if (onToggleShareLocation) {
                        onToggleShareLocation(totalMins);
                      }
                      setShareMenuOpen(false);
                    }}
                  >
                    <Radio size={14} />
                    <span>Start Sharing Location</span>
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}

        {/* Group & Congregation Members Locations Selector (Overseers & Servants) */}
        {canViewMembers && (
          <Popover open={membersMenuOpen} onOpenChange={setMembersMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all duration-150 cursor-pointer ${
                  membersMenuOpen
                    ? 'bg-muted text-foreground'
                    : activeSharingMembersCount > 0
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                title="View group members locations"
              >
                <Users size={14} />
                <span className="hidden lg:inline">Members</span>
                {visibleMemberLocations.length > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      activeSharingMembersCount > 0
                        ? 'bg-emerald-600 text-white animate-pulse'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {activeSharingMembersCount > 0
                      ? `${activeSharingMembersCount} live`
                      : visibleMemberLocations.length}
                  </span>
                )}
                <ChevronDown size={12} className="opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="center"
              side="bottom"
              sideOffset={8}
              className="w-80 max-h-96 overflow-y-auto p-2 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-2xl space-y-2 pointer-events-auto"
            >
              <div className="flex items-center justify-between px-2 py-1 border-b border-border/60">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Users size={14} className="text-primary" />
                  <span>Member Locations</span>
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {visibleMemberLocations.length} publisher
                  {visibleMemberLocations.length === 1 ? '' : 's'}
                </span>
              </div>

              {visibleMemberLocations.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No publishers have shared their location yet in this group or congregation.
                </div>
              ) : (
                <div className="space-y-1">
                  {visibleMemberLocations.map((loc) => {
                    const initials = (loc.userName || 'P')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => {
                          onSelectMemberLocation?.(loc);
                          setMembersMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-muted/70 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <Avatar className="h-8 w-8 rounded-xl border border-border">
                              {loc.avatarUrl && (
                                <AvatarImage src={loc.avatarUrl} alt={loc.userName} />
                              )}
                              <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            {loc.isSharing && (
                              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white dark:border-slate-900" />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {loc.userName}
                              {loc.userId === user?.id && (
                                <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                                  (You)
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {loc.groupName || 'Service Group'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {loc.isSharing ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <Radio size={10} className="animate-pulse" />
                              <span>Live</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                              <Clock size={10} />
                              <span>{timeAgo(loc.lastSeenAt || loc.updatedAt)}</span>
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}

        <div className="h-5 w-px bg-border mx-1 shrink-0" />

        {/* Animated Search input container */}
        <div
          className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out shrink-0 ${
            searchOpen ? 'w-48 sm:w-64 opacity-100 mr-0.5' : 'w-0 opacity-0 pointer-events-none'
          }`}
        >
          <form onSubmit={handleSearchSubmit} className="flex items-center w-full relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search door, landmark, road…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 w-full pl-7 pr-6 text-xs bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary shadow-inner placeholder:text-muted-foreground/70"
            />
            <Search
              size={13}
              className="absolute left-2 text-muted-foreground pointer-events-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </form>
        </div>

        {/* Search toggle / close button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-9 w-9 rounded-xl transition-colors duration-200 shrink-0 ${
            searchOpen
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
          onClick={() => {
            setSearchOpen((prev) => !prev);
            if (searchOpen) setSearchQuery('');
          }}
          title={searchOpen ? 'Close search' : 'Search in territory'}
        >
          {searchOpen ? <X size={15} /> : <Search size={15} />}
        </Button>

        {/* Print Territory Card Viewport Trigger */}
        {onOpenPrintViewport && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpenPrintViewport}
            className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 shrink-0"
            title="Print territory card viewport"
          >
            <Printer size={15} />
          </Button>
        )}

        {/* Undo / Redo */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={isReadOnly || !canUndo}
          onClick={onUndo}
          className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground disabled:opacity-30 shrink-0"
          title="Undo point (Ctrl+Z / ⌘Z)"
        >
          <Undo2 size={15} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={isReadOnly || !canRedo}
          onClick={onRedo}
          className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground disabled:opacity-30 shrink-0"
          title="Redo"
        >
          <Redo2 size={15} />
        </Button>

        {/* Keyboard Shortcuts Help Dialog Trigger */}
        {onOpenShortcutsDialog && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpenShortcutsDialog}
            className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 shrink-0"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard size={15} />
          </Button>
        )}
      </div>

      {/* Live Search Results Dropdown */}
      {searchOpen && searchQuery.trim().length > 0 && (
        <div className="pointer-events-auto mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-2rem)] max-h-96 overflow-y-auto rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-2xl p-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Households Section */}
          {matchedHouseholds.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Home size={12} className="text-primary" />
                <span>Households ({matchedHouseholds.length})</span>
              </div>
              {matchedHouseholds.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    onSelectHousehold?.(h);
                    setSearchQuery('');
                    setSearchOpen(false);
                  }}
                  className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-muted/70 transition-colors group cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Home size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {h.houseNumber ? `#${h.houseNumber} ` : ''}
                      {h.address}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`text-[9px] font-medium px-1.5 py-0.2 rounded border capitalize ${getHouseholdStatusBadge(
                          h.status
                        )}`}
                      >
                        {h.status.replace(/_/g, ' ')}
                      </span>
                      {h.streetName && (
                        <span className="text-[10px] text-muted-foreground truncate">
                          {h.streetName}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Landmarks Section */}
          {matchedLandmarks.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin size={12} className="text-primary" />
                <span>Landmarks & POIs ({matchedLandmarks.length})</span>
              </div>
              {matchedLandmarks.map((lm) => (
                <button
                  key={lm.id}
                  type="button"
                  onClick={() => {
                    onSelectLandmark?.(lm);
                    setSearchQuery('');
                    setSearchOpen(false);
                  }}
                  className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-muted/70 transition-colors group cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-xs shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors">
                    {getLandmarkEmoji(lm.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {lm.label || 'Landmark'}
                    </p>
                    <p className="text-[10px] text-muted-foreground capitalize">
                      {lm.type} • Landmark POI
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Roads Section */}
          {matchedRoads.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Milestone size={12} className="text-primary" />
                <span>Roads & Streets ({matchedRoads.length})</span>
              </div>
              {matchedRoads.map((road) => (
                <button
                  key={road.id}
                  type="button"
                  onClick={() => {
                    onSelectRoad?.(road);
                    setSearchQuery('');
                    setSearchOpen(false);
                  }}
                  className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-muted/70 transition-colors group cursor-pointer"
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      backgroundColor: `${road.color || '#3B82F6'}20`,
                      color: road.color || '#3B82F6',
                    }}
                  >
                    <Milestone size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {road.name || 'Road Corridor'}
                    </p>
                    <p className="text-[10px] text-muted-foreground capitalize">
                      Road Corridor • {road.points.length} points
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Fallback / Search on Google Maps */}
          <div className={`${totalResultsCount > 0 ? 'pt-1 border-t border-border/50' : ''}`}>
            <button
              type="button"
              onClick={() => {
                if (onSearchLocation) {
                  onSearchLocation(searchQuery.trim());
                }
                setSearchOpen(false);
              }}
              className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-medium text-primary hover:bg-primary/10 transition-colors text-left cursor-pointer"
            >
              <Search size={13} className="shrink-0" />
              <span className="truncate">
                Search <strong>&quot;{searchQuery}&quot;</strong> on Google Maps
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
