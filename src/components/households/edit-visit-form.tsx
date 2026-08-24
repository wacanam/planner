'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
    'study_conducted',
    'minor_only',
    'foreign_language',
    'inaccessible',
    'vacant',
    'do_not_visit',
    'moved',
    'other',
  ]),
  bibleTopicDiscussed: z.string().optional(),
  literatureLeft: z.string().optional(),
  notes: z.string().optional(),
  returnVisitPlanned: z.boolean().optional(),
  nextVisitDate: z.string().optional(),
  nextVisitTime: z.string().optional(),
  nextVisitNotes: z.string().optional(),
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
      bibleTopicDiscussed: visit.bibleTopicDiscussed || '',
      literatureLeft: visit.literatureLeft || visit.literaturePlaced || '',
      notes: visit.notes || '',
      returnVisitPlanned: Boolean(visit.returnVisitPlanned),
      nextVisitDate: visit.nextVisitDate || '',
      nextVisitTime: visit.nextVisitTime || '',
      nextVisitNotes: visit.nextVisitNotes || '',
    },
  });

  const returnVisitPlanned = form.watch('returnVisitPlanned');

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
            <SelectItem value="not_home">Not Home</SelectItem>
            <SelectItem value="busy">Busy / Call Back Later</SelectItem>
            <SelectItem value="return_visit">Return Visit Made</SelectItem>
            <SelectItem value="study_conducted">Bible Study Conducted</SelectItem>
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
        <Label htmlFor="bibleTopicDiscussed" className="text-xs font-semibold">
          Topic / Scripture Discussed
        </Label>
        <Input
          id="bibleTopicDiscussed"
          placeholder="e.g. Matthew 24:14, Good News"
          className="h-9 rounded-xl text-xs"
          {...form.register('bibleTopicDiscussed')}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="literatureLeft" className="text-xs font-semibold">
          Literature Left / Placed
        </Label>
        <Input
          id="literatureLeft"
          placeholder="e.g. Watchtower, tract"
          className="h-9 rounded-xl text-xs"
          {...form.register('literatureLeft')}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes" className="text-xs font-semibold">
          Visit Notes
        </Label>
        <Textarea
          id="notes"
          placeholder="Summary of visit, householder questions…"
          className="rounded-xl text-xs resize-none h-20"
          {...form.register('notes')}
        />
      </div>

      <div className="space-y-3 pt-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Checkbox
            id="returnVisitPlanned"
            checked={returnVisitPlanned}
            onCheckedChange={(checked) => form.setValue('returnVisitPlanned', Boolean(checked))}
          />
          <Label htmlFor="returnVisitPlanned" className="text-xs font-semibold cursor-pointer">
            Schedule Return Visit
          </Label>
        </div>

        {returnVisitPlanned && (
          <div className="grid grid-cols-2 gap-2 pl-6">
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">Date</Label>
              <Input
                type="date"
                className="h-8 rounded-xl text-xs"
                {...form.register('nextVisitDate')}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">Time</Label>
              <Input
                type="time"
                className="h-8 rounded-xl text-xs"
                {...form.register('nextVisitTime')}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">
                Next Visit Topic / Note
              </Label>
              <Input
                placeholder="Question to answer on next visit"
                className="h-8 rounded-xl text-xs"
                {...form.register('nextVisitNotes')}
              />
            </div>
          </div>
        )}
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
