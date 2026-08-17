'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
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
import { useCongregationMembers, useCreateShare } from '@/hooks';
import type { Household } from '@/types/api';

interface ShareHouseholdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  household: Household | null;
}

export function ShareHouseholdDialog({ open, onOpenChange, household }: ShareHouseholdDialogProps) {
  const params = useParams();
  const congregationId = (params?.id as string) || '';
  const { data: members = [] } = useCongregationMembers(congregationId);
  const { create: createShare, isPending: submitting } = useCreateShare(
    household?.id ?? '',
    household?.address
  );

  const [targetUserId, setTargetUserId] = useState('');
  const [shareType, setShareType] = useState<'view' | 'collaborate' | 'transfer'>('collaborate');
  const [notes, setNotes] = useState('');

  const activeMembers = members.filter((m) => m.status === 'active');

  const handleShare = async () => {
    if (!household || !targetUserId) return;
    const selectedMember = activeMembers.find((m) => m.userId === targetUserId);
    const recipientName =
      selectedMember?.user?.name || selectedMember?.user?.email || 'Publisher';
    try {
      await createShare({
        toUserId: targetUserId,
        toUserName: recipientName,
        type: shareType,
        notes: notes || undefined,
      });
      onOpenChange(false);
      setTargetUserId('');
      setNotes('');
    } catch (e) {
      console.error('Failed to share household', e);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Share or Transfer Record"
      description={
        household ? `Share access to ${household.address}` : 'Collaborate with fellow publishers'
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Select Publisher *</Label>
          <Select value={targetUserId} onValueChange={setTargetUserId}>
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Choose a member…" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border max-h-48">
              {activeMembers.map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  {m.user?.name || m.user?.email || m.userId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold">Permission / Action</Label>
          <Select
            value={shareType}
            onValueChange={(val) => setShareType(val as 'view' | 'collaborate' | 'transfer')}
          >
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Action type" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="collaborate">Collaborate (Partner can log visits)</SelectItem>
              <SelectItem value="view">View Only (Read notes & history)</SelectItem>
              <SelectItem value="transfer">Full Transfer (Transfer ownership)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="shareNotes" className="text-xs font-semibold">
            Message / Context
          </Label>
          <Textarea
            id="shareNotes"
            placeholder="e.g. Needs Japanese speaker return visit, please follow up"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-xl text-xs resize-none h-20"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl text-xs"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl text-xs font-semibold"
            onClick={handleShare}
            disabled={!targetUserId || submitting}
          >
            {submitting ? 'Sharing…' : 'Send Record Invitation'}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
