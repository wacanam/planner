'use client';

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Inbox,
  LogOut,
  MessageSquare,
  Search,
  Trash2,
  UserCheck,
  UserX,
  X,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminNav } from '@/components/admin-nav';
import { ProtectedPage } from '@/components/protected-page';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAdminAccountRequests } from '@/hooks';
import { UserRole } from '@/lib/roles';
import type { AccountRequest, AccountRequestStatus, AccountRequestType } from '@/types/api';

export default function AdminRequestsClient() {
  const {
    requests = [],
    pendingRequests = [],
    pendingCount,
    isLoading: loading,
    isProcessing,
    approveRequest,
    rejectRequest,
  } = useAdminAccountRequests();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccountRequestStatus | 'all'>('pending');
  const [typeFilter, setTypeFilter] = useState<AccountRequestType | 'all'>('all');

  // Approval / Rejection Modal State
  const [selectedReq, setSelectedReq] = useState<AccountRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;
  const cancelledCount = requests.filter((r) => r.status === 'cancelled').length;

  const filtered = useMemo(() => {
    let list = requests;

    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      list = list.filter((r) => r.type === typeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.userName?.toLowerCase().includes(q) ||
          r.userEmail?.toLowerCase().includes(q) ||
          r.congregationName?.toLowerCase().includes(q) ||
          r.reason?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [requests, statusFilter, typeFilter, search]);

  const handleAction = async () => {
    if (!selectedReq || !actionType) return;
    try {
      if (actionType === 'approve') {
        await approveRequest(selectedReq.id, reviewNote);
        toast.success(
          selectedReq.type === 'leave_congregation'
            ? `Approved leave request for ${selectedReq.userName || selectedReq.userEmail}.`
            : `Approved account deletion for ${selectedReq.userName || selectedReq.userEmail}.`
        );
      } else {
        await rejectRequest(selectedReq.id, reviewNote);
        toast.success(`Rejected request for ${selectedReq.userName || selectedReq.userEmail}.`);
      }
      setSelectedReq(null);
      setActionType(null);
      setReviewNote('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to process request.');
    }
  };

  const getStatusBadge = (status: AccountRequestStatus) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold text-[10px] gap-1">
            <Clock size={10} /> Pending Review
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold text-[10px] gap-1">
            <CheckCircle2 size={10} /> Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 font-bold text-[10px] gap-1">
            <XCircle size={10} /> Rejected
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border font-bold text-[10px]">
            Cancelled by User
          </Badge>
        );
    }
  };

  return (
    <ProtectedPage requiredRole={UserRole.ADMIN}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
              <Link href="/admin/dashboard">
                <ArrowLeft size={16} />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
                Requests & Approvals Queue
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review, approve, and resolve publisher leave requests and account deletions
              </p>
            </div>
          </div>
        </div>

        {/* Admin Navigation */}
        <AdminNav />

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search by user, email, congregation, or reason…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-10 rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'pending'
                    ? 'bg-card text-amber-600 dark:text-amber-400 shadow-xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'approved'
                    ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Approved ({approvedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('rejected')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'rejected'
                    ? 'bg-card text-destructive shadow-xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Rejected ({rejectedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-card text-foreground shadow-xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All ({requests.length})
              </button>
            </div>

            {/* Type Filter Pills */}
            <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border shrink-0">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  typeFilter === 'all'
                    ? 'bg-card text-foreground shadow-xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Types
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('leave_congregation')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  typeFilter === 'leave_congregation'
                    ? 'bg-card text-foreground shadow-xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Leave
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('delete_account')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  typeFilter === 'delete_account'
                    ? 'bg-card text-foreground shadow-xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-border p-6">
            <Inbox size={40} className="text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No requests found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {statusFilter === 'pending'
                ? 'All account and congregation requests are resolved.'
                : 'Try adjusting your search keywords or filter selection.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((req) => {
              const isLeave = req.type === 'leave_congregation';
              const isPending = req.status === 'pending';
              const initials = (req.userName || req.userEmail || 'U')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <Card
                  key={req.id}
                  className="bg-card border-border shadow-xs hover:border-primary/30 transition-all"
                >
                  <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <Avatar className="w-10 h-10 rounded-xl border border-primary/20 bg-primary/10 overflow-hidden shrink-0 mt-0.5">
                        {req.userAvatarUrl && (
                          <AvatarImage
                            src={req.userAvatarUrl}
                            alt={req.userName || 'User avatar'}
                            className="object-cover w-full h-full rounded-xl"
                          />
                        )}
                        <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground truncate">
                            {req.userName || req.userEmail || 'Publisher'}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 ${
                              isLeave
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                : 'bg-destructive/15 text-destructive border-destructive/30'
                            }`}
                          >
                            {isLeave ? (
                              <span className="flex items-center gap-1">
                                <LogOut size={10} /> Leave Congregation
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Trash2 size={10} /> Delete Account
                              </span>
                            )}
                          </Badge>
                          {getStatusBadge(req.status)}
                        </div>

                        <div className="flex items-center gap-3 text-muted-foreground flex-wrap text-[11px]">
                          <span>{req.userEmail}</span>
                          {req.congregationName && (
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <Building2 size={11} className="text-primary shrink-0" />
                              <span>{req.congregationName}</span>
                            </span>
                          )}
                          <span>
                            Submitted: {new Date(req.requestedAt).toLocaleDateString()} at{' '}
                            {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {req.reason && (
                          <div className="p-2.5 rounded-xl bg-muted/60 text-xs text-foreground/90 border border-border/50">
                            <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">
                              User Reason:
                            </span>
                            &ldquo;{req.reason}&rdquo;
                          </div>
                        )}

                        {/* Review History Details */}
                        {req.reviewedAt && (
                          <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 text-[11px] space-y-0.5 text-muted-foreground">
                            <p>
                              Reviewed by <strong className="text-foreground">{req.reviewedByName || 'System Admin'}</strong> on{' '}
                              {new Date(req.reviewedAt).toLocaleDateString()} at{' '}
                              {new Date(req.reviewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {req.reviewNote && (
                              <p className="italic text-foreground">
                                Review Note: &ldquo;{req.reviewNote}&rdquo;
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {isPending && (
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-border w-full md:w-auto justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 border-destructive/30"
                          onClick={() => {
                            setSelectedReq(req);
                            setActionType('reject');
                            setReviewNote('');
                          }}
                          disabled={isProcessing}
                        >
                          <X size={13} className="mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={() => {
                            setSelectedReq(req);
                            setActionType('approve');
                            setReviewNote('');
                          }}
                          disabled={isProcessing}
                        >
                          <Check size={13} className="mr-1" />
                          Approve
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Approve / Reject Dialog */}
        <ResponsiveDialog
          open={Boolean(selectedReq && actionType)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedReq(null);
              setActionType(null);
              setReviewNote('');
            }
          }}
          title={
            actionType === 'approve'
              ? selectedReq?.type === 'leave_congregation'
                ? 'Approve Congregation Departure'
                : 'Approve Account Deletion'
              : 'Reject Request'
          }
          description={
            actionType === 'approve'
              ? `Confirm approval for ${selectedReq?.userName || selectedReq?.userEmail}.`
              : `Provide an optional rejection reason for ${selectedReq?.userName || selectedReq?.userEmail}.`
          }
        >
          <div className="space-y-4">
            {actionType === 'approve' ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <p className="font-bold">System Admin Action Summary:</p>
                {selectedReq?.type === 'leave_congregation' ? (
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Remove publisher from {selectedReq?.congregationName || 'the congregation'}.</li>
                    <li>Unassign from service group and overseer roles.</li>
                    <li>Automatically return active territory assignments.</li>
                  </ul>
                ) : (
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Permanently deactivate account and mark deleted.</li>
                    <li>Remove membership and release all territory assignments.</li>
                  </ul>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-muted text-xs text-muted-foreground">
                The user will be notified that their request was rejected and their congregation membership will remain active.
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="adminReviewNote" className="text-xs font-semibold">
                Admin Review Note (Optional)
              </Label>
              <Textarea
                id="adminReviewNote"
                placeholder="Add an internal note or message for the user…"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                className="text-xs rounded-xl min-h-[70px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => {
                  setSelectedReq(null);
                  setActionType(null);
                  setReviewNote('');
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={actionType === 'approve' ? 'default' : 'destructive'}
                size="sm"
                className="rounded-xl text-xs font-semibold"
                onClick={handleAction}
                disabled={isProcessing}
              >
                {isProcessing
                  ? 'Processing…'
                  : actionType === 'approve'
                    ? 'Confirm & Approve'
                    : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>
      </div>
    </ProtectedPage>
  );
}
