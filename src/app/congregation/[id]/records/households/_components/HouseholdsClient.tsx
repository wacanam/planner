'use client';

import { ChevronRight, Home, MapPin, Pencil, Plus, Search, Share2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  HouseholdEncounterSheet,
  HouseholdLogVisitSheet,
} from '@/components/households/household-action-sheets';
import { HouseholdForm, type HouseholdFormValues } from '@/components/households/household-form';
import { ShareHouseholdDialog } from '@/components/households/ShareHouseholdDialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useCongregationTerritories,
  useCurrentUser,
  useHouseholds,
  useMyVisits,
  useOverseenGroupMates,
} from '@/hooks';
import {
  canDeleteHousehold,
  canEditHousehold,
  canLogVisitOrEncounter,
  canShareHousehold,
} from '@/lib/permissions';
import {
  deleteHouseholdRecord,
  saveHouseholdRecord,
  updateHouseholdRecord,
} from '@/lib/record-writes';
import { timeAgo } from '@/lib/time-ago';
import type { Household } from '@/types/api';

const statusLabels: Record<string, string> = {
  new: 'New Record',
  active: 'Active',
  not_home: 'Not Home',
  busy: 'Busy / Call Back',
  return_visit: 'Return Visit',
  foreign_language: 'Foreign Language',
  vacant: 'Vacant / Unoccupied',
  inaccessible: 'Inaccessible / Gated',
  do_not_visit: 'Do Not Visit',
  moved: 'Moved Away',
  inactive: 'Inactive / Archived',
};

const statusColors: Record<string, string> = {
  new: 'text-muted-foreground border-border bg-muted/30',
  active: 'text-green-700 border-green-200 bg-green-50 dark:bg-green-950/40 dark:text-green-400',
  not_home: 'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400',
  busy: 'text-orange-700 border-orange-200 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400',
  return_visit:
    'text-purple-700 border-purple-200 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400',
  foreign_language:
    'text-cyan-700 border-cyan-200 bg-cyan-50 dark:bg-cyan-950/40 dark:text-cyan-400',
  vacant: 'text-slate-700 border-slate-200 bg-slate-50 dark:bg-slate-950/40 dark:text-slate-400',
  inaccessible:
    'text-stone-700 border-stone-200 bg-stone-50 dark:bg-stone-950/40 dark:text-stone-400',
  do_not_visit: 'text-red-700 border-red-200 bg-red-50 dark:bg-red-950/40 dark:text-red-400',
  moved: 'text-muted-foreground border-border bg-muted/30',
  inactive: 'text-muted-foreground border-border bg-muted/30',
};

export default function HouseholdsClient() {
  const router = useRouter();
  const params = useParams();
  const _searchParams = useSearchParams();
  const congregationId = (params?.id as string) || '';
  const { user } = useCurrentUser();
  const groupMateUserIds = useOverseenGroupMates(congregationId, user?.id);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [_selectedHousehold, _setSelectedHousehold] = useState<Household | null>(null);
  const [logVisitHousehold, setLogVisitHousehold] = useState<Household | null>(null);
  const [encounterHousehold, setEncounterHousehold] = useState<Household | null>(null);
  const [editHousehold, setEditHousehold] = useState<Household | null>(null);
  const [shareHousehold, setShareHousehold] = useState<Household | null>(null);
  const [addHouseholdOpen, setAddHouseholdOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { households = [], isLoading } = useHouseholds({
    congregationId,
    userId: user?.id,
    userRole: user?.role,
    personalOnly: true,
    groupMateUserIds,
  });
  const { data: territories = [] } = useCongregationTerritories(congregationId);
  const { visits: allVisits = [] } = useMyVisits({
    userId: user?.id,
    userRole: user?.role,
    groupMateUserIds,
  });

  // Count visits per household
  const visitCountByHousehold = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of allVisits) {
      counts[v.householdId] = (counts[v.householdId] ?? 0) + 1;
    }
    return counts;
  }, [allVisits]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteHouseholdRecord(id);
      setDeleteConfirmId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    let list = households as Household[];
    if (statusFilter === 'needs_pinning') {
      list = list.filter((h) => !h.latitude || !h.longitude);
    } else if (statusFilter !== 'all') {
      list = list.filter((h) => h.status === statusFilter);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (h) =>
          h.address.toLowerCase().includes(s) ||
          h.streetName.toLowerCase().includes(s) ||
          h.city.toLowerCase().includes(s)
      );
    }
    return list;
  }, [households, search, statusFilter]);

  const handleCreateHousehold = async (values: HouseholdFormValues) => {
    await saveHouseholdRecord({
      congregationId,
      territoryId: values.territoryId || undefined,
      address: values.address,
      houseNumber: values.houseNumber || undefined,
      streetName: values.streetName,
      unit: values.unit || undefined,
      city: values.city,
      postalCode: values.postalCode || undefined,
      type: values.type,
      status: values.status,
      occupantsCount: values.occupantsCount,
      notes: values.notes || undefined,
      language: values.language || undefined,
      latitude: null,
      longitude: null,
      createdById: user?.id || null,
      creatorName: user?.name || null,
      updatedById: user?.id || null,
    });
    setAddHouseholdOpen(false);
  };

  const handleUpdateHousehold = async (values: HouseholdFormValues) => {
    if (!editHousehold) return;
    await updateHouseholdRecord(editHousehold.id, {
      ...values,
      territoryId: values.territoryId || null,
      updatedById: user?.id || null,
    });
    setEditHousehold(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 min-w-0 w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Household Directory</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Door records, contact notes, and offline-first follow-ups
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setAddHouseholdOpen(true)}
          className="rounded-2xl text-xs font-semibold gap-1.5 h-9"
        >
          <Plus size={14} />
          <span>Add Household</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search address or street…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 rounded-xl text-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground h-9 font-medium"
        >
          <option value="all">All statuses</option>
          <option value="needs_pinning">📍 Needs Pinning</option>
          {Object.entries(statusLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {/* Household List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border rounded-3xl p-6">
          <Home size={40} className="text-muted-foreground/30 mb-3" />
          <p className="text-sm font-semibold text-foreground">No households found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add a new door record to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((h) => {
            const isTransferred = Boolean(h.transferredFrom && h.createdById === user?.id);
            const isCollaborator = Boolean(user?.id && h.collaboratorIds?.includes(user.id));
            const isReadOnly = Boolean(user?.id && h.readOnlyUserIds?.includes(user.id));
            const isOwner = Boolean(user?.id && h.createdById === user.id);
            const isGroupMateRecord = Boolean(
              user?.id &&
                h.createdById &&
                h.createdById !== user.id &&
                !isCollaborator &&
                !isReadOnly &&
                groupMateUserIds.has(h.createdById)
            );

            const canShare = canShareHousehold(user, h);
            const canEdit = canEditHousehold(user, h);
            const canDelete = canDeleteHousehold(user, h);
            const canLog = canLogVisitOrEncounter(user, h);

            return (
              <Card
                key={h.id}
                className="bg-card border-border shadow-xs hover:border-primary/40 transition-all"
              >
                <CardContent className="p-4 sm:p-5 flex flex-col justify-between gap-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/congregation/${congregationId}/records/households/${h.id}`}
                        className="font-bold text-sm text-foreground hover:text-primary hover:underline transition-colors truncate inline-flex items-center gap-1.5 group"
                      >
                        <span>
                          {h.houseNumber ? `${h.houseNumber} ` : ''}
                          {h.address}
                        </span>
                        <ChevronRight
                          size={14}
                          className="text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5"
                        />
                      </Link>

                      {/* Collaboration / Transfer / Read-Only / Group Record / Owner Badges */}
                      {isTransferred && (
                        <Badge
                          variant="outline"
                          className="border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/40 text-[10px] py-0 font-bold"
                        >
                          🔄 Transferred from {h.transferredFrom}
                        </Badge>
                      )}
                      {isCollaborator && (
                        <Badge
                          variant="outline"
                          className="border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-[10px] py-0 font-bold"
                        >
                          🤝 Collaboration
                        </Badge>
                      )}
                      {isReadOnly && (
                        <Badge
                          variant="outline"
                          className="border-slate-300 text-slate-700 bg-slate-50 dark:bg-slate-950/40 text-[10px] py-0 font-bold"
                        >
                          👁️ Read-Only
                        </Badge>
                      )}
                      {isGroupMateRecord && (
                        <Badge
                          variant="outline"
                          className="border-indigo-300 text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 text-[10px] py-0 font-bold"
                        >
                          👥 Group Record
                        </Badge>
                      )}
                      {isOwner && !isTransferred && (
                        <Badge
                          variant="outline"
                          className="border-primary/30 text-primary bg-primary/10 text-[10px] py-0 font-bold"
                        >
                          👤 Owner
                        </Badge>
                      )}

                      {(!h.latitude || !h.longitude) && (
                        <Badge
                          variant="outline"
                          className="border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/40 text-[10px] py-0 font-bold"
                        >
                          📍 Needs Pinning
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold py-0 ${statusColors[h.status] ?? ''}`}
                      >
                        {statusLabels[h.status] ?? h.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {h.streetName}, {h.city} {h.postalCode ? `(${h.postalCode})` : ''}
                    </p>
                    {h.notes && (
                      <p className="text-xs text-muted-foreground/80 mt-1 italic line-clamp-1">
                        &ldquo;{h.notes}&rdquo;
                      </p>
                    )}
                    <div className="flex gap-2 mt-2 text-[11px] text-muted-foreground items-center flex-wrap">
                      {visitCountByHousehold[h.id] ? (
                        <span>
                          {visitCountByHousehold[h.id]} visit
                          {visitCountByHousehold[h.id] > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span>0 visits</span>
                      )}
                      {h.lastVisitDate && <span>· Last {timeAgo(h.lastVisitDate)}</span>}
                      {h.creatorName && !isOwner && <span>· Owner: {h.creatorName}</span>}
                    </div>
                  </div>

                  {/* Bottom Action Bar: Management icons on left, Primary actions on right */}
                  <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2 flex-wrap w-full">
                    {/* Management / Record actions */}
                    <div className="flex items-center gap-1">
                      {(!h.latitude || !h.longitude) && canEdit && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 text-xs px-2.5 gap-1 bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 rounded-xl font-bold border border-amber-300 dark:border-amber-900"
                          onClick={() => {
                            const targetTerritoryId = h.territoryId || territories[0]?.id;
                            if (targetTerritoryId && congregationId) {
                              router.push(
                                `/congregation/${congregationId}/territories/${targetTerritoryId}?pinHouseholdId=${h.id}`
                              );
                            } else if (congregationId) {
                              router.push(
                                `/congregation/${congregationId}/territories?pinHouseholdId=${h.id}`
                              );
                            }
                          }}
                          title="Pin coordinates on map"
                        >
                          <MapPin size={13} />
                          <span>Pin on Map</span>
                        </Button>
                      )}

                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 rounded-xl p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditHousehold(h)}
                          title="Edit household"
                        >
                          <Pencil size={14} />
                        </Button>
                      )}

                      {canShare && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 rounded-xl p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => setShareHousehold(h)}
                          title="Share or transfer record"
                        >
                          <Share2 size={14} />
                        </Button>
                      )}

                      {canDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 rounded-xl p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteConfirmId(h.id)}
                          title="Delete record"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>

                    {/* Primary actions: View and Log Visit */}
                    <div className="flex items-center gap-2 ml-auto">
                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                        className="rounded-xl text-xs h-8 font-semibold"
                      >
                        <Link href={`/congregation/${congregationId}/records/households/${h.id}`}>
                          View
                        </Link>
                      </Button>

                      {canLog && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-xs h-8 font-semibold gap-1.5"
                          onClick={() => setLogVisitHousehold(h)}
                        >
                          <Plus size={13} />
                          <span>Log Visit</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Household Dialog */}
      <ResponsiveDialog
        open={addHouseholdOpen}
        onOpenChange={setAddHouseholdOpen}
        title="Add Household Record"
        description="Save door details offline (can be pinned on map later)"
      >
        <HouseholdForm
          territories={territories}
          onSubmit={handleCreateHousehold}
          onCancel={() => setAddHouseholdOpen(false)}
        />
      </ResponsiveDialog>

      {/* Edit Household Dialog */}
      <ResponsiveDialog
        open={!!editHousehold}
        onOpenChange={(op) => !op && setEditHousehold(null)}
        title="Edit Household Record"
        description="Update door details and address"
      >
        {editHousehold && (
          <HouseholdForm
            initialValues={editHousehold}
            territories={territories}
            onSubmit={handleUpdateHousehold}
            onCancel={() => setEditHousehold(null)}
          />
        )}
      </ResponsiveDialog>

      {/* Log Visit Sheet */}
      <HouseholdLogVisitSheet
        open={!!logVisitHousehold}
        onOpenChange={(op) => !op && setLogVisitHousehold(null)}
        household={logVisitHousehold}
      />

      {/* Encounter Sheet */}
      <HouseholdEncounterSheet
        open={!!encounterHousehold}
        onOpenChange={(op) => !op && setEncounterHousehold(null)}
        household={encounterHousehold}
      />

      {/* Share Household Dialog */}
      <ShareHouseholdDialog
        open={!!shareHousehold}
        onOpenChange={(op) => !op && setShareHousehold(null)}
        household={shareHousehold}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(op) => !op && setDeleteConfirmId(null)}
        title="Delete Household Record"
        description="Are you sure you want to delete this household record? This action cannot be undone."
        confirmLabel="Delete Record"
        variant="destructive"
        onConfirm={() => {
          if (deleteConfirmId) void handleDelete(deleteConfirmId);
        }}
        loading={!!deletingId}
      />
    </div>
  );
}
