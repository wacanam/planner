'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { apiClient } from '@/lib/api-client';
import { requestTerritorySchema, type RequestTerritoryFormData } from '@/schemas';

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
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<RequestTerritoryFormData>({
    resolver: zodResolver(requestTerritorySchema),
    defaultValues: { message: '' },
  });

  async function handleFormSubmit(data: RequestTerritoryFormData) {
    setError(null);
    try {
      await apiClient.post(`/api/congregations/${congregationId}/territory-requests`, { territoryId: territoryId ?? null, message: data.message });
      setSuccess(true);
      onSuccess?.();
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        reset();
      }, 1500);
    } catch {
      setError('Failed to submit request. Please try again.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { reset(); setError(null); } }}>
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
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Notes (optional)</Label>
              <Textarea
                id="message"
                placeholder="Any notes for the overseer..."
                {...register('message')}
                rows={3}
                aria-invalid={!!errors.message}
                className={errors.message ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {errors.message && (
                <p className="text-xs text-destructive mt-1">{errors.message.message}</p>
              )}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
