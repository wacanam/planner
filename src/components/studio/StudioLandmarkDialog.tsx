'use client';

import { Check, MapPin, Trash2, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useKeyboardShortcuts } from '@/hooks';
import type { LandmarkType, MapLandmark } from '@/types/api';

export interface LandmarkFormData {
  id?: string;
  label: string;
  type: LandmarkType;
  lat: number;
  lng: number;
}

interface StudioLandmarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coordinates: { lat: number; lng: number } | null;
  initialData?: MapLandmark | null;
  onSave: (data: LandmarkFormData) => void;
  onDelete?: (id: string) => void;
}

const CATEGORIES: Array<{
  id: LandmarkType;
  label: string;
  emoji: string;
  color: string;
}> = [
  {
    id: 'landmark',
    label: 'Monument / Hall',
    emoji: '🏛️',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    id: 'government',
    label: 'Barangay / Gov',
    emoji: '🏢',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  {
    id: 'school',
    label: 'School / Daycare',
    emoji: '🏫',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'church',
    label: 'Church / Chapel',
    emoji: '⛪',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    id: 'hospital',
    label: 'Hospital / Clinic',
    emoji: '🏥',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    id: 'store',
    label: 'Store / Bakery',
    emoji: '🏪',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    id: 'restaurant',
    label: 'Restaurant / Eatery',
    emoji: '🍽️',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  {
    id: 'tree',
    label: 'Tree / Nature',
    emoji: '🌳',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'park',
    label: 'Court / Park',
    emoji: '🏀',
    color: 'bg-green-50 text-green-700 border-green-200',
  },
  {
    id: 'water',
    label: 'Water Tower / Well',
    emoji: '💧',
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  {
    id: 'bridge',
    label: 'Bridge / Crossing',
    emoji: '🌉',
    color: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  {
    id: 'gas_station',
    label: 'Gas Station / Fuel',
    emoji: '⛽',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  {
    id: 'transit',
    label: 'Terminal / Bus Stop',
    emoji: '🚌',
    color: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  {
    id: 'building',
    label: 'Condo / Building',
    emoji: '🏢',
    color: 'bg-slate-50 text-slate-700 border-slate-200',
  },
  {
    id: 'gate',
    label: 'Gate / Entrance',
    emoji: '🚪',
    color: 'bg-slate-50 text-slate-700 border-slate-200',
  },
  {
    id: 'tower',
    label: 'Tower / Antenna',
    emoji: '🗼',
    color: 'bg-stone-50 text-stone-700 border-stone-200',
  },
  {
    id: 'hazard',
    label: 'Caution / Dogs',
    emoji: '⚠️',
    color: 'bg-red-50 text-red-700 border-red-200',
  },
  {
    id: 'other',
    label: 'General Pin',
    emoji: '📍',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
  },
];

const DEFAULT_LANDMARK_NAMES: Record<LandmarkType, string> = {
  landmark: 'Monument',
  government: 'Barangay Hall',
  school: 'School',
  church: 'Chapel',
  hospital: 'Clinic',
  store: 'Store',
  restaurant: 'Eatery',
  tree: 'Tree',
  park: 'Court',
  water: 'Water Tower',
  bridge: 'Bridge',
  gas_station: 'Gas Station',
  transit: 'Bus Stop',
  building: 'Building',
  gate: 'Subdivision Gate',
  tower: 'Cell Tower',
  hazard: 'Caution: Dogs',
  other: 'Landmark',
};

export function StudioLandmarkDialog({
  open,
  onOpenChange,
  coordinates,
  initialData,
  onSave,
  onDelete,
}: StudioLandmarkDialogProps) {
  const [label, setLabel] = useState(
    initialData?.label || DEFAULT_LANDMARK_NAMES[initialData?.type || 'landmark']
  );
  const [selectedType, setSelectedType] = useState<LandmarkType>(initialData?.type || 'landmark');

  useEffect(() => {
    if (initialData) {
      setLabel(initialData.label || DEFAULT_LANDMARK_NAMES[initialData.type || 'landmark']);
      setSelectedType(initialData.type || 'landmark');
    } else {
      setLabel(DEFAULT_LANDMARK_NAMES.landmark);
      setSelectedType('landmark');
    }
  }, [initialData, open]);

  const handleSelectType = (type: LandmarkType) => {
    setSelectedType(type);
    if (!label || Object.values(DEFAULT_LANDMARK_NAMES).includes(label)) {
      setLabel(DEFAULT_LANDMARK_NAMES[type]);
    }
  };

  const targetCoords =
    coordinates || (initialData ? { lat: initialData.lat, lng: initialData.lng } : null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetCoords) return;

    onSave({
      id: initialData?.id,
      label: label.trim() || DEFAULT_LANDMARK_NAMES[selectedType],
      type: selectedType,
      lat: targetCoords.lat,
      lng: targetCoords.lng,
    });

    onOpenChange(false);
  };

  useKeyboardShortcuts(
    [
      {
        key: 'Mod+Enter',
        handler: () => handleSubmit(),
        enableInInputs: true,
      },
    ],
    { disabled: !open }
  );

  const handleDelete = () => {
    if (initialData?.id && onDelete) {
      onDelete(initialData.id);
      onOpenChange(false);
    }
  };

  const isEdit = Boolean(initialData);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Landmark / Point of Interest' : 'Add Landmark / Point of Interest'}
      description={
        isEdit
          ? 'Update the name or category of this landmark, or delete it from the territory.'
          : 'Place a recognizable POI, landmark, school, or tree to orient publishers in this territory.'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <Label htmlFor="landmark-label" className="text-xs font-semibold text-foreground">
            Landmark Name / Description
          </Label>
          <Input
            id="landmark-label"
            placeholder={`e.g. ${DEFAULT_LANDMARK_NAMES[selectedType]}, Purok 3 Court, Big Mango Tree`}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="text-xs"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">Category & Icon</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-60 overflow-y-auto p-0.5">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedType === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectType(cat.id)}
                  className={`flex items-center gap-1.5 p-2 rounded-xl text-xs font-medium border transition-all text-left ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-card hover:bg-muted/50 border-border text-foreground'
                  }`}
                >
                  <span className="text-sm shrink-0">{cat.emoji}</span>
                  <span className="truncate text-[11px]">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {targetCoords && (
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="shrink-0 text-primary" />
              <span>
                {targetCoords.lat.toFixed(5)}, {targetCoords.lng.toFixed(5)}
              </span>
            </div>
            {initialData?.creatorName && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User size={12} className="shrink-0 text-muted-foreground/70" />
                <span>
                  Contributor:{' '}
                  <strong className="font-semibold text-foreground">
                    {initialData.creatorName}
                  </strong>
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
          {isEdit && onDelete ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="text-xs rounded-xl gap-1"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="text-xs rounded-xl gap-1.5 font-semibold">
              <Check size={14} />
              <span>{isEdit ? 'Update Landmark' : 'Save Landmark'}</span>
            </Button>
          </div>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
