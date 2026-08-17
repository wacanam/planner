'use client';

import { Check, ChevronLeft, MapPin, Printer, QrCode, RotateCw, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { calculateTerritoryCoverage } from '@/lib/territory-coverage';
import type { Congregation, Household, Territory } from '@/types/api';
import type { CardDimensionSettings } from './StudioSidebar';

export interface StudioPrintModalProps {
  open: boolean;
  onClose: () => void;
  onBackToViewport: () => void;
  territory: Territory | null;
  congregation: Congregation | null;
  households: Household[];
  cardSettings: CardDimensionSettings;
  onChangeCardSettings: (settings: CardDimensionSettings) => void;
}

export function StudioPrintModal({
  open,
  onClose,
  onBackToViewport,
  territory,
  congregation,
  households,
  cardSettings,
  onChangeCardSettings,
}: StudioPrintModalProps) {
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');

  const coverageStats = useMemo(() => calculateTerritoryCoverage(households), [households]);

  // Group households by street name for street directory on back
  const streetsSummary = useMemo(() => {
    const map = new Map<string, Household[]>();
    for (const h of households) {
      const street = h.streetName || h.address.split(',')[0]?.replace(/^\d+\s*/, '') || 'Unspecified Street';
      if (!map.has(street)) {
        map.set(street, []);
      }
      map.get(street)!.push(h);
    }
    return Array.from(map.entries()).map(([street, list]) => ({
      street,
      count: list.length,
      houseNumbers: list
        .map((item) => item.houseNumber || item.address.match(/^\d+/)?.[0])
        .filter(Boolean)
        .slice(0, 8)
        .join(', '),
    }));
  }, [households]);

  const handlePrint = () => {
    window.print();
  };

  const { widthInches, heightInches, orientation, side } = cardSettings;
  const isLandscape = orientation === 'landscape';
  const effectiveW = isLandscape ? Math.max(widthInches, heightInches) : Math.min(widthInches, heightInches);
  const effectiveH = isLandscape ? Math.min(widthInches, heightInches) : Math.max(widthInches, heightInches);

  // Aspect ratio for screen preview container
  const ratio = effectiveW / effectiveH;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title={`Print Territory Card — #${territory?.number ?? ''}`}
      description="Review the formatted physical card layout before opening the print dialog."
      className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0"
    >
      <div className="flex-1 min-h-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border overflow-hidden">
        {/* Left Side: Settings & Options */}
        <div className="w-full md:w-80 p-5 space-y-5 bg-muted/20 shrink-0 overflow-y-auto">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Print Configuration
            </h3>
            <p className="text-xs text-foreground font-semibold mt-1">
              {effectiveW}″ × {effectiveH}″ ({orientation})
            </p>
          </div>

          {/* Side Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Print Output</Label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/60 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  onChangeCardSettings({ ...cardSettings, side: 'front' });
                  setActiveSide('front');
                }}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  cardSettings.side === 'front'
                    ? 'bg-card text-primary shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Front Only
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeCardSettings({ ...cardSettings, side: 'back' });
                  setActiveSide('back');
                }}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  cardSettings.side === 'back'
                    ? 'bg-card text-primary shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Back Only
              </button>
              <button
                type="button"
                onClick={() => onChangeCardSettings({ ...cardSettings, side: 'both' })}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  cardSettings.side === 'both'
                    ? 'bg-card text-primary shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Both Sides
              </button>
            </div>
          </div>

          {/* Included Features */}
          <div className="space-y-2.5 pt-2 border-t border-border">
            <Label className="text-xs font-semibold">Included Elements</Label>
            <div className="space-y-2 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-muted-foreground">Publisher Working Record Table</span>
                <input
                  type="checkbox"
                  checked={cardSettings.showNotesArea}
                  onChange={(e) =>
                    onChangeCardSettings({ ...cardSettings, showNotesArea: e.target.checked })
                  }
                  className="h-4 w-4 rounded accent-primary"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-muted-foreground">Streets & Doors Directory</span>
                <input
                  type="checkbox"
                  checked={cardSettings.showStreetsList}
                  onChange={(e) =>
                    onChangeCardSettings({ ...cardSettings, showStreetsList: e.target.checked })
                  }
                  className="h-4 w-4 rounded accent-primary"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-muted-foreground">Digital Assignment QR Code</span>
                <input
                  type="checkbox"
                  checked={cardSettings.showQrCode}
                  onChange={(e) =>
                    onChangeCardSettings({ ...cardSettings, showQrCode: e.target.checked })
                  }
                  className="h-4 w-4 rounded accent-primary"
                />
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t border-border">
            <Button
              type="button"
              onClick={handlePrint}
              className="w-full h-11 rounded-2xl gap-2 font-bold shadow-lg bg-primary text-primary-foreground"
            >
              <Printer size={16} />
              <span>Open Print Dialog</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onBackToViewport}
              className="w-full h-9 rounded-xl text-xs gap-1.5 font-semibold"
            >
              <ChevronLeft size={14} />
              <span>Adjust Viewport Framing</span>
            </Button>
          </div>
        </div>

        {/* Right Side: Interactive Live Card Preview */}
        <div className="flex-1 min-h-0 p-6 flex flex-col items-center justify-center bg-muted/40 overflow-y-auto">
          {/* Side Toggle for Preview */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              type="button"
              size="sm"
              variant={activeSide === 'front' ? 'default' : 'outline'}
              onClick={() => setActiveSide('front')}
              className="rounded-xl text-xs font-semibold h-8"
            >
              Preview Front (Map View)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeSide === 'back' ? 'default' : 'outline'}
              onClick={() => setActiveSide('back')}
              className="rounded-xl text-xs font-semibold h-8"
            >
              Preview Back (Directory & S-13)
            </Button>
          </div>

          {/* Physical Card Simulation Box */}
          <div
            className="w-full max-w-[480px] bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col transition-all"
            style={{
              aspectRatio: `${effectiveW} / ${effectiveH}`,
              maxHeight: '520px',
            }}
          >
            {activeSide === 'front' ? (
              /* FRONT SIDE */
              <div className="h-full flex flex-col p-4 bg-white text-slate-900 select-none">
                {/* Header */}
                <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2 mb-2 shrink-0">
                  <div>
                    <span className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase">
                      {congregation?.name || 'CONGREGATION TERRITORY'}
                    </span>
                    <h2 className="text-base font-black tracking-tight text-slate-950 leading-tight">
                      TERRITORY #{territory?.number || ''}
                    </h2>
                    <p className="text-[11px] font-semibold text-slate-700">
                      {territory?.name || 'Downtown Territory'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline" className="text-[10px] font-bold border-slate-400 text-slate-800 uppercase">
                      {territory?.city || congregation?.city || 'Local Area'}
                    </Badge>
                    <p className="text-[10px] font-bold text-slate-600 mt-1">
                      {coverageStats.totalDoors} Doors ({coverageStats.coveragePercent}% worked)
                    </p>
                  </div>
                </div>

                {/* Map Framing Window Simulation */}
                <div className="flex-1 min-h-0 bg-slate-100 rounded-lg border border-slate-300 relative flex items-center justify-center overflow-hidden">
                  <div className="text-center p-4">
                    <MapPin size={24} className="mx-auto text-blue-600 mb-1" />
                    <p className="text-xs font-bold text-slate-800">
                      Framed Map Viewport
                    </p>
                    <p className="text-[10px] text-slate-500 max-w-[200px] mt-0.5">
                      Your chosen territory camera framing and zoom level will print in full resolution here.
                    </p>
                  </div>

                  {/* Corner Guides */}
                  <div className="absolute top-2 left-2 text-[9px] font-bold text-slate-600 bg-white/90 px-1.5 py-0.5 rounded shadow-xs">
                    {effectiveW}″ × {effectiveH}″ Card
                  </div>
                </div>

                {/* Front Footer */}
                <div className="pt-2 border-t border-slate-200 mt-2 flex items-center justify-between text-[9px] text-slate-500 shrink-0 font-medium">
                  <span>Please do not mark directly on this card.</span>
                  <span>Return promptly when territory is covered.</span>
                </div>
              </div>
            ) : (
              /* BACK SIDE */
              <div className="h-full flex flex-col p-4 bg-white text-slate-900 select-none overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between border-b-2 border-slate-800 pb-1.5 mb-2 shrink-0">
                  <div>
                    <h2 className="text-sm font-black text-slate-950 uppercase">
                      Territory #{territory?.number} Directory & Activity Record
                    </h2>
                    <p className="text-[10px] font-semibold text-slate-600">
                      {territory?.name}
                    </p>
                  </div>
                  {cardSettings.showQrCode && (
                    <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 p-1 rounded-md border border-slate-200">
                      <QrCode size={20} className="text-slate-800" />
                      <span className="text-[8px] font-bold text-slate-600">Mobile Link</span>
                    </div>
                  )}
                </div>

                {/* Streets Summary */}
                {cardSettings.showStreetsList && streetsSummary.length > 0 && (
                  <div className="mb-2 shrink-0">
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                      Streets & Doors
                    </p>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      {streetsSummary.slice(0, 6).map((s) => (
                        <div key={s.street} className="p-1 rounded bg-slate-50 border border-slate-200 flex justify-between">
                          <span className="font-bold text-slate-800 truncate">{s.street}</span>
                          <span className="text-slate-500 font-semibold shrink-0 ml-1">{s.count} doors</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Publisher Record Table (S-13 Format) */}
                {cardSettings.showNotesArea && (
                  <div className="flex-1 min-h-0 flex flex-col">
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                      Publisher Working Record (S-13)
                    </p>
                    <div className="flex-1 border border-slate-300 rounded-md overflow-hidden text-[9px]">
                      <div className="grid grid-cols-12 bg-slate-100 font-bold text-slate-700 py-1 px-1.5 border-b border-slate-300">
                        <span className="col-span-3">Date</span>
                        <span className="col-span-4">Publisher</span>
                        <span className="col-span-5">Remarks</span>
                      </div>
                      <div className="divide-y divide-slate-200">
                        {[1, 2, 3, 4, 5, 6].map((row) => (
                          <div key={row} className="grid grid-cols-12 py-1 px-1.5 text-slate-400">
                            <span className="col-span-3">___/___</span>
                            <span className="col-span-4">________________</span>
                            <span className="col-span-5">________________</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Territory Notes if any */}
                {territory?.notes && (
                  <div className="mt-2 p-1.5 bg-amber-50 rounded border border-amber-200 text-[9px] text-amber-900 shrink-0">
                    <span className="font-bold">Territory Notes: </span>
                    <span>{territory.notes}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
