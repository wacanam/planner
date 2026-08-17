'use client';

import { Check, MapPin, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MapLandmark } from '@/types/api';

export interface LandmarkFormData {
  id?: string;
  label: string;
  type: 'tree' | 'landmark' | 'school' | 'church' | 'store' | 'gate' | 'hazard' | 'other';
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
  id: LandmarkFormData['type'];
  label: string;
  emoji: string;
  color: string;
}> = [
  { id: 'landmark', label: 'Monument / Hall', emoji: '🏛️', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'tree', label: 'Tree / Nature', emoji: '🌳', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'school', label: 'School / Daycare', emoji: '🏫', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'church', label: 'Church / Chapel', emoji: '⛪', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'store', label: 'Store / Bakery', emoji: '🏪', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'gate', label: 'Gate / Entrance', emoji: '🚪', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  { id: 'hazard', label: 'Caution / Dogs', emoji: '⚠️', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'other', label: 'General Pin', emoji: '📍', color: 'bg-orange-50 text-orange-700 border-orange-200' },
];

export function StudioLandmarkDialog({
  open,
  onOpenChange,
  coordinates,
  initialData,
  onSave,
  onDelete,
}: StudioLandmarkDialogProps) {
  const [label, setLabel] = useState(initialData?.label || '');
  const [selectedType, setSelectedType] = useState<LandmarkFormData['type']>(initialData?.type || 'landmark');

  useEffect(() => {
    if (initialData) {
      setLabel(initialData.label || '');
      setSelectedType(initialData.type || 'landmark');
    } else {
      setLabel('');
      setSelectedType('landmark');
    }
  }, [initialData, open]);

  const targetCoords = coordinates || (initialData ? { lat: initialData.lat, lng: initialData.lng } : null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCoords) return;

    onSave({
      id: initialData?.id,
      label: label.trim() || 'Landmark',
      type: selectedType,
      lat: targetCoords.lat,
      lng: targetCoords.lng,
    });

    onOpenChange(false);
  };

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
            placeholder="e.g. Barangay Hall, Purok 3 Court, Big Mango Tree"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="text-xs"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">Category & Icon</Label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedType === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedType(cat.id)}
                  className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium border transition-all text-left ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-card hover:bg-muted/50 border-border text-foreground'
                  }`}
                >
                  <span className="text-sm">{cat.emoji}</span>
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {targetCoords && (
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground flex items-center gap-2">
            <MapPin size={13} className="shrink-0 text-primary" />
            <span>
              Location: {targetCoords.lat.toFixed(5)}, {targetCoords.lng.toFixed(5)}
            </span>
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
