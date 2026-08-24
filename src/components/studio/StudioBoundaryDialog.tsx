'use client';

import { User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MapBoundaryPolygon } from '@/types/api';

interface StudioBoundaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boundary: MapBoundaryPolygon | null;
  onSave: (id: string, name: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function StudioBoundaryDialog({
  open,
  onOpenChange,
  boundary,
  onSave,
  onDelete,
}: StudioBoundaryDialogProps) {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (boundary) {
      setName(boundary.name || '');
    } else {
      setName('');
    }
  }, [boundary]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boundary) return;

    setIsSaving(true);
    try {
      await onSave(boundary.id, name.trim());
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!boundary || !onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(boundary.id);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Territory Boundary Polygon"
      description="Manage the name or remove this independent boundary polygon section."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="boundary-name" className="text-xs font-semibold">
            Boundary Zone Name (Optional)
          </Label>
          <Input
            id="boundary-name"
            placeholder="e.g. Zone 1, North Block, Island Sector"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {boundary?.creatorName && (
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground flex items-center gap-2">
            <User size={13} className="shrink-0 text-muted-foreground/70" />
            <span>
              Contributor:{' '}
              <strong className="font-semibold text-foreground">{boundary.creatorName}</strong>
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          {onDelete && boundary ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
            >
              {isDeleting ? 'Deleting...' : 'Delete Boundary'}
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSaving || isDeleting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSaving || isDeleting}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
