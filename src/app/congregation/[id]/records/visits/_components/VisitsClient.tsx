'use client';

import { BookOpen, Calendar, Clock, Home, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCurrentUser, useMyVisits } from '@/hooks';
import { canDeleteVisit, isTerritoryServant } from '@/lib/permissions';
import { deleteVisitRecord } from '@/lib/record-writes';
import { timeAgo } from '@/lib/time-ago';

const outcomeColors: Record<string, string> = {
  answered: 'text-green-700 border-green-200 bg-green-50 dark:bg-green-950/40 dark:text-green-400',
  not_home: 'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400',
  return_visit:
    'text-purple-700 border-purple-200 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400',
  do_not_visit: 'text-red-700 border-red-200 bg-red-50 dark:bg-red-950/40 dark:text-red-400',
  moved: 'text-muted-foreground border-border bg-muted/30',
  other: 'text-muted-foreground border-border bg-muted/30',
};

export default function VisitsClient() {
  const params = useParams();
  const congregationId = (params?.id as string) || '';
  const { user } = useCurrentUser();
  const { visits = [], households = [], isLoading } = useMyVisits({
    userId: user?.id,
    userRole: user?.role,
  });
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = visits;
    if (outcomeFilter !== 'all') {
      list = list.filter((v) => v.outcome === outcomeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.householdAddress?.toLowerCase().includes(q) ||
          v.householdCity?.toLowerCase().includes(q) ||
          v.streetName?.toLowerCase().includes(q) ||
          v.notes?.toLowerCase().includes(q) ||
          v.bibleTopicDiscussed?.toLowerCase().includes(q) ||
          v.literaturePlaced?.toLowerCase().includes(q) ||
          v.literatureLeft?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [visits, outcomeFilter, search]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteVisitRecord(id);
      setDeleteConfirmId(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by address, street, city, notes, topic…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 rounded-xl text-xs bg-card"
          />
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'answered', 'not_home', 'return_visit', 'do_not_visit', 'moved'] as const).map((status) => (
            <Button
              key={status}
              size="sm"
              variant={outcomeFilter === status ? 'default' : 'outline'}
              className="rounded-xl text-xs capitalize h-9 shrink-0"
              onClick={() => setOutcomeFilter(status)}
            >
              {status.replace(/_/g, ' ')}
            </Button>
          ))}
        </div>
      </div>

      {/* Visits List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border rounded-3xl p-6">
          <Clock size={40} className="text-muted-foreground/30 mb-3" />
          <p className="text-sm font-semibold text-foreground">No visits logged</p>
          <p className="text-xs text-muted-foreground mt-1">
            Visits logged from households will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => (
            <Card
              key={v.id}
              className="bg-card border-border shadow-xs hover:border-primary/40 transition-all"
            >
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1.5">
                  {/* Household Details */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/congregation/${congregationId}/records/households?search=${encodeURIComponent(v.householdAddress || '')}`}
                      className="font-bold text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <Home size={14} className="text-primary shrink-0" />
                      <span>
                        {v.houseNumber ? `${v.houseNumber} ` : ''}
                        {v.householdAddress || 'Household Record'}
                        {v.unitNumber ? ` (Unit ${v.unitNumber})` : ''}
                      </span>
                    </Link>
                    {v.householdCity && (
                      <span className="text-xs text-muted-foreground">· {v.householdCity}</span>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold capitalize py-0 ${outcomeColors[v.outcome] ?? ''}`}
                    >
                      {v.outcome.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  {/* Visit Date & Relative time */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar size={12} className="shrink-0" />
                    <span>
                      {new Date(v.visitDate).toLocaleString()} · {timeAgo(v.visitDate)}
                    </span>
                  </div>

                  {/* Topic & Literature */}
                  {(v.bibleTopicDiscussed || v.literaturePlaced || v.literatureLeft) && (
                    <div className="flex items-center gap-3 flex-wrap text-xs text-foreground">
                      {v.bibleTopicDiscussed && (
                        <div className="flex items-center gap-1 font-medium text-foreground">
                          <BookOpen size={12} className="text-primary shrink-0" />
                          <span>Scripture/Topic: {v.bibleTopicDiscussed}</span>
                        </div>
                      )}
                      {(v.literaturePlaced || v.literatureLeft) && (
                        <span className="text-primary font-medium">
                          Literature: {v.literaturePlaced || v.literatureLeft}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Return Visit Planned */}
                  {v.returnVisitPlanned && v.nextVisitDate && (
                    <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                      📅 Return Visit Scheduled: {new Date(v.nextVisitDate).toLocaleDateString()}
                      {v.nextVisitTime ? ` at ${v.nextVisitTime}` : ''}
                    </p>
                  )}

                  {/* Visit Notes */}
                  {v.notes && (
                    <p className="text-xs text-muted-foreground/90 italic line-clamp-2">
                      &ldquo;{v.notes}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {canDeleteVisit(user, v, households.find((h) => h.id === v.householdId)) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 rounded-xl p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteConfirmId(v.id)}
                      disabled={deletingId === v.id}
                      title="Delete visit record"
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(op) => !op && setDeleteConfirmId(null)}
        title="Delete Visit Record"
        description="Are you sure you want to delete this visit record? This action cannot be undone."
        confirmLabel="Delete Visit"
        variant="destructive"
        onConfirm={() => {
          if (deleteConfirmId) void handleDelete(deleteConfirmId);
        }}
        loading={!!deletingId}
      />
    </div>
  );
}
