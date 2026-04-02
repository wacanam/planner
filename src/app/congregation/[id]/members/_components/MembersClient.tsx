'use client';

import { Check, Clock, MessageSquare, Pencil, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSession } from 'next-auth/react';
import { ProtectedPage } from '@/components/protected-page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';
import { CongregationRole, UserRole } from '@/db';
import type { Member, JoinRequest } from '@/types/api';
import {
  useCongregationMembers,
  useCongregationJoinRequests,
  useReviewJoinRequest,
  useUpdateMemberRole,
} from '@/hooks';
import {
  editMemberRoleSchema,
  type EditMemberRoleFormData,
  reviewJoinRequestSchema,
  type ReviewJoinRequestFormData,
} from '@/schemas';

type Tab = 'members' | 'requests';

export default function CongregationMembersPage() {
  const params = useParams();
  const congregationId = params?.id as string;
  const { data: session } = useSession();

  const sessionUser = session?.user as
    | {
        id?: string;
        role?: string;
        congregationId?: string;
      }
    | undefined;

  const {
    data: membersData,
    isLoading: loading,
    mutate: mutateMembers,
  } = useCongregationMembers(congregationId);
  const members = membersData.filter((m) => m.status === 'active');

  const {
    data: requestsData,
    isLoading: requestsLoading,
    mutate: mutateRequests,
  } = useCongregationJoinRequests(congregationId, 'pending');
  const requests: JoinRequest[] = requestsData;
  const pendingCount = requests.length;

  const { review: reviewJoinRequest } = useReviewJoinRequest(congregationId);
  const { updateRole: updateMemberRole } = useUpdateMemberRole(congregationId);

  // Determine current user's role from members data
  const myRole = members.find((m) => m.userId === sessionUser?.id)?.congregationRole ?? null;

  const isPrivileged =
    myRole === CongregationRole.SERVICE_OVERSEER || myRole === CongregationRole.TERRITORY_SERVANT;

  const canApprove = myRole === CongregationRole.SERVICE_OVERSEER;

  const canEditRole =
    sessionUser?.role === UserRole.SUPER_ADMIN ||
    sessionUser?.role === UserRole.ADMIN ||
    myRole === CongregationRole.SERVICE_OVERSEER;

  const [tab, setTab] = useState<Tab>('members');

  // Members
  const [filtered, setFiltered] = useState<Member[]>([]);
  const [search, setSearch] = useState('');

  // Add member dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Remove confirm
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  // Edit role
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [editRoleTarget, setEditRoleTarget] = useState<Member | null>(null);
  const editRoleForm = useForm<EditMemberRoleFormData>({
    resolver: zodResolver(editMemberRoleSchema),
    defaultValues: { congregationRole: null },
  });

  // Approve/reject
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<JoinRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'active' | 'rejected'>('active');
  const reviewForm = useForm<ReviewJoinRequestFormData>({
    resolver: zodResolver(reviewJoinRequestSchema),
    defaultValues: { reviewNote: '' },
  });

  useEffect(() => {
    if (!search) {
      setFiltered(members);
    } else {
      const s = search.toLowerCase();
      setFiltered(
        members.filter(
          (m) =>
            m.user?.name?.toLowerCase().includes(s) ||
            m.user?.email?.toLowerCase().includes(s) ||
            m.congregationRole?.toLowerCase().includes(s)
        )
      );
    }
  }, [search, members]);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    try {
      await apiClient.post(`/api/congregations/${congregationId}/members`, { userId: addUserId });
      setAddOpen(false);
      setAddUserId('');
      await mutateMembers();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setAddLoading(false);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoveLoading(true);
    try {
      await apiClient.delete(`/api/congregations/${congregationId}/members/${removeTarget.userId}`);
      setRemoveOpen(false);
      await mutateMembers();
    } catch {
      // ignore
    } finally {
      setRemoveLoading(false);
    }
  }

  function openEditRole(member: Member) {
    setEditRoleTarget(member);
    editRoleForm.reset({ congregationRole: (member.congregationRole as EditMemberRoleFormData['congregationRole']) ?? null });
    setEditRoleOpen(true);
  }

  async function handleEditRole(data: EditMemberRoleFormData) {
    if (!editRoleTarget) return;
    try {
      await updateMemberRole({ userId: editRoleTarget.userId, congregationRole: data.congregationRole });
      setEditRoleOpen(false);
      editRoleForm.reset();
      await mutateMembers();
    } catch {
      // ignore
    }
  }

  function openReview(member: JoinRequest, action: 'active' | 'rejected') {
    setReviewTarget(member);
    setReviewAction(action);
    reviewForm.reset({ reviewNote: '' });
    setReviewOpen(true);
  }

  async function handleReview(data: ReviewJoinRequestFormData) {
    if (!reviewTarget) return;
    try {
      await reviewJoinRequest({ requestId: reviewTarget.id, status: reviewAction, reviewNote: data.reviewNote });
      setReviewOpen(false);
      reviewForm.reset();
      await Promise.all([mutateMembers(), mutateRequests()]);
    } catch {
      // ignore
    }
  }

  const roleLabel = (role?: string | null) => {
    if (role === CongregationRole.SERVICE_OVERSEER) return 'Service Overseer';
    if (role === CongregationRole.TERRITORY_SERVANT) return 'Territory Servant';
    return 'Publisher';
  };

  const roleColor = (role?: string | null) => {
    if (role === CongregationRole.SERVICE_OVERSEER)
      return 'text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
    if (role === CongregationRole.TERRITORY_SERVANT)
      return 'text-purple-700 border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400';
    return '';
  };

  return (
    <ProtectedPage congregationId={congregationId}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 min-w-0 w-full">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Members</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage congregation members and roles
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={14} />
            Add Member
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border gap-1">
          <button
            type="button"
            onClick={() => setTab('members')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'members'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="flex items-center gap-2">
              <Users size={14} />
              Members
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {members.length}
              </Badge>
            </span>
          </button>

          {isPrivileged && (
            <button
              type="button"
              onClick={() => setTab('requests')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === 'requests'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="flex items-center gap-2">
                <Clock size={14} />
                Join Requests
                {pendingCount > 0 && (
                  <Badge className="text-xs px-1.5 py-0 bg-amber-500 text-white border-0">
                    {pendingCount}
                  </Badge>
                )}
              </span>
            </button>
          )}
        </div>

        {/* Members Tab */}
        {tab === 'members' && (
          <>
            <div className="relative max-w-sm">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Search members…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-x-auto w-full max-w-full">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <Users size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {search ? 'No members match your search' : 'No members yet'}
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Member
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Role
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Joined
                      </th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((m) => (
                      <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                              {m.user?.name?.[0]?.toUpperCase() ?? '?'}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{m.user?.name}</p>
                              <p className="text-xs text-muted-foreground">{m.user?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={`${roleColor(m.congregationRole)} whitespace-nowrap`}>
                            {roleLabel(m.congregationRole)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-xs">
                          {new Date(m.joinedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-1">
                            {canEditRole && (
                              <Button size="sm" variant="ghost" onClick={() => openEditRole(m)}>
                                <Pencil size={14} />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setRemoveTarget(m);
                                setRemoveOpen(true);
                              }}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* Join Requests Tab */}
        {tab === 'requests' && isPrivileged && (
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-x-auto w-full max-w-full">
            {requestsLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-16">
                <Clock size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No pending join requests</p>
              </div>
            ) : (
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Requester
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Message
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Requested
                    </th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center text-sm font-semibold text-amber-600 shrink-0">
                            {r.user?.name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{r.user?.name}</p>
                            <p className="text-xs text-muted-foreground">{r.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-sm max-w-xs">
                        {r.joinMessage ? (
                          <span className="flex items-start gap-1.5">
                            <MessageSquare size={13} className="mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{r.joinMessage}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50 italic text-xs">
                            No message
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(r.joinedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          {canApprove ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20 gap-1"
                                onClick={() => openReview(r, 'active')}
                              >
                                <Check size={13} />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/30 hover:bg-destructive/5 gap-1"
                                onClick={() => openReview(r, 'rejected')}
                              >
                                <X size={13} />
                                Reject
                              </Button>
                            </>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/20"
                            >
                              Pending
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Add Member Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>Enter the user ID to add directly.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                placeholder="uuid…"
                required
              />
              {addError && <p className="text-xs text-destructive">{addError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addLoading}>
                {addLoading ? 'Adding…' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editRoleOpen} onOpenChange={setEditRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Member Role</DialogTitle>
            <DialogDescription>
              Update the congregation role for{' '}
              <span className="font-semibold">{editRoleTarget?.user?.name}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {[
              { value: CongregationRole.SERVICE_OVERSEER as EditMemberRoleFormData['congregationRole'], label: 'Service Overseer' },
              { value: CongregationRole.TERRITORY_SERVANT as EditMemberRoleFormData['congregationRole'], label: 'Territory Servant' },
              { value: null as EditMemberRoleFormData['congregationRole'], label: 'Publisher (no special role)' },
            ].map((option) => (
              <label
                key={String(option.value)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                  editRoleForm.watch('congregationRole') === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={String(option.value)}
                  checked={editRoleForm.watch('congregationRole') === option.value}
                  onChange={() => editRoleForm.setValue('congregationRole', option.value)}
                  className="accent-primary"
                />
                <span className="text-sm font-medium text-foreground">{option.label}</span>
              </label>
            ))}
          </div>

          {editRoleForm.formState.errors.congregationRole && (
            <p className="text-xs text-destructive">{editRoleForm.formState.errors.congregationRole.message}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditRoleOpen(false)}
              disabled={editRoleForm.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={editRoleForm.handleSubmit(handleEditRole)} disabled={editRoleForm.formState.isSubmitting}>
              {editRoleForm.formState.isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirm Dialog */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Remove <span className="font-semibold">{removeTarget?.user?.name}</span> from this
              congregation?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={removeLoading}>
              {removeLoading ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Join Request Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'active' ? 'Approve Join Request' : 'Reject Join Request'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'active' ? (
                <>
                  <span className="font-semibold">{reviewTarget?.user?.name}</span> will be added as
                  a member of this congregation.
                </>
              ) : (
                <>
                  <span className="font-semibold">{reviewTarget?.user?.name}</span>&apos;s request will
                  be declined. They will be notified.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {reviewTarget?.joinMessage && (
            <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground flex items-start gap-2">
              <MessageSquare size={14} className="mt-0.5 shrink-0" />
              <p>{reviewTarget.joinMessage}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="reviewNote">
              Note to requester <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <textarea
              id="reviewNote"
              {...reviewForm.register('reviewNote')}
              rows={3}
              aria-invalid={!!reviewForm.formState.errors.reviewNote}
              placeholder={
                reviewAction === 'active'
                  ? 'e.g. Welcome to the congregation!'
                  : 'e.g. Please speak to the service overseer directly.'
              }
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 resize-none${reviewForm.formState.errors.reviewNote ? ' border-destructive focus:ring-destructive' : ' border-input focus:ring-ring'}`}
            />
            {reviewForm.formState.errors.reviewNote && (
              <p className="text-xs text-destructive mt-1">{reviewForm.formState.errors.reviewNote.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={reviewForm.formState.isSubmitting}>
              Cancel
            </Button>
            {reviewAction === 'active' ? (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={reviewForm.handleSubmit(handleReview)}
                disabled={reviewForm.formState.isSubmitting}
              >
                {reviewForm.formState.isSubmitting ? 'Approving…' : 'Approve'}
              </Button>
            ) : (
              <Button variant="destructive" onClick={reviewForm.handleSubmit(handleReview)} disabled={reviewForm.formState.isSubmitting}>
                {reviewForm.formState.isSubmitting ? 'Rejecting…' : 'Reject'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedPage>
  );
}
