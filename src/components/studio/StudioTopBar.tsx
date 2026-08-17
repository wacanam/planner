'use client';

import {
  Eye,
  Flag,
  Home,
  MapPin,
  Menu,
  Milestone,
  MousePointer,
  Printer,
  Redo2,
  Search,
  Square,
  Undo2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks';
import { isTerritoryServant } from '@/lib/permissions';
import type { Household, MapLandmark, MapRoad } from '@/types/api';

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
  households?: Household[];
  landmarks?: MapLandmark[];
  roads?: MapRoad[];
  onSelectHousehold?: (household: Household) => void;
  onSelectLandmark?: (landmark: MapLandmark) => void;
  onSelectRoad?: (road: MapRoad) => void;
  isReadOnly?: boolean;
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
    case 'return_visit':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200';
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
  households = [],
  landmarks = [],
  roads = [],
  onSelectHousehold,
  onSelectLandmark,
  onSelectRoad,
  isReadOnly = false,
}: StudioTopBarProps) {
  const { user } = useCurrentUser();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const canDrawBoundary = isTerritoryServant(user.role);

  const tools: Array<{
    id: StudioTool;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    servantOnly?: boolean;
  }> = [
    { id: 'pointer', label: 'Select', icon: MousePointer },
    { id: 'boundary', label: 'Boundary', icon: Square, servantOnly: true },
    { id: 'road', label: 'Road', icon: Milestone },
    { id: 'pin', label: 'House Pin', icon: Home },
    { id: 'landmark', label: 'Landmark', icon: MapPin },
    { id: 'start', label: 'Start Flag', icon: Flag },
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
      className="absolute top-4 inset-x-0 z-30 flex flex-col items-center px-4 pointer-events-none"
    >
      <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-2xl transition-[width,max-width,padding,background-color] duration-300 ease-out">
        {/* Toggle Sidebar Menu Button */}
        {onToggleSidebar && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-9 w-9 rounded-xl transition-colors duration-150 ${
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
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-xl text-primary text-xs font-bold transition-all">
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
                  title={t.label}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon size={14} />
                  <span className="hidden lg:inline">{t.label}</span>
                </button>
              );
            })}
        </div>

        <div className="h-5 w-px bg-border mx-1 shrink-0" />

        {/* Animated Search input container */}
        <div
          className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out ${
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
          title="Undo"
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
      </div>

      {/* Live Search Results Dropdown */}
      {searchOpen && searchQuery.trim().length > 0 && (
        <div className="pointer-events-auto mt-2 w-80 sm:w-96 max-h-96 overflow-y-auto rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-2xl p-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
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
