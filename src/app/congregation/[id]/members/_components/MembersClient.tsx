'use client';

import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Crown,
  FolderOpen,
  Search,
  Shield,
  UserCheck,
  User as UserIcon,
  UserX,
  Users,
  X,
  XCircle,
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
  useCongregationGroups,
  useCongregationJoinRequests,
  useCongregationMembers,
  useCurrentUser,
  usePendingEndorsements,
  useReviewJoinRequest,
  useUpdateMemberRole,
} from '@/hooks';
import { canApproveMembers, isUserInGroup } from '@/lib/permissions';
import { CongregationRole, MemberStatus, UserRole } from '@/lib/roles';
import { timeAgo } from '@/lib/time-ago';
import type { Assignment } from '@/types/api';

type Tab = 'members' | 'my_group' | 'requests' | 'endorsements';

export default function MembersClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const congregationId = (params?.id as string) || '';
  const { user } = useCurrentUser();
  const _canManage = canApproveMembers(user.role, user.congregationRole);

  const { data: members = [], isLoading: membersLoading } = useCongregationMembers(congregationId);
  const { groups = [] } = useCongregationGroups(congregationId);
  const { data: allJoinRequests = [], isLoading: requestsLoading } =
    useCongregationJoinRequests(congregationId);
  const { endorsements = [], isLoading: endorsementsLoading } =
    usePendingEndorsements(congregationId);
  const { review: reviewJoin, isPending: reviewingJoin } = useReviewJoinRequest(congregationId);
  const { updateRole, isPending: updatingRole } = useUpdateMemberRole(congregationId);
  const { approve, reject, isApproving } = useApproveAssignment(congregationId);

  const initialTab = (searchParams?.get('tab') as Tab) || 'members';
  const [tab, setTab] = useState<Tab>(
    initialTab === 'endorsements' || initialTab === 'requests' || initialTab === 'my_group'
      ? initialTab
      : 'members'
  );
  const [search, setSearch] = useState('');
  const [editMember, setEditMember] = useState<(typeof members)[0] | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('publisher');

  // Request filter and search state
  type RequestFilter = 'pending' | 'approved' | 'rejected' | 'all';
  const [requestFilter, setRequestFilter] = useState<RequestFilter>('pending');
  const [requestSearch, setRequestSearch] = useState('');

  // Decline join request dialog state
  const [declineRequestItem, setDeclineRequestItem] = useState<(typeof allJoinRequests)[0] | null>(
    null
  );
  const [declineRequestReason, setDeclineRequestReason] = useState('');
  const [isSubmittingRequestDecline, setIsSubmittingRequestDecline] = useState(false);

  // Decline endorsement dialog state
  const [declineEndorsement, setDeclineEndorsement] = useState<Assignment | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [isSubmittingDecline, setIsSubmittingDecline] = useState(false);

  // Current user's group
  const myGroup = useMemo(() => {
    return groups.find((g) => isUserInGroup(user, g) || g.id === user.groupId);
  }, [groups, user]);

  const myGroupMembers = useMemo(() => {
    if (!myGroup) return [];
    return members.filter(
      (m) =>
        (m.status === 'active' || !m.status) &&
        (m.groupId === myGroup.id ||
          myGroup.members?.some((gm) => gm.userId === m.userId || gm.id === m.userId))
    );
  }, [members, myGroup]);

  useEffect(() => {
    const tabParam = searchParams?.get('tab') as Tab;
    if (
      tabParam === 'endorsements' ||
      tabParam === 'requests' ||
      tabParam === 'members' ||
      tabParam === 'my_group'
    ) {
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

  const filteredGroupMembers = useMemo(() => {
    if (!search.trim()) return myGroupMembers;
    const q = search.toLowerCase();
    return myGroupMembers.filter(
      (m) => m.user?.name?.toLowerCase().includes(q) || m.user?.email?.toLowerCase().includes(q)
    );
  }, [myGroupMembers, search]);

  const pendingJoinRequests = useMemo(
    () =>
      allJoinRequests.filter((r) => r.status === 'pending' || r.status === MemberStatus.PENDING),
    [allJoinRequests]
  );

  const approvedJoinRequests = useMemo(
    () =>
      allJoinRequests.filter(
        (r) => r.status === 'active' || r.status === 'approved' || r.status === MemberStatus.ACTIVE
      ),
    [allJoinRequests]
  );

  const declinedJoinRequests = useMemo(
    () =>
      allJoinRequests.filter((r) => r.status === 'rejected' || r.status === MemberStatus.REJECTED),
    [allJoinRequests]
  );

  const filteredJoinRequests = useMemo(() => {
    let list = allJoinRequests;
    if (requestFilter === 'pending') {
      list = pendingJoinRequests;
    } else if (requestFilter === 'approved') {
      list = approvedJoinRequests;
    } else if (requestFilter === 'rejected') {
      list = declinedJoinRequests;
    }

    if (!requestSearch.trim()) return list;
    const q = requestSearch.toLowerCase();
    return list.filter(
      (r) =>
        r.user?.name?.toLowerCase().includes(q) ||
        r.user?.email?.toLowerCase().includes(q) ||
        r.approvedByName?.toLowerCase().includes(q) ||
        r.declinedByName?.toLowerCase().includes(q) ||
        r.reviewedByName?.toLowerCase().includes(q) ||
        r.joinMessage?.toLowerCase().includes(q) ||
        r.reviewNote?.toLowerCase().includes(q)
    );
  }, [
    allJoinRequests,
    requestFilter,
    pendingJoinRequests,
    approvedJoinRequests,
    declinedJoinRequests,
    requestSearch,
  ]);

  const handleApproveRequest = async (req: (typeof allJoinRequests)[0]) => {
    try {
      const reviewerName = user.name || user.email || 'Service Overseer';
      await reviewJoin({
        requestId: req.id,
        status: MemberStatus.ACTIVE,
        reviewerId: user.id,
        reviewerName,
        reviewerRole: user.congregationRole || user.role,
      });
      toast.success(
        `Approved ${req.user?.name || req.user?.email || 'publisher'} into congregation`
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve request');
    }
  };

  const handleConfirmDeclineRequest = async () => {
    if (!declineRequestItem) return;
    setIsSubmittingRequestDecline(true);
    try {
      const reviewerName = user.name || user.email || 'Service Overseer';
      const trimmedNote = declineRequestReason.trim();
      await reviewJoin({
        requestId: declineRequestItem.id,
        status: MemberStatus.REJECTED,
        reviewNote: trimmedNote || undefined,
        reviewerId: user.id,
        reviewerName,
        reviewerRole: user.congregationRole || user.role,
      });
      toast.success(
        `Declined join request for ${declineRequestItem.user?.name || declineRequestItem.user?.email || 'publisher'}`
      );
      setDeclineRequestItem(null);
      setDeclineRequestReason('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to decline request');
    } finally {
      setIsSubmittingRequestDecline(false);
    }
  };

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
    <ProtectedPage
      congregationId={congregationId}
      allowedRoles={[
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.SERVICE_OVERSEER,
        UserRole.SECRETARY,
      ]}
    >
      <DashboardHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-24 lg:pb-8 w-full min-w-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Member & Access Management</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Congregation publisher directory, join requests approval, and territory endorsements
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="w-full overflow-x-auto scrollbar-none pb-1">
          <div className="inline-flex items-center gap-2 p-1 bg-muted/40 rounded-2xl border border-border min-w-max">
            <button
              type="button"
              onClick={() => setTab('members')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
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
              onClick={() => setTab('my_group')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                tab === 'my_group'
                  ? 'bg-card text-primary shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users size={14} />
              <span>★ My Group ({myGroupMembers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('requests')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                tab === 'requests'
                  ? 'bg-card text-primary shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock size={14} />
              <span>Join Requests ({pendingJoinRequests.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('endorsements')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                tab === 'endorsements'
                  ? 'bg-card text-primary shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Shield size={14} />
              <span>Endorsements ({endorsements.length})</span>
            </button>
          </div>
        </div>

        {/* Content */}
        {tab === 'my_group' && (
          <div className="space-y-4">
            {!myGroup ? (
              <div className="text-center py-20 bg-card rounded-3xl border border-border p-6">
                <Users size={36} className="text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">No Service Group Assigned</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You are not currently assigned to a field service group. Contact your service
                  overseer to be assigned.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* My Group Banner */}
                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary text-primary-foreground">
                      <Users size={20} />
                    </div>
                    <div>
                      <h2 className="font-bold text-base text-foreground">{myGroup.name}</h2>
                      <p className="text-xs text-muted-foreground">
                        {myGroupMembers.length} publishers assigned to your service group
                      </p>
                    </div>
                  </div>
                </div>

                {/* Group Leadership Cards */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Group Leadership
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Overseer Card */}
                    <Card className="bg-card border-amber-500/30 shadow-xs">
                      <CardContent className="p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Crown size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                              Group Overseer
                            </p>
                            <p className="font-bold text-sm text-foreground truncate">
                              {myGroup.overseerName || 'Unassigned'}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        >
                          Overseer
                        </Badge>
                      </CardContent>
                    </Card>

                    {/* Assistant Overseer Card */}
                    <Card className="bg-card border-blue-500/30 shadow-xs">
                      <CardContent className="p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Shield size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                              Assistant Overseer
                            </p>
                            <p className="font-bold text-sm text-foreground truncate">
                              {myGroup.assistantOverseerName || 'Unassigned'}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                        >
                          Assistant
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Groupmates Directory */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Groupmates ({filteredGroupMembers.length})
                    </h3>
                    <div className="relative w-full sm:w-64">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        placeholder="Search groupmates…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 h-9 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {filteredGroupMembers.map((m) => {
                      const isSelf = isCurrentSelf(m);
                      const isOverseer = m.userId === myGroup.overseerId;
                      const isAssistant = m.userId === myGroup.assistantOverseerId;

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
                                  {isOverseer && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] uppercase font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                    >
                                      👑 Overseer
                                    </Badge>
                                  )}
                                  {isAssistant && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] uppercase font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                    >
                                      🛡️ Assistant
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {m.user?.email}
                                </p>
                                {(m.approvedByName || m.reviewedByName) && (
                                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <UserCheck size={11} className="text-primary/70 shrink-0" />
                                    <span>
                                      Approved by{' '}
                                      <span className="font-semibold text-foreground">
                                        {m.approvedByName || m.reviewedByName}
                                      </span>
                                      {m.reviewedAt || m.joinedAt
                                        ? ` • ${timeAgo(m.reviewedAt || m.joinedAt)}`
                                        : ''}
                                    </span>
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase font-semibold"
                              >
                                {m.congregationRole?.replace(/_/g, ' ') || 'PUBLISHER'}
                              </Badge>
                              {!isSelf && (
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
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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
                            {(m.approvedByName || m.reviewedByName) && (
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <UserCheck size={11} className="text-primary/70 shrink-0" />
                                <span>
                                  Approved by{' '}
                                  <span className="font-semibold text-foreground">
                                    {m.approvedByName || m.reviewedByName}
                                  </span>
                                  {m.reviewedAt || m.joinedAt
                                    ? ` • ${timeAgo(m.reviewedAt || m.joinedAt)}`
                                    : ''}
                                </span>
                              </p>
                            )}
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
          <div className="space-y-4">
            {/* Request Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
              <div className="inline-flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setRequestFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    requestFilter === 'pending'
                      ? 'bg-card text-primary shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Pending ({pendingJoinRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    requestFilter === 'all'
                      ? 'bg-card text-primary shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All ({allJoinRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    requestFilter === 'approved'
                      ? 'bg-card text-primary shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Approved ({approvedJoinRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestFilter('rejected')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    requestFilter === 'rejected'
                      ? 'bg-card text-primary shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Declined ({declinedJoinRequests.length})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="Search requests or reviewer…"
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  className="pl-8 h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            {requestsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : filteredJoinRequests.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-3xl border border-border p-6">
                <Users size={36} className="text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">
                  {requestFilter === 'pending'
                    ? 'No pending join requests'
                    : requestFilter === 'approved'
                      ? 'No approved requests found'
                      : requestFilter === 'rejected'
                        ? 'No declined requests found'
                        : 'No join requests found'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {requestSearch
                    ? 'No requests match your search criteria.'
                    : 'Requests to join the congregation will appear here.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredJoinRequests.map((req) => {
                  const isPending = req.status === 'pending' || req.status === MemberStatus.PENDING;
                  const isApproved =
                    req.status === 'active' ||
                    req.status === 'approved' ||
                    req.status === MemberStatus.ACTIVE;
                  const isRejected =
                    req.status === 'rejected' || req.status === MemberStatus.REJECTED;

                  return (
                    <Card key={req.id} className="bg-card border-border shadow-xs overflow-hidden">
                      <CardContent className="p-4 sm:p-5 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="w-9 h-9 rounded-xl border border-primary/20 bg-primary/10 overflow-hidden shrink-0">
                              {req.user?.avatarUrl && (
                                <AvatarImage
                                  src={req.user.avatarUrl}
                                  alt={req.user.name || 'Applicant'}
                                  className="object-cover w-full h-full rounded-xl"
                                />
                              )}
                              <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-xs">
                                {(req.user?.name || req.user?.email || 'P')
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-foreground truncate">
                                {req.user?.name || req.user?.email || 'Publisher'}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {req.user?.email}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isPending && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              >
                                <Clock size={11} className="mr-1 inline" /> Pending Review
                              </Badge>
                            )}
                            {isApproved && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              >
                                <CheckCircle2 size={11} className="mr-1 inline" /> Approved
                              </Badge>
                            )}
                            {isRejected && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold bg-destructive/10 text-destructive border-destructive/20"
                              >
                                <XCircle size={11} className="mr-1 inline" /> Declined
                              </Badge>
                            )}
                          </div>
                        </div>

                        {req.joinMessage && (
                          <p className="text-xs italic text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/40">
                            &ldquo;{req.joinMessage}&rdquo;
                          </p>
                        )}

                        {/* Audit info: Who approved / declined */}
                        {isApproved && (
                          <div className="flex items-center gap-2.5 bg-emerald-500/5 dark:bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 text-xs">
                            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <UserCheck size={13} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">
                                Approved by{' '}
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  {req.approvedByName || req.reviewedByName || 'Service Overseer'}
                                </span>
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {req.reviewedAt || req.joinedAt
                                  ? timeAgo(req.reviewedAt || req.joinedAt)
                                  : 'Recently'}
                              </p>
                            </div>
                          </div>
                        )}

                        {isRejected && (
                          <div className="flex items-center gap-2.5 bg-destructive/5 dark:bg-destructive/10 p-2.5 rounded-xl border border-destructive/20 text-xs">
                            <div className="w-6 h-6 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                              <UserX size={13} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">
                                Declined by{' '}
                                <span className="text-destructive font-bold">
                                  {req.declinedByName || req.reviewedByName || 'Service Overseer'}
                                </span>
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {req.reviewedAt ? timeAgo(req.reviewedAt) : 'Recently'}
                                {req.reviewNote ? ` • Note: “${req.reviewNote}”` : ''}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Action buttons for pending requests */}
                        {isPending && (
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl text-xs font-semibold text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 cursor-pointer"
                              onClick={() => {
                                setDeclineRequestItem(req);
                                setDeclineRequestReason('');
                              }}
                              disabled={reviewingJoin}
                            >
                              <X size={13} />
                              <span>Decline</span>
                            </Button>
                            <Button
                              size="sm"
                              className="rounded-xl text-xs font-semibold gap-1 cursor-pointer"
                              onClick={() => handleApproveRequest(req)}
                              disabled={reviewingJoin}
                            >
                              <Check size={13} />
                              <span>Approve</span>
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
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
              endorsements.map((item, index) => {
                const isGroup = Boolean(item.serviceGroupId || item.groupName);
                const territoryTitle = `Territory #${item.territoryNumber || item.territoryId}${
                  item.territoryName ? ` — ${item.territoryName}` : ''
                }`;
                const endorserDisplay = item.endorsedByName || 'Territory Servant';
                const timeString = item.endorsedAt ? timeAgo(item.endorsedAt) : 'Recently';

                const isReturn = item.endorsementType === 'return';
                const isRevoke = item.endorsementType === 'revoke';

                // Check for earlier pending action on the same territory
                const hasEarlierPendingOnSameTerritory = endorsements
                  .slice(0, index)
                  .some((prev) => prev.territoryId === item.territoryId);

                const approveLabel = isReturn
                  ? 'Approve Return'
                  : isRevoke
                    ? 'Approve Revocation'
                    : 'Approve Assignment';

                const declineLabel = isReturn
                  ? 'Decline Return'
                  : isRevoke
                    ? 'Decline Revocation'
                    : 'Decline Endorsement';

                const typeBadgeText = isReturn
                  ? 'Territory Return'
                  : isRevoke
                    ? 'Territory Revocation'
                    : 'New Assignment';

                return (
                  <Card key={item.id} className="bg-card border-border shadow-xs overflow-hidden">
                    <CardContent className="p-4 sm:p-5 space-y-3.5">
                      {/* Header: Territory and Endorsement status badge */}
                      <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-base text-foreground leading-snug break-words">
                              {territoryTitle}
                            </h4>
                            <Badge
                              variant="outline"
                              className={`text-[9px] uppercase font-bold ${
                                isReturn
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  : isRevoke
                                    ? 'bg-destructive/10 text-destructive border-destructive/20'
                                    : 'bg-primary/10 text-primary border-primary/20'
                              }`}
                            >
                              {typeBadgeText}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Calendar size={12} className="shrink-0" />
                            <span>{timeString}</span>
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 shrink-0 whitespace-nowrap"
                        >
                          Pending Approval
                        </Badge>
                      </div>

                      {/* Out-of-order sequence warning */}
                      {hasEarlierPendingOnSameTerritory && (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                          <AlertTriangle size={14} className="shrink-0" />
                          <span>
                            An earlier action for this territory is pending above. Please resolve it
                            first.
                          </span>
                        </div>
                      )}

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
                            {isReturn ? 'Returned By' : isRevoke ? 'Revocation By' : 'Endorsed By'}
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
                                {isReturn
                                  ? 'Publisher Return Request'
                                  : isRevoke
                                    ? 'Territory Revocation Request'
                                    : 'Territory Servant Endorsement'}
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
                          disabled={isApproving || hasEarlierPendingOnSameTerritory}
                        >
                          <X size={14} />
                          <span>{declineLabel}</span>
                        </Button>

                        <Button
                          size="sm"
                          className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                          onClick={() => handleApproveEndorsement(item)}
                          disabled={isApproving || hasEarlierPendingOnSameTerritory}
                        >
                          <Check size={14} />
                          <span>{approveLabel}</span>
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
                  <SelectContent className="bg-popover border-border shadow-2xl">
                    <SelectItem value={CongregationRole.SERVICE_OVERSEER}>
                      Service Overseer
                    </SelectItem>
                    <SelectItem value={CongregationRole.SECRETARY}>
                      Congregation Secretary
                    </SelectItem>
                    <SelectItem value={CongregationRole.TERRITORY_SERVANT}>
                      Territory Servant
                    </SelectItem>
                    <SelectItem value={CongregationRole.CIRCUIT_OVERSEER}>
                      Circuit Overseer
                    </SelectItem>
                    <SelectItem value={CongregationRole.PUBLISHER}>Regular Publisher</SelectItem>
                    <SelectItem value={CongregationRole.VISITING_PUBLISHER}>
                      Visiting Publisher
                    </SelectItem>
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

        {/* Decline Join Request Dialog */}
        <ResponsiveDialog
          open={!!declineRequestItem}
          onOpenChange={(op) => {
            if (!op) {
              setDeclineRequestItem(null);
              setDeclineRequestReason('');
            }
          }}
          title="Decline Join Request"
          description="Specify an optional reason for declining this request. The applicant will be notified."
        >
          <div className="space-y-4">
            {declineRequestItem && (
              <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1 text-xs">
                <p className="font-semibold text-foreground">
                  {declineRequestItem.user?.name || 'Publisher'}
                </p>
                <p className="text-muted-foreground">{declineRequestItem.user?.email}</p>
                {declineRequestItem.joinMessage && (
                  <p className="text-muted-foreground italic">
                    &ldquo;{declineRequestItem.joinMessage}&rdquo;
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="request-decline-reason"
                  className="text-xs font-semibold text-foreground"
                >
                  Reason for Declining (Optional)
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  {declineRequestReason.length}/500
                </span>
              </div>
              <Textarea
                id="request-decline-reason"
                placeholder="e.g. Please speak with the coordinator of the body of elders before requesting access."
                value={declineRequestReason}
                onChange={(e) => setDeclineRequestReason(e.target.value)}
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
                  setDeclineRequestItem(null);
                  setDeclineRequestReason('');
                }}
                disabled={isSubmittingRequestDecline}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="rounded-xl text-xs font-semibold gap-1"
                onClick={handleConfirmDeclineRequest}
                disabled={isSubmittingRequestDecline}
              >
                <X size={13} />
                <span>{isSubmittingRequestDecline ? 'Declining…' : 'Decline Request'}</span>
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
