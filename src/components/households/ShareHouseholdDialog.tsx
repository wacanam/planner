'use client';

import { UserCheck, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Badge } from '@/components/ui/badge';
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
import { useCongregationMembers, useCreateShare, useKeyboardShortcuts, useShares } from '@/hooks';
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
  const {
    outgoingShares = [],
    revokeShareAccess,
    updateSharePermission,
    cancelOutgoingShare,
  } = useShares();
  const { create: createShare, isPending: submitting } = useCreateShare(
    household?.id ?? '',
    household?.address
  );

  const [activeTab, setActiveTab] = useState<'share' | 'manage'>('share');
  const [targetUserId, setTargetUserId] = useState('');
  const [shareType, setShareType] = useState<'view' | 'collaborate' | 'transfer'>('collaborate');
  const [notes, setNotes] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const activeMembers = useMemo(() => members.filter((m) => m.status === 'active'), [members]);

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.userId, m.user?.name || m.user?.email || m.userId])),
    [members]
  );

  // Active collaborators & viewers on this household
  const activeCollaborators = household?.collaboratorIds || [];
  const activeReadOnly = household?.readOnlyUserIds || [];
  const pendingOutgoingForThisHousehold = useMemo(
    () => outgoingShares.filter((s) => s.householdId === household?.id && s.status === 'pending'),
    [household?.id, outgoingShares]
  );

  const totalActiveAccess = activeCollaborators.length + activeReadOnly.length;
  const totalManagementCount = totalActiveAccess + pendingOutgoingForThisHousehold.length;

  const handleShare = async () => {
    if (!household || !targetUserId) return;
    const selectedMember = activeMembers.find((m) => m.userId === targetUserId);
    const recipientName = selectedMember?.user?.name || selectedMember?.user?.email || 'Publisher';
    try {
      await createShare({
        toUserId: targetUserId,
        toUserName: recipientName,
        type: shareType,
        notes: notes || undefined,
      });
      toast.success(
        shareType === 'transfer' ? 'Transfer invitation sent' : `Shared with ${recipientName}`
      );
      onOpenChange(false);
      setTargetUserId('');
      setNotes('');
    } catch (e) {
      console.error('Failed to share household', e);
      toast.error('Failed to send share invitation');
    }
  };

  const handleRevoke = async (targetUserId: string) => {
    if (!household) return;
    setActionInProgress(targetUserId);
    try {
      const matchShare = outgoingShares.find(
        (s) => s.householdId === household.id && s.toUserId === targetUserId
      );
      await revokeShareAccess(household.id, targetUserId, matchShare?.id);
      toast.success('Access revoked successfully');
    } catch (_err) {
      toast.error('Failed to revoke access');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUpdatePermission = async (targetUserId: string, newMode: 'collaborate' | 'view') => {
    if (!household) return;
    setActionInProgress(targetUserId);
    try {
      const matchShare = outgoingShares.find(
        (s) => s.householdId === household.id && s.toUserId === targetUserId
      );
      await updateSharePermission(household.id, targetUserId, newMode, matchShare?.id);
      toast.success(
        `Permission updated to ${newMode === 'collaborate' ? 'Collaboration' : 'Read-Only'}`
      );
    } catch (_err) {
      toast.error('Failed to update permission');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCancelPending = async (shareId: string) => {
    setActionInProgress(shareId);
    try {
      await cancelOutgoingShare(shareId);
      toast.success('Pending invitation cancelled');
    } catch (_err) {
      toast.error('Failed to cancel invitation');
    } finally {
      setActionInProgress(null);
    }
  };

  useKeyboardShortcuts(
    [
      {
        key: 'Mod+Enter',
        handler: () => {
          if (activeTab === 'share' && targetUserId && !submitting) {
            void handleShare();
          }
        },
      },
    ],
    { disabled: !open }
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record Sharing & Access Control"
      description={
        household
          ? `${household.streetName ? `${household.streetName} · ` : ''}${household.address} (${household.city})`
          : 'Collaborate with fellow publishers'
      }
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1 bg-muted/40 rounded-2xl w-full border border-border">
          <button
            type="button"
            onClick={() => setActiveTab('share')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'share'
                ? 'bg-card text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserPlus size={13} />
            <span>Share Invitation</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'manage'
                ? 'bg-card text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users size={13} />
            <span>Manage Access ({totalManagementCount})</span>
          </button>
        </div>

        {activeTab === 'share' ? (
          <div className="space-y-4 pt-1">
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
                  <SelectItem value="collaborate">
                    🤝 Collaborate (Partner can log visits & encounters)
                  </SelectItem>
                  <SelectItem value="view">👁️ View Only (Read notes & history)</SelectItem>
                  <SelectItem value="transfer">
                    🔄 Full Transfer (Transfer record ownership completely)
                  </SelectItem>
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
                {submitting ? 'Sending…' : 'Send Invitation'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {totalManagementCount === 0 ? (
              <div className="text-center py-8 px-4 bg-muted/20 border border-border/60 rounded-2xl">
                <UserCheck size={32} className="text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground">No active shares</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  This record has not been shared with any publishers yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {/* Active Collaborators */}
                {activeCollaborators.map((userId) => (
                  <div
                    key={userId}
                    className="flex items-center justify-between p-2.5 bg-card border border-border rounded-xl gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">
                        {memberMap.get(userId) || `Publisher (${userId.slice(0, 6)})`}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 py-0"
                      >
                        🤝 Collaboration
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] px-2 rounded-lg"
                        onClick={() => handleUpdatePermission(userId, 'view')}
                        disabled={actionInProgress === userId}
                        title="Change to Read-Only"
                      >
                        Make Read-Only
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                        onClick={() => handleRevoke(userId)}
                        disabled={actionInProgress === userId}
                        title="Revoke access"
                      >
                        <UserMinus size={13} />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Active Read-Only Viewers */}
                {activeReadOnly.map((userId) => (
                  <div
                    key={userId}
                    className="flex items-center justify-between p-2.5 bg-card border border-border rounded-xl gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">
                        {memberMap.get(userId) || `Publisher (${userId.slice(0, 6)})`}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-[10px] border-slate-300 text-slate-700 bg-slate-50 dark:bg-slate-950/40 py-0"
                      >
                        👁️ Read-Only
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] px-2 rounded-lg"
                        onClick={() => handleUpdatePermission(userId, 'collaborate')}
                        disabled={actionInProgress === userId}
                        title="Upgrade to Collaborate"
                      >
                        Allow Collaborate
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                        onClick={() => handleRevoke(userId)}
                        disabled={actionInProgress === userId}
                        title="Revoke access"
                      >
                        <UserMinus size={13} />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Pending Outgoing Shares */}
                {pendingOutgoingForThisHousehold.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-2.5 bg-muted/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">
                        {share.toUserName || `Publisher (${share.toUserId.slice(0, 6)})`}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40 py-0"
                        >
                          ⏳ Pending Invitation ({share.mode})
                        </Badge>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] px-2 gap-1 text-destructive hover:text-destructive border-destructive/20 rounded-lg shrink-0"
                      onClick={() => handleCancelPending(share.id)}
                      disabled={actionInProgress === share.id}
                    >
                      <X size={12} />
                      <span>Cancel</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl text-xs"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
}
