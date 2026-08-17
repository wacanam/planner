'use client';

import { ArrowDownLeft, ArrowUpRight, Check, Share2, Trash2, UserMinus, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRespondToShare, useShares } from '@/hooks/use-shares';

export default function SharedRecordsPage() {
  const params = useParams();
  const _congregationId = (params?.id as string) || '';

  const {
    shares = [],
    isLoading,
    revokeShareAccess,
    updateSharePermission,
    cancelOutgoingShare,
    deleteShareRecord,
  } = useShares();
  const { respond, isPending: responding } = useRespondToShare();

  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const incoming = shares.filter((s) => s.direction === 'incoming');
  const outgoing = shares.filter((s) => s.direction === 'outgoing');

  const handleRespond = async (shareId: string, accept: boolean) => {
    try {
      await respond({
        shareId,
        status: accept ? 'accepted' : 'rejected',
      });
      toast.success(accept ? 'Record added to your personal records' : 'Share request declined');
    } catch (err) {
      toast.error('Failed to respond to share request');
    }
  };

  const handleCancelOutgoing = async (shareId: string) => {
    setActionInProgress(shareId);
    try {
      await cancelOutgoingShare(shareId);
      toast.success('Invitation cancelled');
    } catch (err) {
      toast.error('Failed to cancel invitation');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRevokeAccess = async (householdId: string, toUserId: string, shareId: string) => {
    setActionInProgress(shareId);
    try {
      await revokeShareAccess(householdId, toUserId, shareId);
      toast.success('Access revoked successfully');
    } catch (err) {
      toast.error('Failed to revoke access');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleToggleMode = async (
    householdId: string,
    toUserId: string,
    currentMode: string,
    shareId: string
  ) => {
    setActionInProgress(shareId);
    const newMode = currentMode === 'collaborate' ? 'view' : 'collaborate';
    try {
      await updateSharePermission(householdId, toUserId, newMode, shareId);
      toast.success(`Permission updated to ${newMode === 'collaborate' ? 'Collaboration' : 'Read-Only'}`);
    } catch (err) {
      toast.error('Failed to update permission');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteRecord = async (shareId: string) => {
    setActionInProgress(shareId);
    try {
      await deleteShareRecord(shareId);
      toast.success('Share record removed from history');
    } catch (err) {
      toast.error('Failed to remove share record');
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 min-w-0 w-full">
      <div>
        <h1 className="text-xl font-bold text-foreground">Shared & Transferred Records</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Collaborate with partner publishers or receive transferred return visits
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-muted/40 rounded-2xl w-fit border border-border">
        <button
          type="button"
          onClick={() => setActiveTab('incoming')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'incoming'
              ? 'bg-card text-primary shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ArrowDownLeft size={14} />
          <span>Incoming Requests ({incoming.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('outgoing')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'outgoing'
              ? 'bg-card text-primary shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ArrowUpRight size={14} />
          <span>Outgoing Shares ({outgoing.length})</span>
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : activeTab === 'incoming' ? (
        incoming.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-border p-6">
            <Share2 size={36} className="text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">No incoming shared records</p>
            <p className="text-xs text-muted-foreground mt-1">
              When a publisher shares a door record with you, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {incoming.map((share) => (
              <Card key={share.id} className="bg-card border-border shadow-xs">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-foreground">
                        {share.householdAddress || 'Household Record'}
                      </p>
                      <Badge variant="outline" className="text-[10px] capitalize font-medium">
                        {share.mode === 'transfer'
                          ? '🔄 Transfer'
                          : share.mode === 'view'
                            ? '👁️ Read-Only'
                            : '🤝 Collaborate'}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold ${
                          share.status === 'accepted'
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : share.status === 'declined'
                              ? 'text-red-700 bg-red-50 border-red-300 dark:bg-red-950/40 dark:text-red-300'
                              : 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/40'
                        }`}
                      >
                        {share.status}
                      </Badge>
                      {share.status === 'accepted' && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-primary/10 text-primary border-primary/20 font-semibold"
                        >
                          ✓ In Personal Records
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      From: {share.fromUserName || 'Publisher'}
                    </p>
                    {share.notes && (
                      <p className="text-xs text-muted-foreground/90 italic mt-1">
                        &ldquo;{share.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  {share.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs gap-1"
                        onClick={() => handleRespond(share.id, false)}
                        disabled={responding}
                      >
                        <X size={13} />
                        <span>Decline</span>
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-xl text-xs gap-1 font-semibold"
                        onClick={() => handleRespond(share.id, true)}
                        disabled={responding}
                      >
                        <Check size={13} />
                        <span>Accept Record</span>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : outgoing.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-3xl border border-border p-6">
          <Share2 size={36} className="text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground">No outgoing shared records</p>
          <p className="text-xs text-muted-foreground mt-1">
            You can share household records from the Household directory.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {outgoing.map((share) => (
            <Card key={share.id} className="bg-card border-border shadow-xs">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm text-foreground">
                      {share.householdAddress || 'Household Record'}
                    </p>
                    <Badge variant="outline" className="text-[10px] capitalize font-medium">
                      {share.mode === 'transfer'
                        ? '🔄 Transfer'
                        : share.mode === 'view'
                          ? '👁️ Read-Only'
                          : '🤝 Collaborate'}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase font-bold ${
                        share.status === 'accepted'
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : share.status === 'pending'
                            ? 'text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'text-muted-foreground border-border'
                      }`}
                    >
                      {share.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sent to: {share.toUserName || `Publisher (${share.toUserId.slice(0, 6)})`}
                  </p>
                  {share.notes && (
                    <p className="text-xs text-muted-foreground/90 italic mt-1">
                      &ldquo;{share.notes}&rdquo;
                    </p>
                  )}
                </div>

                {/* Management Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {share.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs gap-1 text-destructive hover:text-destructive border-destructive/20"
                      onClick={() => handleCancelOutgoing(share.id)}
                      disabled={actionInProgress === share.id}
                    >
                      <X size={13} />
                      <span>Cancel Invitation</span>
                    </Button>
                  )}

                  {share.status === 'accepted' && share.mode !== 'transfer' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs"
                        onClick={() =>
                          handleToggleMode(
                            share.householdId,
                            share.toUserId,
                            share.mode,
                            share.id
                          )
                        }
                        disabled={actionInProgress === share.id}
                      >
                        {share.mode === 'collaborate' ? 'Make Read-Only' : 'Allow Collaborate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() =>
                          handleRevokeAccess(share.householdId, share.toUserId, share.id)
                        }
                        disabled={actionInProgress === share.id}
                        title="Revoke access from publisher"
                      >
                        <UserMinus size={13} />
                        <span>Revoke Access</span>
                      </Button>
                    </>
                  )}

                  {(share.status === 'cancelled' || share.status === 'declined') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 rounded-xl p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteRecord(share.id)}
                      disabled={actionInProgress === share.id}
                      title="Dismiss and remove record"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
