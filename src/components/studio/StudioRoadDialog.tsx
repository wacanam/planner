'use client';

import { Check, Milestone, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MapRoad } from '@/types/api';

export type RoadType = 'street' | 'avenue' | 'dirt' | 'walkway';

export interface RoadFormData {
  id?: string;
  name: string;
  type: RoadType;
}

interface StudioRoadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pointCount?: number;
  initialData?: MapRoad | null;
  onSave: (data: RoadFormData) => void;
  onDelete?: (id: string) => void;
}

const ROAD_TYPES: Array<{
  id: RoadType;
  label: string;
  emoji: string;
  description: string;
  previewClass: string;
}> = [
  {
    id: 'street',
    label: 'Paved Street',
    emoji: '🛣️',
    description: 'Standard white asphalt with slate curbs',
    previewClass: 'bg-slate-700 border-slate-900 text-white',
  },
  {
    id: 'avenue',
    label: 'Main Road / Avenue',
    emoji: '🟡',
    description: 'Prominent yellow highway with amber curbs',
    previewClass: 'bg-amber-500 border-amber-700 text-white',
  },
  {
    id: 'dirt',
    label: 'Dirt Road / Rural Path',
    emoji: '🚜',
    description: 'Unpaved dirt trail / earth road',
    previewClass: 'bg-amber-800 border-amber-950 text-white',
  },
  {
    id: 'walkway',
    label: 'Walkway / Footpath',
    emoji: '🚶',
    description: 'Narrow pedestrian access alley or stairs',
    previewClass: 'bg-teal-700 border-teal-900 text-white',
  },
];

export function StudioRoadDialog({
  open,
  onOpenChange,
  pointCount = 0,
  initialData,
  onSave,
  onDelete,
}: StudioRoadDialogProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [selectedType, setSelectedType] = useState<RoadType>(
    (initialData?.color as RoadType) || 'street'
  );

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setSelectedType((initialData.color as RoadType) || 'street');
    } else {
      setName('');
      setSelectedType('street');
    }
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialData?.id,
      name: name.trim() || 'Street',
      type: selectedType,
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
      title={isEdit ? 'Edit Road / Street Route' : 'Save Road / Street Route'}
      description={
        isEdit
          ? 'Update the street name or style, or delete this road route from the territory.'
          : `Save this ${pointCount > 0 ? `${pointCount}-point ` : ''}street alignment to orient publishers in the territory.`
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <Label htmlFor="road-name" className="text-xs font-semibold text-foreground">
            Street / Road Name
          </Label>
          <Input
            id="road-name"
            placeholder="e.g. Zone 1 Main Street, Purok 2 Access Road, Mango Lane"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-xs"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">Road Style</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ROAD_TYPES.map((rt) => {
              const isSelected = selectedType === rt.id;
              return (
                <button
                  key={rt.id}
                  type="button"
                  onClick={() => setSelectedType(rt.id)}
                  className={`flex flex-col p-2.5 rounded-xl text-xs font-medium border transition-all text-left space-y-1 ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-card hover:bg-muted/50 border-border text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{rt.emoji}</span>
                    <span className="font-bold">{rt.label}</span>
                  </div>
                  <p
                    className={`text-[10px] leading-tight ${
                      isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    }`}
                  >
                    {rt.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

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
              <span>{isEdit ? 'Update Road' : 'Save Road'}</span>
            </Button>
          </div>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
