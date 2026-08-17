'use client';

import { Check, ChevronLeft, MapPin, Plus, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrentUser } from '@/hooks';
import { isTerritoryServant } from '@/lib/permissions';
import { calculateTerritoryCoverage } from '@/lib/territory-coverage';
import type { Household, Territory } from '@/types/api';

export interface CardDimensionSettings {
  preset: '4x6' | '5x7' | '8.5x11' | 'a5' | 'a6' | 'custom';
  widthInches: number;
  heightInches: number;
  orientation: 'portrait' | 'landscape';
  side: 'front' | 'back' | 'both';
  showQrCode: boolean;
  showNotesArea: boolean;
  showStreetsList: boolean;
  showHouseholdsList: boolean;
}

interface StudioSidebarProps {
  open: boolean;
  onClose: () => void;
  territory: Territory | null;
  allTerritories?: Territory[];
  onSelectTerritory?: (territoryId: string) => void;
  households: Household[];
  selectedHouseholdId?: string | null;
  onSelectHousehold?: (household: Household) => void;
  cardSettings: CardDimensionSettings;
  onChangeCardSettings: (settings: CardDimensionSettings) => void;
  onPrintCard: () => void;
  onOpenAddHousehold: () => void;
}

export function StudioSidebar({
  open,
  onClose,
  territory,
  allTerritories = [],
  onSelectTerritory,
  households,
  selectedHouseholdId,
  onSelectHousehold,
  cardSettings,
  onChangeCardSettings,
  onPrintCard,
  onOpenAddHousehold,
}: StudioSidebarProps) {
  const { user } = useCurrentUser();
  const isServant = isTerritoryServant(user.role);
  const [tab, setTab] = useState<'info' | 'portion' | 'settings'>('info');

  const coverageStats = useMemo(() => calculateTerritoryCoverage(households), [households]);

  if (!open) return null;

  return (
    <aside className="absolute top-0 left-0 bottom-0 z-40 w-80 bg-card border-r border-border shadow-2xl flex flex-col pointer-events-auto transition-transform duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <MapPin size={16} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground truncate">
              {territory ? `Territory #${territory.number}` : 'Territory Studio'}
            </h2>
            <p className="text-[11px] text-muted-foreground truncate">
              {territory?.name || 'Workspace'}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-xl text-muted-foreground"
          onClick={onClose}
          title="Close sidebar"
        >
          <ChevronLeft size={16} />
        </Button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 p-2 bg-muted/40 border-b border-border text-xs font-semibold shrink-0">
        <button
          type="button"
          onClick={() => setTab('info')}
          className={`py-1.5 rounded-lg transition-all text-center ${
            tab === 'info'
              ? 'bg-card text-primary shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Details
        </button>
        <button
          type="button"
          onClick={() => setTab('portion')}
          className={`py-1.5 rounded-lg transition-all text-center ${
            tab === 'portion'
              ? 'bg-card text-primary shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {isServant ? 'Territories' : 'Portions'}
        </button>
        <button
          type="button"
          onClick={() => setTab('settings')}
          className={`py-1.5 rounded-lg transition-all text-center ${
            tab === 'settings'
              ? 'bg-card text-primary shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Print Card
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 flex flex-col p-4 text-xs overflow-hidden">
        {tab === 'info' && (
          <div className="flex-1 min-h-0 flex flex-col space-y-3">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <div className="p-3 rounded-xl border border-border bg-background">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Doors</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{coverageStats.totalDoors}</p>
                <p className="text-[10px] text-muted-foreground">pinned & offline</p>
              </div>
              <div className="p-3 rounded-xl border border-border bg-background">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Live Coverage</p>
                <p className="text-xl font-bold text-primary mt-0.5">
                  {coverageStats.coveragePercent}%
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {coverageStats.workedDoors} of {coverageStats.totalDoors} worked
                </p>
              </div>
            </div>

            {/* Quick Add Household Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-9 rounded-xl gap-2 font-semibold shrink-0 hover:border-primary/50 hover:bg-primary/5"
              onClick={onOpenAddHousehold}
            >
              <Plus size={14} className="text-primary" />
              <span>Add Household</span>
            </Button>

            {/* Territory Households List: Flex-1 and min-h-0 to occupy full vertical height to bottom */}
            <div className="flex-1 min-h-0 flex flex-col pt-2 border-t border-border space-y-2">
              <div className="flex items-center justify-between shrink-0">
                <p className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                  Territory Households ({households.length})
                </p>
              </div>
              {households.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-4 text-center">
                  <p className="text-muted-foreground">
                    No households pinned in this territory yet.
                  </p>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
                  {households.map((h) => {
                    const isSelected = selectedHouseholdId === h.id;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => onSelectHousehold?.(h)}
                        className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40'
                            : 'border-border bg-background hover:border-primary/40 hover:bg-muted/40'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className={`font-semibold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {h.address || `${h.houseNumber || ''} ${h.streetName || 'Household'}`.trim()}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {h.streetName ? `${h.streetName}, ` : ''}{h.city || 'Territory'}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase font-semibold shrink-0"
                        >
                          {h.status || 'Active'}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'portion' && (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
            {isServant ? (
              <>
                <p className="font-bold text-muted-foreground uppercase text-[10px]">
                  Switch Active Territory
                </p>
                <div className="space-y-1.5">
                  {allTerritories.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelectTerritory?.(t.id)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                        t.id === territory?.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background hover:bg-muted/50 text-foreground'
                      }`}
                    >
                      <div>
                        <p>
                          #{t.number} — {t.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-normal">{t.city}</p>
                      </div>
                      {t.id === territory?.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="font-bold text-muted-foreground uppercase text-[10px]">
                  Portion Cards
                </p>
                <div className="p-3 rounded-xl border border-border bg-background space-y-2">
                  <p className="font-semibold text-foreground">Create Working Portion</p>
                  <p className="text-[11px] text-muted-foreground">
                    Subdivide your assigned territory into manageable sections for morning car
                    groups.
                  </p>
                  <Button size="sm" className="w-full rounded-xl text-xs font-semibold gap-1.5">
                    <Plus size={13} />
                    <span>Create Portion Card</span>
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div className="space-y-4">
            <p className="font-bold text-muted-foreground uppercase text-[10px]">
              Print-Ready Territory Card
            </p>

            <div className="space-y-2">
              <Label className="text-xs">Preset Dimensions</Label>
              <Select
                value={cardSettings.preset}
                onValueChange={(val: any) => {
                  if (val === 'custom') {
                    onChangeCardSettings({
                      ...cardSettings,
                      preset: 'custom',
                    });
                    return;
                  }
                  let w = 4;
                  let h = 6;
                  if (val === '5x7') {
                    w = 5;
                    h = 7;
                  } else if (val === '8.5x11') {
                    w = 8.5;
                    h = 11;
                  } else if (val === 'a5') {
                    w = 5.83;
                    h = 8.27;
                  }
                  onChangeCardSettings({
                    ...cardSettings,
                    preset: val,
                    widthInches: w,
                    heightInches: h,
                  });
                }}
              >
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue placeholder="Dimensions" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="4x6">4″ × 6″ (Pocket Territory Card)</SelectItem>
                  <SelectItem value="5x7">5″ × 7″ (Standard 5x7 Card)</SelectItem>
                  <SelectItem value="8.5x11">8.5″ × 11″ (Full Letter Sheet)</SelectItem>
                  <SelectItem value="a5">A5 Sheet (5.8″ × 8.3″)</SelectItem>
                  <SelectItem value="custom">Custom Dimensions…</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {cardSettings.preset === 'custom' && (
              <div className="space-y-1.5 p-2.5 rounded-xl bg-muted/40 border border-border">
                <Label className="text-[11px] font-semibold">Custom Size (Inches)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Width (in)</span>
                    <input
                      type="number"
                      step="0.25"
                      min="1.5"
                      max="30"
                      value={cardSettings.widthInches}
                      onChange={(e) =>
                        onChangeCardSettings({
                          ...cardSettings,
                          preset: 'custom',
                          widthInches: Math.max(1.5, Math.min(30, parseFloat(e.target.value) || 4)),
                        })
                      }
                      className="h-8 w-full px-2 text-xs font-bold bg-background border border-input rounded-lg outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Height (in)</span>
                    <input
                      type="number"
                      step="0.25"
                      min="1.5"
                      max="30"
                      value={cardSettings.heightInches}
                      onChange={(e) =>
                        onChangeCardSettings({
                          ...cardSettings,
                          preset: 'custom',
                          heightInches: Math.max(1.5, Math.min(30, parseFloat(e.target.value) || 6)),
                        })
                      }
                      className="h-8 w-full px-2 text-xs font-bold bg-background border border-input rounded-lg outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Orientation</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onChangeCardSettings({ ...cardSettings, orientation: 'portrait' })
                  }
                  className={`py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    cardSettings.orientation === 'portrait'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Portrait
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChangeCardSettings({ ...cardSettings, orientation: 'landscape' })
                  }
                  className={`py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    cardSettings.orientation === 'landscape'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Landscape
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs">Included Elements</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px]">Publisher Working Record Grid</span>
                  <input
                    type="checkbox"
                    checked={cardSettings.showNotesArea}
                    onChange={(e) =>
                      onChangeCardSettings({ ...cardSettings, showNotesArea: e.target.checked })
                    }
                    className="h-4 w-4 rounded accent-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px]">Streets & Doors Directory</span>
                  <input
                    type="checkbox"
                    checked={cardSettings.showStreetsList}
                    onChange={(e) =>
                      onChangeCardSettings({ ...cardSettings, showStreetsList: e.target.checked })
                    }
                    className="h-4 w-4 rounded accent-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px]">QR Code Link</span>
                  <input
                    type="checkbox"
                    checked={cardSettings.showQrCode}
                    onChange={(e) =>
                      onChangeCardSettings({ ...cardSettings, showQrCode: e.target.checked })
                    }
                    className="h-4 w-4 rounded accent-primary"
                  />
                </div>
              </div>
            </div>

            <Button
              type="button"
              className="w-full h-10 rounded-xl gap-2 font-semibold shadow-md mt-2 bg-primary text-primary-foreground"
              onClick={onPrintCard}
            >
              <Printer size={15} />
              <span>Open Print Viewport & Fit</span>
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
