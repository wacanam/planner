'use client';

import {
  AlertTriangle,
  Building2,
  Check,
  Clock,
  Globe,
  LogOut,
  Shield,
  Trash2,
  TrendingUp,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { ProtectedPage } from '@/components/protected-page';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { StatCard } from '@/components/stat-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAdminAccountRequests, useCongregations } from '@/hooks';
import { UserRole } from '@/lib/roles';
import type { AccountRequest } from '@/types/api';

export default function AdminDashboardPage() {
  const { congregations = [], isLoading: loading } = useCongregations();
  const {
    requests = [],
    pendingRequests = [],
    pendingCount,
    isLoading: requestsLoading,
    isProcessing,
    approveRequest,
    rejectRequest,
  } = useAdminAccountRequests();

  const totalActive = congregations.filter((c) => c.status === 'active').length;

  const [selectedReq, setSelectedReq] = useState<AccountRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const handleAction = async () => {
    if (!selectedReq || !actionType) return;
    try {
      if (actionType === 'approve') {
        await approveRequest(selectedReq.id, reviewNote);
        toast.success(
          selectedReq.type === 'leave_congregation'
            ? `Approved congregation leave for ${selectedReq.userName || selectedReq.userEmail}.`
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

  return (
    <ProtectedPage requiredRole={UserRole.ADMIN}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Global Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              System-wide overview of congregations and account lifecycle requests
            </p>
          </div>
          <Button asChild size="sm" className="rounded-xl text-xs gap-1.5 h-9">
            <Link href="/admin/congregations">
              <Globe size={14} />
              <span>Manage Congregations</span>
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Total Congregations"
            value={loading ? '—' : congregations.length}
            icon={Building2}
            color="blue"
            loading={loading}
          />
          <StatCard
            title="Active"
            value={loading ? '—' : totalActive}
            icon={TrendingUp}
            color="green"
            loading={loading}
          />
          <StatCard
            title="Pending Requests"
            value={requestsLoading ? '—' : pendingCount}
            icon={pendingCount > 0 ? AlertTriangle : Clock}
            color={pendingCount > 0 ? 'orange' : 'purple'}
            loading={requestsLoading}
          />
          <StatCard title="Platform Status" value="Operational" icon={Shield} color="purple" />
        </div>

        {/* Pending Account & Congregation Requests Section */}
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <UserCheck size={16} className="text-primary" />
                <span>Account & Congregation Requests</span>
                {pendingCount > 0 && (
                  <Badge className="bg-amber-500 text-white font-bold text-[10px] px-2 py-0.5 ml-1">
                    {pendingCount} Pending
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Review user requests to leave congregations or delete accounts
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {requestsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border rounded-2xl p-6">
                <UserCheck size={32} className="text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground">No pending account or congregation requests</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  When publishers request to leave a congregation or delete their account, they will appear here for your review.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => {
                  const isLeave = req.type === 'leave_congregation';
                  const initials = (req.userName || req.userEmail || 'U')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl border border-border bg-background flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 min-w-0">
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

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-foreground">
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
                          </div>

                          <p className="text-xs text-muted-foreground">{req.userEmail}</p>

                          {req.congregationName && (
                            <p className="text-xs font-medium text-foreground flex items-center gap-1">
                              <Building2 size={12} className="text-primary shrink-0" />
                              <span>{req.congregationName}</span>
                            </p>
                          )}

                          {req.reason && (
                            <div className="mt-1.5 p-2 rounded-xl bg-muted/60 text-xs text-muted-foreground italic">
                              &ldquo;{req.reason}&rdquo;
                            </div>
                          )}

                          <p className="text-[10px] text-muted-foreground">
                            Submitted on {new Date(req.requestedAt).toLocaleDateString()} at{' '}
                            {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
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
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Congregations List */}
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Building2 size={16} className="text-primary" />
              <span>Congregations</span>
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/admin/congregations">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : congregations.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-xs text-muted-foreground">No congregations registered yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {congregations.slice(0, 5).map((cong) => (
                  <div
                    key={cong.id}
                    className="p-3 rounded-2xl border border-border bg-background flex items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <p className="font-bold text-foreground">{cong.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {cong.city ? `${cong.city}, ` : ''}
                        {cong.country || 'Global'}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize text-[10px] font-semibold">
                      {cong.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
            <Label htmlFor="adminNote" className="text-xs font-semibold">
              Admin Review Note (Optional)
            </Label>
            <Textarea
              id="adminNote"
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
    </ProtectedPage>
  );
}

