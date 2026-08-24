'use client';

import { ArrowLeft, Eye, Filter, Home, MapPin, Menu, Radio, Search, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrentUser } from '@/hooks';
import { timeAgo } from '@/lib/time-ago';
import type {
  Congregation,
  Group,
  Household,
  MapLandmark,
  MapRoad,
  SharedMemberLocation,
  Territory,
} from '@/types/api';

export interface CongregationTopBarProps {
  congregationId: string;
  congregation?: Congregation | null;
  territories: Territory[];
  groups?: Group[];
  households?: Household[];
  statusFilter: string;
  onChangeStatusFilter: (status: string) => void;
  groupFilterId: string;
  onChangeGroupFilterId: (groupId: string) => void;
  onSearchLocation: (query: string) => void;
  onSelectTerritory: (territory: Territory) => void;
  onSelectHousehold: (household: Household) => void;
  onSelectLandmark: (landmark: MapLandmark, territory: Territory) => void;
  onSelectRoad: (road: MapRoad, territory: Territory) => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
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
}

export function CongregationTopBar({
  congregationId,
  congregation,
  territories,
  groups = [],
  households = [],
  statusFilter,
  onChangeStatusFilter,
  groupFilterId,
  onChangeGroupFilterId,
  onSearchLocation,
  onSelectTerritory,
  onSelectHousehold,
  onSelectLandmark,
  onSelectRoad,
  onToggleSidebar,
  sidebarOpen,
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
}: CongregationTopBarProps) {
  const { user } = useCurrentUser();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [membersMenuOpen, setMembersMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedDurationPreset, setSelectedDurationPreset] = useState<number>(120);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }, [isSharingLocation, sharingExpiresAt, nowTick]);

  const activeSharingMembersCount = useMemo(() => {
    return visibleMemberLocations.filter((m) => m.isSharing && m.userId !== user?.id).length;
  }, [visibleMemberLocations, user?.id]);

  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus();
    }
  }, [searchOpen]);

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

  // Search Results across Congregation
  const matchedTerritories = useMemo(() => {
    if (!query) return [];
    return territories
      .filter((t) => {
        const num = (t.number || '').toLowerCase();
        const name = (t.name || '').toLowerCase();
        const city = (t.city || '').toLowerCase();
        return num.includes(query) || name.includes(query) || city.includes(query);
      })
      .slice(0, 4);
  }, [query, territories]);

  const matchedHouseholds = useMemo(() => {
    if (!query || !households || households.length === 0) return [];
    return households
      .filter((h) => {
        const addr = (h.address || '').toLowerCase();
        const street = (h.streetName || '').toLowerCase();
        const num = (h.houseNumber || '').toLowerCase();
        return addr.includes(query) || street.includes(query) || num.includes(query);
      })
      .slice(0, 4);
  }, [query, households]);

  const matchedLandmarks = useMemo(() => {
    if (!query) return [];
    const results: Array<{ landmark: MapLandmark; territory: Territory }> = [];
    for (const t of territories) {
      if (t.annotations?.landmarks) {
        for (const lm of t.annotations.landmarks) {
          const lbl = (lm.label || '').toLowerCase();
          const typ = (lm.type || '').toLowerCase();
          if (lbl.includes(query) || typ.includes(query)) {
            results.push({ landmark: lm, territory: t });
            if (results.length >= 4) break;
          }
        }
      }
      if (results.length >= 4) break;
    }
    return results;
  }, [query, territories]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (matchedTerritories.length > 0) {
      onSelectTerritory(matchedTerritories[0]);
      setSearchQuery('');
      setSearchOpen(false);
    } else if (matchedHouseholds.length > 0) {
      onSelectHousehold(matchedHouseholds[0]);
      setSearchQuery('');
      setSearchOpen(false);
    } else if (matchedLandmarks.length > 0) {
      onSelectLandmark(matchedLandmarks[0].landmark, matchedLandmarks[0].territory);
      setSearchQuery('');
      setSearchOpen(false);
    } else {
      onSearchLocation(searchQuery.trim());
      setSearchOpen(false);
    }
  };

  const hasActiveFilters = statusFilter !== 'all' || groupFilterId !== 'all';

  return (
    <div
      ref={containerRef}
      className="absolute top-3 sm:top-4 inset-x-0 z-30 flex flex-col items-center px-3 sm:px-4 pointer-events-none"
    >
      <div className="pointer-events-auto min-w-0 max-w-full overflow-x-auto no-scrollbar scrollbar-none flex items-center gap-1.5 p-1.5 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-2xl transition-[width,max-width,padding,background-color] duration-300 ease-out touch-pan-x overscroll-x-contain">
        {/* Back to Territory Directory */}
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground shrink-0"
          title="Back to Territory Directory"
        >
          <Link href={`/congregation/${congregationId}/territories`}>
            <ArrowLeft size={16} />
          </Link>
        </Button>

        {/* Workspace Sidebar Toggle */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-9 w-9 rounded-xl transition-colors duration-150 shrink-0 ${
            sidebarOpen ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={onToggleSidebar}
          title="Toggle Territory Directory Drawer"
        >
          <Menu size={16} />
        </Button>

        {/* Congregation Title & Overview Badge */}
        <div className="flex items-center gap-2 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-xl text-primary text-xs font-bold shrink-0">
          <MapPin size={13} className="shrink-0 text-primary" />
          <span className="hidden md:inline font-semibold text-foreground">
            {congregation?.name || 'Congregation'} Map Overview
          </span>
          <span className="md:hidden font-bold">Overview</span>
        </div>

        {/* Read-Only Overview Badge */}
        <div
          className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-semibold shrink-0"
          title="Entire congregation map in read-only inspection mode"
        >
          <Eye size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">All Territories</span>
          <span className="text-[10px] font-bold">({territories.length})</span>
        </div>

        <div className="hidden sm:block h-5 w-px bg-border mx-1 shrink-0" />

        {/* Filter Popover Trigger */}
        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                hasActiveFilters
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              title="Filter visible territories and doors"
            >
              <Filter size={14} />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <span className="h-2 w-2 rounded-full bg-white dark:bg-slate-900" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="center"
            side="bottom"
            sideOffset={8}
            className="w-72 p-3.5 rounded-2xl bg-card border border-border shadow-2xl space-y-3 pointer-events-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-bold text-foreground">Territory Filters</span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    onChangeStatusFilter('all');
                    onChangeGroupFilterId('all');
                  }}
                  className="text-[10px] font-semibold text-primary hover:underline"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="space-y-1.5">
              <span className="block text-[11px] font-semibold text-muted-foreground">
                Territory Status
              </span>
              <Select value={statusFilter} onValueChange={onChangeStatusFilter}>
                <SelectTrigger className="h-8 rounded-xl text-xs bg-background">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">All Statuses ({territories.length})</SelectItem>
                  <SelectItem value="available">🟢 Available for Assignment</SelectItem>
                  <SelectItem value="assigned">🔵 Currently Assigned</SelectItem>
                  <SelectItem value="completed">⚪ Completed / Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Service Group Filter */}
            <div className="space-y-1.5">
              <span className="block text-[11px] font-semibold text-muted-foreground">
                Service Group
              </span>
              <Select value={groupFilterId} onValueChange={onChangeGroupFilterId}>
                <SelectTrigger className="h-8 rounded-xl text-xs bg-background">
                  <SelectValue placeholder="All Service Groups" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">All Service Groups</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>

        {/* Member Location Sharing Popover */}
        {(onToggleShareLocation || onStartShareLocation) && (
          <Popover open={shareMenuOpen} onOpenChange={setShareMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={isSharingPending}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all duration-200 cursor-pointer ${
                  isSharingLocation
                    ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                title="Share your live location"
              >
                <Radio size={14} className={isSharingLocation ? 'animate-pulse text-white' : ''} />
                <span className="hidden md:inline">
                  {isSharingLocation ? 'Sharing Live' : 'Share GPS'}
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
              className="w-76 p-3.5 rounded-2xl bg-card border border-border shadow-2xl space-y-3 pointer-events-auto"
            >
              {isSharingLocation ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <Radio size={14} className="animate-pulse" />
                    <span>Live GPS Active ({remainingTimeStr})</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {[15, 30, 60].map((mins) => (
                      <Button
                        key={mins}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs rounded-lg font-semibold"
                        onClick={() => onExtendShareLocation?.(mins)}
                      >
                        +{mins}m
                      </Button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="w-full rounded-xl text-xs font-bold h-8"
                    onClick={() => {
                      onStopShareLocation?.();
                      setShareMenuOpen(false);
                    }}
                  >
                    Stop Sharing
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-foreground">Share Live GPS</div>
                  <div className="grid grid-cols-3 gap-1">
                    {[30, 60, 120, 240].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setSelectedDurationPreset(mins)}
                        className={`py-1.5 rounded-lg text-xs font-semibold border ${
                          selectedDurationPreset === mins
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted border-border'
                        }`}
                      >
                        {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                      </button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="w-full rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                    onClick={() => {
                      onStartShareLocation?.(selectedDurationPreset);
                      setShareMenuOpen(false);
                    }}
                  >
                    Start Sharing
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}

        {/* Live Publishers in Field Ministry */}
        {canViewMembers && (
          <Popover open={membersMenuOpen} onOpenChange={setMembersMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  activeSharingMembersCount > 0
                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                title="View publishers currently in field ministry"
              >
                <Users size={14} />
                <span className="hidden lg:inline">Publishers</span>
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
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="center"
              side="bottom"
              sideOffset={8}
              className="w-80 max-h-96 overflow-y-auto p-2 rounded-2xl bg-card border border-border shadow-2xl space-y-1 pointer-events-auto"
            >
              <div className="flex items-center justify-between px-2 py-1 border-b border-border">
                <span className="text-xs font-bold text-foreground">Publisher Locations</span>
                <span className="text-[10px] text-muted-foreground">
                  {visibleMemberLocations.length} registered
                </span>
              </div>
              {visibleMemberLocations.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No publishers currently sharing location.
                </div>
              ) : (
                visibleMemberLocations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      onSelectMemberLocation?.(loc);
                      setMembersMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-muted/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-7 w-7 rounded-lg border border-border">
                        {loc.avatarUrl && <AvatarImage src={loc.avatarUrl} alt={loc.userName} />}
                        <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                          {(loc.userName || 'P').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {loc.userName}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {loc.groupName || 'Service Group'}
                        </p>
                      </div>
                    </div>
                    {loc.isSharing ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600">
                        Live
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        {timeAgo(loc.lastSeenAt || loc.updatedAt)}
                      </span>
                    )}
                  </button>
                ))
              )}
            </PopoverContent>
          </Popover>
        )}

        <div className="h-5 w-px bg-border mx-1 shrink-0" />

        {/* Search Bar */}
        <div
          className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out shrink-0 ${
            searchOpen ? 'w-48 sm:w-64 opacity-100 mr-0.5' : 'w-0 opacity-0 pointer-events-none'
          }`}
        >
          <form onSubmit={handleSearchSubmit} className="flex items-center w-full relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search territory #, street, door…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full pl-7 pr-6 text-xs bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
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

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-9 w-9 rounded-xl transition-colors duration-200 shrink-0 ${
            searchOpen ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => {
            setSearchOpen((prev) => !prev);
            if (searchOpen) setSearchQuery('');
          }}
          title={searchOpen ? 'Close search' : 'Search in congregation'}
        >
          {searchOpen ? <X size={15} /> : <Search size={15} />}
        </Button>
      </div>

      {/* Auto-suggest Dropdown below Search */}
      {searchOpen && query && (
        <div className="pointer-events-auto mt-2 w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl p-2 space-y-2 animate-in fade-in slide-in-from-top-2">
          {matchedTerritories.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase px-2">
                Territories
              </span>
              {matchedTerritories.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onSelectTerritory(t);
                    setSearchQuery('');
                    setSearchOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted/70 text-left text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">#{t.number}</span>
                    <span className="font-semibold text-foreground">{t.name}</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] uppercase font-bold">
                    {t.status}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {matchedHouseholds.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase px-2">
                Households
              </span>
              {matchedHouseholds.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    onSelectHousehold(h);
                    setSearchQuery('');
                    setSearchOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted/70 text-left text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Home size={13} className="text-primary shrink-0" />
                    <span className="truncate">{h.address}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 capitalize">
                    {h.status.replace(/_/g, ' ')}
                  </span>
                </button>
              ))}
            </div>
          )}

          {matchedLandmarks.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase px-2">
                Landmarks
              </span>
              {matchedLandmarks.map(({ landmark, territory }) => (
                <button
                  key={landmark.id}
                  type="button"
                  onClick={() => {
                    onSelectLandmark(landmark, territory);
                    setSearchQuery('');
                    setSearchOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted/70 text-left text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <MapPin size={13} className="text-emerald-600 shrink-0" />
                    <span className="truncate">{landmark.label || landmark.type}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    #{territory.number}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
