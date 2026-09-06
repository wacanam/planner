'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useKeyboardShortcuts } from '@/hooks';
import type { Visit } from '@/types/api';

export const editVisitSchema = z.object({
  outcome: z.enum([
    'answered',
    'not_home',
    'busy',
    'return_visit',
    'return_visit_completed',
    'return_visit_missed',
    'study_conducted',
    'study_offered',
    'study_missed',
    'literature_placed',
    'minor_only',
    'foreign_language',
    'inaccessible',
    'vacant',
    'do_not_visit',
    'moved',
    'other',
  ]),
  notes: z.string().optional(),
});

export type EditVisitFormValues = z.infer<typeof editVisitSchema>;

interface EditVisitFormProps {
  visit: Visit;
  onSubmit: (values: EditVisitFormValues) => void | Promise<void>;
  loading?: boolean;
  onCancel?: () => void;
}

export function EditVisitForm({ visit, onSubmit, loading = false, onCancel }: EditVisitFormProps) {
  const form = useForm<EditVisitFormValues>({
    resolver: zodResolver(editVisitSchema) as any,
    defaultValues: {
      outcome: (visit.outcome as EditVisitFormValues['outcome']) || 'answered',
      notes: visit.notes || '',
    },
  });

  useKeyboardShortcuts([
    {
      key: 'Mod+Enter',
      handler: () => {
        void form.handleSubmit(onSubmit)();
      },
    },
  ]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label className="text-xs font-semibold">Visit Outcome *</Label>
        <Select
          value={form.watch('outcome')}
          onValueChange={(val) => form.setValue('outcome', val as EditVisitFormValues['outcome'])}
        >
          <SelectTrigger className="h-9 rounded-xl text-xs">
            <SelectValue placeholder="Select outcome" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="answered">Answered (Conversation)</SelectItem>
            <SelectItem value="return_visit">Return Visit (Visited / Completed)</SelectItem>
            <SelectItem value="return_visit_missed">
              Return Visit Missed (Resident Absent / Reschedule)
            </SelectItem>
            <SelectItem value="study_conducted">Bible Study Conducted</SelectItem>
            <SelectItem value="study_offered">Bible Study Offered</SelectItem>
            <SelectItem value="study_missed">Bible Study Missed / Cancelled</SelectItem>
            <SelectItem value="not_home">Not Home</SelectItem>
            <SelectItem value="busy">Busy / Call Back Later</SelectItem>
            <SelectItem value="minor_only">Minor / Youth Only</SelectItem>
            <SelectItem value="foreign_language">Foreign / Different Language</SelectItem>
            <SelectItem value="inaccessible">Inaccessible / Gated</SelectItem>
            <SelectItem value="vacant">Vacant / Unoccupied</SelectItem>
            <SelectItem value="do_not_visit">Do Not Call / Visit</SelectItem>
            <SelectItem value="moved">Moved Away</SelectItem>
            <SelectItem value="other">Other Outcome</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes" className="text-xs font-semibold">
          Property / Access Notes (Optional)
        </Label>
        <Textarea
          id="notes"
          placeholder="e.g. Gate code, loose dog on premises (strictly no resident names or spiritual details)"
          className="rounded-xl text-xs resize-none h-20"
          {...form.register('notes')}
        />
      </div>

      {/* Private Personal Notebook Callout */}
      <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
        <div className="font-semibold text-foreground flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5 text-primary" />
          Personal Return Visits & Studies
        </div>
        <p>
          Scriptures discussed, literature placements, and return visit notes should be kept in your private on-device Personal Notebook.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="rounded-xl text-xs"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" className="rounded-xl text-xs font-semibold" disabled={loading}>
          {loading ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
