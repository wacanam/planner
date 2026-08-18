'use client';

import {
  Calendar,
  Check,
  Clock,
  FolderOpen,
  Search,
  Shield,
  UserCheck,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { DashboardHeader } from '@/components/dashboard-header';
import { ProtectedPage } from '@/components/protected-page';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  useApproveAssignment,
  useCongregationJoinRequests,
  useCongregationMembers,
  useCurrentUser,
  usePendingEndorsements,
  useReviewJoinRequest,
  useUpdateMemberRole,
} from '@/hooks';
import { isServiceOverseer } from '@/lib/permissions';
import { CongregationRole, MemberStatus, UserRole } from '@/lib/roles';
import { timeAgo } from '@/lib/time-ago';
import type { Assignment } from '@/types/api';

type Tab = 'members' | 'requests' | 'endorsements';

export default function MembersClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const congregationId = (params?.id as string) || '';
  const { user } = useCurrentUser();
  const _isOverseer = isServiceOverseer(user.role);

  const { data: members = [], isLoading: membersLoading } = useCongregationMembers(congregationId);
  const { data: joinRequests = [], isLoading: requestsLoading } = useCongregationJoinRequests(
    congregationId,
    'pending'
  );
  const { endorsements = [], isLoading: endorsementsLoading } =
    usePendingEndorsements(congregationId);
  const { review: reviewJoin, isPending: reviewingJoin } = useReviewJoinRequest(congregationId);
  const { updateRole, isPending: updatingRole } = useUpdateMemberRole(congregationId);
  const { approve, reject, isApproving } = useApproveAssignment(congregationId);

  const initialTab = (searchParams?.get('tab') as Tab) || 'members';
  const [tab, setTab] = useState<Tab>(
    initialTab === 'endorsements' || initialTab === 'requests' ? initialTab : 'members'
  );
  const [search, setSearch] = useState('');
  const [editMember, setEditMember] = useState<(typeof members)[0] | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('publisher');

  // Decline endorsement dialog state
  const [declineEndorsement, setDeclineEndorsement] = useState<Assignment | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [isSubmittingDecline, setIsSubmittingDecline] = useState(false);

  useEffect(() => {
    const tabParam = searchParams?.get('tab') as Tab;
    if (tabParam === 'endorsements' || tabParam === 'requests' || tabParam === 'members') {
      setTab(tabParam);
    }
  }, [searchParams]);

  const isCurrentSelf = (m: (typeof members)[0]) => {
    return (
      m.userId === user.id ||
      m.id === user.id ||
      (Boolean(m.user?.email) && m.user?.email?.toLowerCase() === user.email?.toLowerCase())
    );
  };

  const activeMembers = members.filter((m) => m.status === 'active');

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return activeMembers;
    const q = search.toLowerCase();
    return activeMembers.filter(
      (m) => m.user?.name?.toLowerCase().includes(q) || m.user?.email?.toLowerCase().includes(q)
    );
  }, [activeMembers, search]);

  const handleUpdateRole = async () => {
    if (!editMember) return;
    if (isCurrentSelf(editMember)) {
      toast.error('You cannot change or downgrade your own congregation role.');
      setEditMember(null);
      return;
    }
    await updateRole({
      userId: editMember.userId,
      congregationRole: selectedRole as CongregationRole,
    });
    toast.success('Member role updated successfully');
    setEditMember(null);
  };

  const handleApproveEndorsement = async (item: Assignment) => {
    try {
      const overseerName = user.name || user.email || 'Service Overseer';
      await approve({ assignmentId: item.id, approved: true }, user.id, overseerName);
      toast.success(
        `Approved endorsement for Territory #${item.territoryNumber || item.territoryId}`
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve endorsement');
    }
  };

  const handleConfirmDecline = async () => {
    if (!declineEndorsement) return;
    const trimmedReason = declineReason.trim();
    if (!trimmedReason) {
      toast.error('Please provide a reason for declining the endorsement.');
      return;
    }

    setIsSubmittingDecline(true);
    try {
      const overseerName = user.name || user.email || 'Service Overseer';
      await reject(declineEndorsement.id, trimmedReason, user.id, overseerName);
      toast.success(
        `Declined endorsement for Territory #${declineEndorsement.territoryNumber || declineEndorsement.territoryId}`
      );
      setDeclineEndorsement(null);
      setDeclineReason('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to decline endorsement');
    } finally {
      setIsSubmittingDecline(false);
    }
  };

  return (
    <ProtectedPage congregationId={congregationId} requiredRole={UserRole.SERVICE_OVERSEER}>
      <DashboardHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-24 lg:pb-8 w-full min-w-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Member & Access Management</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Congregation publisher directory, join requests approval, and territory endorsements
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 bg-muted/40 rounded-2xl w-fit border border-border">
          <button
            type="button"
            onClick={() => setTab('members')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === 'members'
                ? 'bg-card text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users size={14} />
            <span>Active Members ({activeMembers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('requests')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === 'requests'
                ? 'bg-card text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock size={14} />
            <span>Join Requests ({joinRequests.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('endorsements')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === 'endorsements'
                ? 'bg-card text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Shield size={14} />
            <span>Endorsements ({endorsements.length})</span>
          </button>
        </div>

        {/* Content */}
        {tab === 'members' && (
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Search member name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-10 rounded-xl text-xs"
              />
            </div>

            {membersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMembers.map((m) => {
                  const isSelf = isCurrentSelf(m);
                  return (
                    <Card key={m.id} className="bg-card border-border shadow-xs">
                      <CardContent className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="w-9 h-9 rounded-xl border border-primary/20 bg-primary/10 overflow-hidden shrink-0">
                            {m.user?.avatarUrl && (
                              <AvatarImage
                                src={m.user.avatarUrl}
                                alt={m.user.name || 'Member'}
                                className="object-cover w-full h-full rounded-xl"
                              />
                            )}
                            <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-xs">
                              {(m.user?.name || m.user?.email || 'P')
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-sm text-foreground truncate">
                                {m.user?.name || m.user?.email || 'Publisher'}
                              </p>
                              {isSelf && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] uppercase font-bold bg-primary/10 text-primary border-primary/20"
                                >
                                  You
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {m.user?.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                            {m.congregationRole?.replace(/_/g, ' ') || 'PUBLISHER'}
                          </Badge>
                          {!isSelf ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-xl text-xs font-semibold"
                              onClick={() => {
                                setEditMember(m);
                                setSelectedRole(m.congregationRole || 'publisher');
                              }}
                            >
                              Change Role
                            </Button>
                          ) : (
                            <span className="text-[11px] font-medium text-muted-foreground italic px-2">
                              Your Account
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'requests' && (
          <div className="space-y-3">
            {requestsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : joinRequests.length === 0 ? (
              <div className="text-center py-20 bg-card rounded-3xl border border-border p-6">
                <Users size={36} className="text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">No pending join requests</p>
              </div>
            ) : (
              joinRequests.map((req) => (
                <Card key={req.id} className="bg-card border-border shadow-xs">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-sm text-foreground">
                        {req.user?.name || req.user?.email || 'Publisher'}
                      </p>
                      <p className="text-xs text-muted-foreground">{req.user?.email}</p>
                      {req.joinMessage && (
                        <p className="text-xs italic text-muted-foreground mt-1 bg-muted/40 p-2 rounded-xl">
                          &ldquo;{req.joinMessage}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs font-semibold text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={async () => {
                          try {
                            await reviewJoin({ requestId: req.id, status: MemberStatus.REJECTED });
                            toast.success(
                              `Declined join request for ${req.user?.name || req.user?.email || 'publisher'}`
                            );
                          } catch (err: any) {
                            toast.error(err?.message || 'Failed to decline request');
                          }
                        }}
                        disabled={reviewingJoin}
                      >
                        <X size={13} />
                        <span>Decline</span>
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-xl text-xs font-semibold gap-1"
                        onClick={async () => {
                          try {
                            await reviewJoin({ requestId: req.id, status: MemberStatus.ACTIVE });
                            toast.success(
                              `Approved ${req.user?.name || req.user?.email || 'publisher'} into congregation`
                            );
                          } catch (err: any) {
                            toast.error(err?.message || 'Failed to approve request');
                          }
                        }}
                        disabled={reviewingJoin}
                      >
                        <Check size={13} />
                        <span>Approve</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === 'endorsements' && (
          <div className="space-y-3">
            {endorsementsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-28 bg-muted animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : endorsements.length === 0 ? (
              <div className="text-center py-20 bg-card rounded-3xl border border-border p-6">
                <Shield size={36} className="text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">
                  No pending territory endorsements
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  All territory assignments are up to date or already approved.
                </p>
              </div>
            ) : (
              endorsements.map((item) => {
                const isGroup = Boolean(item.serviceGroupId || item.groupName);
                const territoryTitle = `Territory #${item.territoryNumber || item.territoryId}${
                  item.territoryName ? ` — ${item.territoryName}` : ''
                }`;
                const endorserDisplay = item.endorsedByName || 'Territory Servant';
                const timeString = item.endorsedAt ? timeAgo(item.endorsedAt) : 'Recently';

                return (
                  <Card key={item.id} className="bg-card border-border shadow-xs overflow-hidden">
                    <CardContent className="p-4 sm:p-5 space-y-3.5">
                      {/* Header: Territory and Endorsement status badge */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-foreground">
                            {territoryTitle}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          >
                            Endorsement Pending Approval
                          </Badge>
                        </div>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar size={12} />
                          <span>{timeString}</span>
                        </span>
                      </div>

                      {/* Details: Who is being endorsed & Who endorsed */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/20 p-3 rounded-xl border border-border/40 text-xs">
                        {/* What / Who is being endorsed */}
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                            Target Assignee
                          </span>
                          <div className="flex items-center gap-2">
                            {isGroup ? (
                              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <FolderOpen size={14} />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <UserIcon size={14} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">
                                {isGroup
                                  ? `Group: ${item.groupName || 'Service Group'}`
                                  : item.assigneeName || item.assigneeEmail || 'Publisher'}
                              </p>
                              {!isGroup && item.assigneeEmail && (
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {item.assigneeEmail}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Who endorsed */}
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                            Endorsed By
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                              <UserCheck size={14} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">
                                {endorserDisplay}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Territory Servant Endorsement
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Notes if any */}
                      {item.notes && (
                        <p className="text-xs text-muted-foreground italic bg-muted/40 p-2.5 rounded-xl border border-border/30">
                          &ldquo;{item.notes}&rdquo;
                        </p>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-xs font-semibold gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 cursor-pointer"
                          onClick={() => {
                            setDeclineEndorsement(item);
                            setDeclineReason('');
                          }}
                          disabled={isApproving}
                        >
                          <X size={14} />
                          <span>Decline Endorsement</span>
                        </Button>

                        <Button
                          size="sm"
                          className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                          onClick={() => handleApproveEndorsement(item)}
                          disabled={isApproving}
                        >
                          <Check size={14} />
                          <span>Approve Endorsement</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Change Role Dialog */}
        <ResponsiveDialog
          open={!!editMember}
          onOpenChange={(op) => !op && setEditMember(null)}
          title="Change Congregation Role"
          description={
            editMember ? `Assign role for ${editMember.user?.name || editMember.user?.email}` : ''
          }
        >
          <div className="space-y-4">
            {editMember && isCurrentSelf(editMember) ? (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                You cannot change or downgrade your own congregation role.
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Congregation Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent side="top" className="bg-popover border-border shadow-2xl">
                    <SelectItem value={CongregationRole.SERVICE_OVERSEER}>
                      Service Overseer
                    </SelectItem>
                    <SelectItem value={CongregationRole.TERRITORY_SERVANT}>
                      Territory Servant
                    </SelectItem>
                    <SelectItem value="publisher">Regular Publisher</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl text-xs"
                onClick={() => setEditMember(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl text-xs font-semibold"
                onClick={handleUpdateRole}
                disabled={updatingRole || (!!editMember && isCurrentSelf(editMember))}
              >
                {updatingRole ? 'Updating…' : 'Save Role'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>

        {/* Decline Endorsement Dialog */}
        <ResponsiveDialog
          open={!!declineEndorsement}
          onOpenChange={(op) => {
            if (!op) {
              setDeclineEndorsement(null);
              setDeclineReason('');
            }
          }}
          title="Decline Territory Endorsement"
          description="Specify the reason for declining this territory endorsement. The publisher and territory servant will be notified."
        >
          <div className="space-y-4">
            {declineEndorsement && (
              <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1 text-xs">
                <p className="font-semibold text-foreground">
                  Territory #{declineEndorsement.territoryNumber || declineEndorsement.territoryId}
                  {declineEndorsement.territoryName ? ` — ${declineEndorsement.territoryName}` : ''}
                </p>
                <p className="text-muted-foreground">
                  Assignee:{' '}
                  <span className="font-medium text-foreground">
                    {declineEndorsement.assigneeName ||
                      declineEndorsement.groupName ||
                      declineEndorsement.assigneeEmail ||
                      'Publisher'}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Endorsed by:{' '}
                  <span className="font-medium text-foreground">
                    {declineEndorsement.endorsedByName || 'Territory Servant'}
                  </span>
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="decline-reason" className="text-xs font-semibold text-foreground">
                  Reason for Declining <span className="text-destructive">*</span>
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  {declineReason.length}/500
                </span>
              </div>
              <Textarea
                id="decline-reason"
                placeholder="e.g. Territory is reserved for upcoming campaign, or publisher already has 2 active assignments."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                maxLength={500}
                rows={3}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl text-xs"
                onClick={() => {
                  setDeclineEndorsement(null);
                  setDeclineReason('');
                }}
                disabled={isSubmittingDecline}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="rounded-xl text-xs font-semibold gap-1"
                onClick={handleConfirmDecline}
                disabled={isSubmittingDecline || !declineReason.trim()}
              >
                <X size={13} />
                <span>{isSubmittingDecline ? 'Declining…' : 'Decline Endorsement'}</span>
              </Button>
            </div>
          </div>
        </ResponsiveDialog>
      </main>
      <BottomTabBar />
    </ProtectedPage>
  );
}
