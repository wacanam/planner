'use client';

import { useState } from 'react';
import { ClipboardList, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { fetchWithAuth } from '@/lib/api-client';

interface TerritoryRequestDialogProps {
  congregationId: string;
  territoryId?: string;
  territoryName?: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function TerritoryRequestDialog({
  congregationId,
  territoryId,
  territoryName,
  onSuccess,
  trigger,
}: TerritoryRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/api/congregations/${congregationId}/territory-requests`, {
        method: 'POST',
        body: JSON.stringify({ territoryId: territoryId ?? null, message: notes }),
      });
      setSuccess(true);
      onSuccess?.();
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setNotes('');
      }, 1500);
    } catch {
      setError('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <ClipboardList size={14} />
            Request Territory
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Request Territory</DialogTitle>
          <DialogDescription>
            {territoryName
              ? `Submit a request for territory: ${territoryName}`
              : 'Submit a request for any available territory.'}
          </DialogDescription>
        </DialogHeader>
        {success ? (
          <div className="py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
              <ClipboardList size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-medium text-foreground">Request submitted!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your request is pending overseer approval.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any notes for the overseer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 size={14} className="animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
