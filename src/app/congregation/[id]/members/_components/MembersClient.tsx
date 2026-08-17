'use client';

import { Check, Clock, Search, Shield, Users, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { DashboardHeader } from '@/components/dashboard-header';
import { ProtectedPage } from '@/components/protected-page';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
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
import {
  useApproveAssignment,
  useCongregationJoinRequests,
  useCongregationMembers,
  useCurrentUser,
  usePendingEndorsements,
  useReviewJoinRequest,
  useUpdateMemberRole,
} from '@/hooks';
import { isServiceOverseer, isSystemAdmin } from '@/lib/permissions';
import { CongregationRole, UserRole } from '@/lib/roles';
import { toast } from 'sonner';

type Tab = 'members' | 'requests' | 'endorsements';

export default function MembersClient() {
  const params = useParams();
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
  const { approve, isPending: approvingAssignment } = useApproveAssignment(congregationId);

  const [tab, setTab] = useState<Tab>('members');
  const [search, setSearch] = useState('');
  const [editMember, setEditMember] = useState<(typeof members)[0] | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('publisher');

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

  return (
    <ProtectedPage congregationId={congregationId} requiredRole={UserRole.SERVICE_OVERSEER}>
      <DashboardHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-24 lg:pb-8">
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
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-foreground">
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
                          <p className="text-xs text-muted-foreground">{m.user?.email}</p>
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
                        onClick={() => reviewJoin({ requestId: req.id, status: 'rejected' })}
                        disabled={reviewingJoin}
                      >
                        <X size={13} />
                        <span>Decline</span>
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-xl text-xs font-semibold gap-1"
                        onClick={() => reviewJoin({ requestId: req.id, status: 'approved' })}
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
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : endorsements.length === 0 ? (
              <div className="text-center py-20 bg-card rounded-3xl border border-border p-6">
                <Shield size={36} className="text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">
                  No pending territory endorsements
                </p>
              </div>
            ) : (
              endorsements.map((item) => (
                <Card key={item.id} className="bg-card border-border shadow-xs">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          Territory #{item.territoryNumber || item.territory?.number}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          Endorsement Required
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Requested by{' '}
                        <span className="font-semibold text-foreground">
                          {item.assigneeName || item.assigneeEmail || 'Publisher'}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="rounded-xl text-xs font-semibold gap-1"
                        onClick={() => approve({ assignmentId: item.id, approved: true })}
                        disabled={approvingAssignment}
                      >
                        <Check size={13} />
                        <span>Approve Endorsement</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
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
                  <SelectContent className="bg-popover border-border">
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
      </main>
      <BottomTabBar />
    </ProtectedPage>
  );
}
