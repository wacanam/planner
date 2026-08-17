'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
import type { Encounter, Household } from '@/types/api';

export const addEncounterSchema = z.object({
  householdId: z.string().optional().nullable(),
  visitId: z.string().optional().nullable(),
  name: z.string().min(1, 'Person name is required'),
  response: z.enum(['receptive', 'neutral', 'not_interested', 'hostile', 'do_not_visit', 'moved']),
  gender: z.enum(['male', 'female', 'unknown']),
  ageGroup: z.enum(['youth', 'young_adult', 'adult', 'senior', 'unknown']),
  language: z.string(),
  notes: z.string().optional(),
  topicsDiscussed: z.string().optional(),
  literatureOffered: z.string().optional(),
});

export type AddEncounterFormValues = z.infer<typeof addEncounterSchema>;

interface AddEncounterFormProps {
  initialValues?: Partial<Encounter> & {
    language?: string;
    topicsDiscussed?: string;
    literatureOffered?: string;
  };
  households?: Household[];
  defaultHouseholdId?: string;
  onSubmit: (values: AddEncounterFormValues) => void | Promise<void>;
  loading?: boolean;
  onCancel?: () => void;
}

export function AddEncounterForm({
  initialValues,
  households = [],
  defaultHouseholdId,
  onSubmit,
  loading = false,
  onCancel,
}: AddEncounterFormProps) {
  const form = useForm<AddEncounterFormValues>({
    resolver: zodResolver(addEncounterSchema) as any,
    defaultValues: {
      householdId: initialValues?.householdId ?? defaultHouseholdId ?? 'none',
      visitId: initialValues?.visitId ?? null,
      name: initialValues?.name ?? '',
      response: (initialValues?.response as AddEncounterFormValues['response']) ?? 'receptive',
      gender: (initialValues?.gender as AddEncounterFormValues['gender']) ?? 'unknown',
      ageGroup: (initialValues?.ageGroup as AddEncounterFormValues['ageGroup']) ?? 'unknown',
      language: initialValues?.language ?? initialValues?.languageSpoken ?? 'English',
      notes: initialValues?.notes ?? '',
      topicsDiscussed: initialValues?.topicsDiscussed ?? initialValues?.topicDiscussed ?? '',
      literatureOffered:
        initialValues?.literatureOffered ?? initialValues?.literatureAccepted ?? '',
    },
  });

  const handleSubmit = (values: AddEncounterFormValues) => {
    const formattedValues = {
      ...values,
      householdId: values.householdId === 'none' || !values.householdId ? null : values.householdId,
    };
    return onSubmit(formattedValues);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      {households.length > 0 && !defaultHouseholdId && (
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Household (Optional)</Label>
          <Select
            value={form.watch('householdId') || 'none'}
            onValueChange={(val) => form.setValue('householdId', val === 'none' ? null : val)}
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Select household or street witnessing" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border max-h-48">
              <SelectItem value="none">🚶 Street / Public Witnessing / Informal</SelectItem>
              {households.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  🏠 {h.address} ({h.city})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="name" className="text-xs font-semibold">
          Person Met / Occupant Name *
        </Label>
        <Input
          id="name"
          placeholder="e.g. Maria Santos"
          className="h-9 rounded-xl text-xs"
          {...form.register('name')}
        />
        {form.formState.errors.name && (
          <p className="text-[10px] text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Response</Label>
          <Select
            value={form.watch('response')}
            onValueChange={(val) =>
              form.setValue('response', val as AddEncounterFormValues['response'])
            }
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Select response" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="receptive">Receptive / Interested</SelectItem>
              <SelectItem value="neutral">Neutral / Busy</SelectItem>
              <SelectItem value="not_interested">Not Interested</SelectItem>
              <SelectItem value="hostile">Hostile / Opposed</SelectItem>
              <SelectItem value="do_not_visit">Do Not Call / Visit</SelectItem>
              <SelectItem value="moved">Moved Out</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold">Language</Label>
          <Input
            placeholder="e.g. English, Spanish"
            className="h-9 rounded-xl text-xs"
            {...form.register('language')}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Gender</Label>
          <Select
            value={form.watch('gender')}
            onValueChange={(val) =>
              form.setValue('gender', val as AddEncounterFormValues['gender'])
            }
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="unknown">Unspecified</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="male">Male</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold">Age Group</Label>
          <Select
            value={form.watch('ageGroup')}
            onValueChange={(val) =>
              form.setValue('ageGroup', val as AddEncounterFormValues['ageGroup'])
            }
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Age group" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="unknown">Unspecified</SelectItem>
              <SelectItem value="youth">Youth</SelectItem>
              <SelectItem value="young_adult">Young Adult</SelectItem>
              <SelectItem value="adult">Adult</SelectItem>
              <SelectItem value="senior">Senior</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="topicsDiscussed" className="text-xs font-semibold">
          Topic Discussed / Scripture
        </Label>
        <Input
          id="topicsDiscussed"
          placeholder="e.g. Psalm 37:11, Paradise"
          className="h-9 rounded-xl text-xs"
          {...form.register('topicsDiscussed')}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="literatureOffered" className="text-xs font-semibold">
          Literature Left / Video Shown
        </Label>
        <Input
          id="literatureOffered"
          placeholder="e.g. Enjoy Life Forever brochure"
          className="h-9 rounded-xl text-xs"
          {...form.register('literatureOffered')}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes" className="text-xs font-semibold">
          Conversation Notes
        </Label>
        <Textarea
          id="notes"
          placeholder="Details of conversation, return visit questions…"
          className="rounded-xl text-xs resize-none h-16"
          {...form.register('notes')}
        />
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
          {loading ? 'Saving…' : initialValues?.id ? 'Update Encounter' : 'Record Encounter'}
        </Button>
      </div>
    </form>
  );
}
